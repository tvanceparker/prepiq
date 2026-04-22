from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.openai_client import OpenAIClient
from app.integrations.vector_store import DatabaseVectorStore
from app.repositories.assistant_document_chunks_repo import AssistantDocumentChunksRepository


class AssistantRetriever:
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.chunk_repo = AssistantDocumentChunksRepository(db, restaurant_id)
        self.vector_store = DatabaseVectorStore(self.chunk_repo)

    async def retrieve(self, query: str, openai_client: OpenAIClient, top_k: int = 24) -> List[Dict[str, Any]]:
        vector_hits: List[Dict[str, Any]] = []
        try:
            query_embedding = (await openai_client.embed_texts([query]))[0]
            vector_hits = await self.vector_store.similarity_search(
                query_embedding=query_embedding,
                source_types=["docs", "notes", "upload"],
                top_k=top_k,
            )
        except Exception:
            vector_hits = []
        lexical_hits = await self._lexical_rescue(query, top_k=max(6, top_k // 3))

        merged: List[Dict[str, Any]] = []
        seen = set()
        for candidate in [*vector_hits, *lexical_hits]:
            key = (candidate.get("document_id"), candidate.get("chunk_index"))
            if key in seen:
                continue
            seen.add(key)
            merged.append(candidate)
        return merged[:top_k]

    async def expand_neighbors(self, base_chunks: List[Dict[str, Any]], limit_base: int = 3) -> List[Dict[str, Any]]:
        seen = set()
        expanded: List[Dict[str, Any]] = []

        for index, candidate in enumerate(base_chunks):
            if index >= limit_base:
                break
            document_id = candidate.get("document_id")
            chunk_index = candidate.get("chunk_index")
            if document_id is None or chunk_index is None:
                continue

            document_chunks = await self.chunk_repo.list_by_document_id(int(document_id))
            by_index = {chunk.chunk_index: chunk for chunk in document_chunks}
            for offset in (-1, 0, 1):
                neighbor = by_index.get(chunk_index + offset)
                if not neighbor or not neighbor.document:
                    continue
                key = (neighbor.document_id, neighbor.chunk_index)
                if key in seen:
                    continue
                seen.add(key)
                expanded.append(
                    {
                        "chunk_id": neighbor.chunk_id,
                        "document_id": neighbor.document_id,
                        "source_type": neighbor.document.source_type,
                        "path": neighbor.document.source_path or neighbor.document.storage_path or neighbor.document.display_name,
                        "heading_trail": neighbor.heading_trail or [],
                        "chunk_index": neighbor.chunk_index,
                        "text": neighbor.text,
                        "modified_ts": neighbor.document.updated_at.timestamp() if neighbor.document.updated_at else 0.0,
                        "retrieval_score": candidate.get("retrieval_score", 0.0),
                    }
                )

        return expanded

    async def _lexical_rescue(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        query_terms = self._tokenize(query)
        if not query_terms:
            return []

        query_counts = Counter(query_terms)
        exact_query = query.strip().lower()
        rows = await self.chunk_repo.list_all()
        scored: List[Dict[str, Any]] = []

        for row in rows:
            if not row.document:
                continue
            text = row.text.lower()
            heading = " ".join(row.heading_trail or []).lower()
            text_counts = Counter(self._tokenize(text))

            matched = sum(min(count, text_counts.get(term, 0)) for term, count in query_counts.items())
            heading_hits = sum(heading.count(term) for term in query_terms)
            if matched == 0 and heading_hits == 0 and exact_query not in text:
                continue

            raw_score = matched + (1.5 * heading_hits)
            if exact_query and exact_query in text:
                raw_score += 3.0
            normalized = raw_score / max(1.0, math.sqrt(len(row.text.split())))

            scored.append(
                {
                    "chunk_id": row.chunk_id,
                    "document_id": row.document_id,
                    "source_type": row.document.source_type,
                    "path": row.document.source_path or row.document.storage_path or row.document.display_name,
                    "heading_trail": row.heading_trail or [],
                    "chunk_index": row.chunk_index,
                    "text": row.text,
                    "modified_ts": row.document.updated_at.timestamp() if row.document.updated_at else 0.0,
                    "retrieval_score": round(normalized, 6),
                }
            )

        scored.sort(key=lambda item: item.get("retrieval_score", 0.0), reverse=True)
        return scored[:top_k]

    @staticmethod
    def _tokenize(value: str) -> List[str]:
        return re.findall(r"[a-z0-9_\-]+", value.lower())