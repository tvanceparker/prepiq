from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List

from app.repositories.assistant_document_chunks_repo import AssistantDocumentChunksRepository


class DatabaseVectorStore:
    def __init__(self, chunk_repo: AssistantDocumentChunksRepository):
        self.chunk_repo = chunk_repo

    async def similarity_search(
        self,
        *,
        query_embedding: List[float],
        source_types: Iterable[str] | None = None,
        top_k: int = 24,
    ) -> List[Dict[str, Any]]:
        allowed_source_types = set(source_types or [])
        chunk_rows = await self.chunk_repo.list_all()
        candidates: List[Dict[str, Any]] = []

        for chunk in chunk_rows:
            document = getattr(chunk, "document", None)
            if not document:
                continue
            if allowed_source_types and document.source_type not in allowed_source_types:
                continue
            if not chunk.embedding:
                continue

            similarity = self._cosine_similarity(query_embedding, list(chunk.embedding))
            candidates.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "document_id": chunk.document_id,
                    "source_type": document.source_type,
                    "path": document.source_path or document.storage_path or document.display_name,
                    "heading_trail": chunk.heading_trail or [],
                    "chunk_index": chunk.chunk_index,
                    "text": chunk.text,
                    "modified_ts": document.updated_at.timestamp() if document.updated_at else 0.0,
                    "retrieval_score": round(similarity, 6),
                }
            )

        candidates.sort(key=lambda item: item.get("retrieval_score", 0.0), reverse=True)
        return candidates[:top_k]

    @staticmethod
    def _cosine_similarity(left: List[float], right: List[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0.0 or right_norm == 0.0:
            return 0.0
        return numerator / (left_norm * right_norm)