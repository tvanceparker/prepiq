from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.integrations.openai_client import OpenAIClient
from app.repositories.assistant_document_chunks_repo import AssistantDocumentChunksRepository
from app.repositories.assistant_documents_repo import AssistantDocumentsRepository


SUPPORTED_UPLOAD_EXTENSIONS = {".md", ".txt", ".pdf"}
SUPPORTED_TEXT_EXTENSIONS = {".md", ".txt"}
TOKEN_WORD_RATIO = 0.75
TARGET_TOKENS = 350
OVERLAP_TOKENS = 75
TARGET_WORDS = int(TARGET_TOKENS * TOKEN_WORD_RATIO)
OVERLAP_WORDS = int(OVERLAP_TOKENS * TOKEN_WORD_RATIO)
READY_INDEX_STATUSES = {"indexed", "indexed_lexical"}


class AssistantIndexingService:
    def __init__(self, db: AsyncSession, restaurant_id: int, repo_root: str):
        self.db = db
        self.restaurant_id = restaurant_id
        self.repo_root = Path(repo_root)
        self.documents_repo = AssistantDocumentsRepository(db, restaurant_id)
        self.chunks_repo = AssistantDocumentChunksRepository(db, restaurant_id)
        uploads_root = os.getenv("ASSISTANT_UPLOADS_DIR")
        self.uploads_root = Path(uploads_root) if uploads_root else self.repo_root / "uploads" / "assistant"

    async def ensure_builtin_sources_indexed(
        self,
        openai_client: OpenAIClient,
        *,
        max_documents: int | None = 2,
    ) -> tuple[int, list[str]]:
        indexed_count = 0
        warnings: list[str] = []
        for source_type, root in (("docs", self.repo_root / "docs"), ("notes", self.repo_root / "notes")):
            if not root.exists():
                continue
            for path in sorted(root.rglob("*")):
                if not path.is_file() or path.suffix.lower() not in SUPPORTED_TEXT_EXTENSIONS:
                    continue
                changed, warning = await self._index_file_path(
                    path=path,
                    source_type=source_type,
                    openai_client=openai_client,
                )
                if warning:
                    warnings.append(warning)
                    return indexed_count, warnings
                if not changed:
                    continue
                indexed_count += 1
                if max_documents is not None and indexed_count >= max_documents:
                    return indexed_count, warnings
        return indexed_count, warnings

    async def index_uploaded_file(
        self,
        *,
        upload_file: UploadFile,
        openai_client: OpenAIClient,
    ):
        suffix = Path(upload_file.filename or "uploaded_document").suffix.lower()
        if suffix not in SUPPORTED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Assistant uploads currently support .md, .txt, and .pdf files.",
            )

        file_bytes = await upload_file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded assistant document is empty.")

        storage_dir = self.uploads_root / str(self.restaurant_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", upload_file.filename or "assistant_upload")
        content_hash = hashlib.sha256(file_bytes).hexdigest()
        storage_name = f"{content_hash[:12]}_{safe_name}"
        storage_path = storage_dir / storage_name
        storage_path.write_bytes(file_bytes)
        storage_reference = (
            str(storage_path.relative_to(self.repo_root))
            if storage_path.is_relative_to(self.repo_root)
            else str(storage_path)
        )

        text = self._extract_uploaded_text(storage_path, file_bytes, suffix)
        document = await self._upsert_document_and_chunks(
            source_type="upload",
            display_name=upload_file.filename or storage_name,
            source_path=f"uploads/{self.restaurant_id}/{storage_name}",
            storage_path=storage_reference,
            content_hash=content_hash,
            content_type=upload_file.content_type,
            raw_text=text,
            metadata={"file_name": upload_file.filename, "size_bytes": len(file_bytes)},
            is_uploaded=True,
            openai_client=openai_client,
        )
        return document

    async def list_uploaded_documents(self):
        return await self.documents_repo.list_uploaded()

    async def reindex_builtins(self, openai_client: OpenAIClient) -> int:
        indexed_count, _warnings = await self.ensure_builtin_sources_indexed(
            openai_client,
            max_documents=None,
        )
        return indexed_count

    async def _index_file_path(
        self,
        *,
        path: Path,
        source_type: str,
        openai_client: OpenAIClient,
    ) -> tuple[bool, str | None]:
        raw_text = path.read_text(encoding="utf-8", errors="ignore")
        content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
        relative_path = str(path.relative_to(self.repo_root))
        existing = await self.documents_repo.get_by_source(source_type, relative_path)
        if existing and existing.content_hash == content_hash and existing.index_status in READY_INDEX_STATUSES:
            return False, None

        document, warning = await self._upsert_document_and_chunks(
            source_type=source_type,
            display_name=path.name,
            source_path=relative_path,
            storage_path=None,
            content_hash=content_hash,
            content_type="text/markdown" if path.suffix.lower() == ".md" else "text/plain",
            raw_text=raw_text,
            metadata={"modified_ts": path.stat().st_mtime},
            is_uploaded=False,
            openai_client=openai_client,
        )
        changed = bool(document and document.content_hash == content_hash and document.source_path == relative_path)
        return changed and document.index_status in READY_INDEX_STATUSES, warning

    async def _upsert_document_and_chunks(
        self,
        *,
        source_type: str,
        display_name: str,
        source_path: str,
        storage_path: str | None,
        content_hash: str,
        content_type: str | None,
        raw_text: str,
        metadata: Dict[str, Any],
        is_uploaded: bool,
        openai_client: OpenAIClient,
    ) -> tuple[Any, str | None]:
        existing = await self.documents_repo.get_by_source(source_type, source_path)
        if existing and existing.content_hash == content_hash and existing.index_status in READY_INDEX_STATUSES:
            return existing, None

        document_payload = {
            "source_type": source_type,
            "display_name": display_name,
            "source_path": source_path,
            "storage_path": storage_path,
            "content_type": content_type,
            "content_hash": content_hash,
            "metadata_json": metadata,
            "is_uploaded": is_uploaded,
            "index_status": "indexing",
            "last_error": None,
        }

        if existing:
            document = await self.documents_repo.update(existing.document_id, document_payload)
            await self.chunks_repo.delete_by_document_id(existing.document_id)
        else:
            document = await self.documents_repo.create(document_payload)

        chunks = self._chunk_text(raw_text)
        if not chunks:
            document = await self.documents_repo.update(
                document.document_id,
                {
                    "index_status": "failed",
                    "last_error": "No indexable text was extracted from this document.",
                },
            )
            return document, None

        chunk_rows = []
        for chunk in chunks:
            chunk_rows.append(
                await self.chunks_repo.create(
                    {
                        "document_id": document.document_id,
                        "chunk_index": chunk["chunk_index"],
                        "heading_trail": chunk["heading_trail"],
                        "chunk_checksum": hashlib.sha256(chunk["text"].encode("utf-8")).hexdigest(),
                        "text": chunk["text"],
                        "token_count": len(chunk["text"].split()),
                        "embedding": None,
                    }
                )
            )

        try:
            embeddings = await openai_client.embed_texts([chunk["text"] for chunk in chunks])
            for chunk_row, embedding in zip(chunk_rows, embeddings):
                await self.chunks_repo.update(
                    chunk_row.chunk_id,
                    {
                        "embedding": embedding,
                    },
                )

            document = await self.documents_repo.update(
                document.document_id,
                {
                    "index_status": "indexed",
                    "indexed_at": datetime.utcnow(),
                    "last_error": None,
                }
            )
            return document, None
        except Exception as exc:
            warning = (
                f"Built-in document embeddings were rate-limited or unavailable; using lexical retrieval for {display_name}."
                if not is_uploaded
                else f"Document indexed without embeddings for {display_name}; lexical retrieval will still work."
            )
            logger.warning("Assistant embeddings unavailable during indexing for %s: %s", source_path, exc)
            document = await self.documents_repo.update(
                document.document_id,
                {
                    "index_status": "indexed_lexical",
                    "indexed_at": datetime.utcnow(),
                    "last_error": str(exc)[:1000],
                },
            )
            return document, warning

    def _extract_uploaded_text(self, storage_path: Path, file_bytes: bytes, suffix: str) -> str:
        if suffix in SUPPORTED_TEXT_EXTENSIONS:
            return file_bytes.decode("utf-8", errors="ignore")
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader
            except ImportError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="PDF uploads require the pypdf package to be installed.",
                ) from exc
            reader = PdfReader(str(storage_path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        raise HTTPException(status_code=400, detail="Unsupported assistant upload format.")

    def _chunk_text(self, raw_text: str) -> List[Dict[str, Any]]:
        sections = self._split_sections(raw_text)
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for heading_trail, section_text in sections:
            words = section_text.split()
            if not words:
                continue
            start = 0
            while start < len(words):
                end = min(len(words), start + TARGET_WORDS)
                text = " ".join(words[start:end]).strip()
                if text:
                    chunks.append(
                        {
                            "chunk_index": chunk_index,
                            "heading_trail": list(heading_trail),
                            "text": text,
                        }
                    )
                    chunk_index += 1
                if end >= len(words):
                    break
                start = max(0, end - OVERLAP_WORDS)

        return chunks

    def _split_sections(self, raw_text: str) -> List[Tuple[List[str], str]]:
        lines = raw_text.splitlines()
        heading_trail: List[str] = []
        current_lines: List[str] = []
        sections: List[Tuple[List[str], str]] = []

        def flush_section() -> None:
            if current_lines:
                sections.append((list(heading_trail), "\n".join(current_lines).strip()))
                current_lines.clear()

        for line in lines:
            match = re.match(r"^(#{1,6})\s+(.*)$", line.strip())
            if match:
                flush_section()
                level = len(match.group(1))
                title = match.group(2).strip()
                if level <= len(heading_trail):
                    heading_trail[:] = heading_trail[: level - 1]
                while len(heading_trail) < level - 1:
                    heading_trail.append("")
                if len(heading_trail) == level - 1:
                    heading_trail.append(title)
                else:
                    heading_trail[level - 1] = title
                    heading_trail[:] = heading_trail[:level]
                continue
            current_lines.append(line)

        flush_section()
        if not sections and raw_text.strip():
            sections.append(([], raw_text.strip()))
        return sections
