import os
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.openai_client import OpenAIClient
from app.repositories.restaurants_repo import RestaurantRepository
from app.schemas.assistant_dto import (
    AssistantDocumentDTO,
    AssistantCitationDTO,
    AssistantDocumentUploadResponseDTO,
    AssistantQueryRequestDTO,
    AssistantQueryResponseDTO,
    AssistantResponseStatus,
)
from app.services.helpers.assistant_context_builder import AssistantContextBuilder
from app.services.helpers.assistant_indexing_service import AssistantIndexingService
from app.services.helpers.assistant_prompt_builder import AssistantPromptBuilder
from app.services.helpers.assistant_query_router import AssistantQueryRouter
from app.services.helpers.assistant_reranker import AssistantReranker
from app.services.helpers.assistant_retriever import AssistantRetriever
from app.utils.secret_encryption import decrypt_secret
from app.utils.logger_helpers import log_method


class AssistantService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        repo_root = Path(__file__).resolve().parents[2]
        self.repo_root = repo_root
        self.retriever = AssistantRetriever(db, restaurant_id)
        self.reranker = AssistantReranker()
        self.prompt_builder = AssistantPromptBuilder()
        self.indexing_service = AssistantIndexingService(db, restaurant_id, str(repo_root))
        self.context_builder = AssistantContextBuilder(
            db,
            restaurant_id,
            subscription_tier,
            employee_id,
        )

    @log_method("Assistant Query")
    async def query(self, payload: AssistantQueryRequestDTO) -> AssistantQueryResponseDTO:
        restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")

        settings_blob = restaurant.settings or {}
        assistant_settings = settings_blob.get("assistant") or {}
        retrieval_mode = AssistantQueryRouter.classify(payload.query)

        if not assistant_settings.get("enabled", False):
            return AssistantQueryResponseDTO(
                status=AssistantResponseStatus.disabled,
                retrieval_mode=retrieval_mode,
                answer=(
                    "The assistant is currently disabled for this restaurant. "
                    "Enable it in Settings > Integrations to start using assistant queries."
                ),
                warnings=["Assistant settings are present, but the assistant is not enabled."],
            )

        restaurant_key, key_warning = self._resolve_restaurant_api_key(restaurant)
        openai_client = OpenAIClient(api_key=restaurant_key or os.getenv("OPENAI_API_KEY"))

        if not openai_client.is_configured():
            return AssistantQueryResponseDTO(
                status=AssistantResponseStatus.not_configured,
                retrieval_mode=retrieval_mode,
                answer=(
                    key_warning
                    or "The assistant does not have an OpenAI API key configured yet. "
                    "Add a restaurant key in Settings > Integrations or configure a server-level fallback key."
                ),
                warnings=[
                    key_warning
                    or "No restaurant-level or server-level OpenAI API key is configured."
                ],
            )

        indexed_count, indexing_warnings = await self.indexing_service.ensure_builtin_sources_indexed(
            openai_client,
            max_documents=None,
        )

        structured_sections, structured_citations, clarification = await self.context_builder.build(
            payload.query,
            retrieval_mode.value,
        )
        if clarification:
            return AssistantQueryResponseDTO(
                status=AssistantResponseStatus.scaffolded,
                retrieval_mode=retrieval_mode,
                answer=clarification,
                warnings=indexing_warnings,
                citations=structured_citations,
            )
        reranked_candidates: list[dict] = []
        document_chunks: list[dict] = []
        if retrieval_mode.value != "structured":
            document_candidates = await self.retriever.retrieve(payload.query, openai_client=openai_client, top_k=24)
            reranked_candidates = self.reranker.rerank(payload.query, document_candidates, top_k=5)
            expanded_candidates = await self.retriever.expand_neighbors(reranked_candidates, limit_base=3)
            document_chunks = self._merge_document_context(reranked_candidates, expanded_candidates)

        citations = list(structured_citations)
        if reranked_candidates:
            citations.extend(self._build_document_citations(reranked_candidates))

        if retrieval_mode.value == "document" and not reranked_candidates:
            return AssistantQueryResponseDTO(
                status=AssistantResponseStatus.scaffolded,
                retrieval_mode=retrieval_mode,
                answer=(
                    "I could not find enough matching reference material in the current docs and notes set to answer that reliably yet."
                ),
                warnings=["No strong document matches were found for this query."],
                citations=citations,
            )

        messages = self.prompt_builder.build_messages(
            query=payload.query,
            retrieval_mode=retrieval_mode.value,
            structured_sections=structured_sections,
            document_chunks=document_chunks,
        )

        try:
            answer = await openai_client.generate_answer(messages)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Assistant generation failed: {exc}") from exc

        return AssistantQueryResponseDTO(
            status=AssistantResponseStatus.scaffolded,
            retrieval_mode=retrieval_mode,
            answer=answer,
            warnings=self._build_warnings(
                retrieval_mode.value,
                reranked_candidates,
                structured_sections,
                indexing_warnings=indexing_warnings,
                indexed_count=indexed_count,
            ),
            citations=citations,
        )

    @log_method("Assistant Upload Document")
    async def upload_document(self, upload_file: UploadFile) -> AssistantDocumentUploadResponseDTO:
        openai_client = await self._get_configured_openai_client()
        document = await self.indexing_service.index_uploaded_file(
            upload_file=upload_file,
            openai_client=openai_client,
        )
        return AssistantDocumentUploadResponseDTO(
            document=self._serialize_document(document),
            message="Assistant document uploaded and indexed successfully.",
        )

    @log_method("Assistant List Documents")
    async def list_uploaded_documents(self) -> list[AssistantDocumentDTO]:
        documents = await self.indexing_service.list_uploaded_documents()
        return [self._serialize_document(document) for document in documents]

    @log_method("Assistant Reindex Documents")
    async def reindex_documents(self) -> dict:
        openai_client = await self._get_configured_openai_client()
        indexed_count = await self.indexing_service.reindex_builtins(openai_client)
        return {"indexed_count": indexed_count}

    def _build_document_citations(self, chunks: list[dict]) -> list[AssistantCitationDTO]:
        citations = []
        for chunk in chunks:
            snippet = chunk.get("text", "")[:220].strip()
            citations.append(
                AssistantCitationDTO(
                    source_type=chunk.get("source_type", "docs"),
                    label=" > ".join(chunk.get("heading_trail") or []) or chunk.get("path", "Reference"),
                    path=chunk.get("path"),
                    snippet=snippet,
                )
            )
        return citations

    def _merge_document_context(self, base_chunks: list[dict], expanded_chunks: list[dict]) -> list[dict]:
        seen = set()
        merged = []
        for chunk in [*base_chunks, *expanded_chunks]:
            key = (chunk.get("document_id"), chunk.get("chunk_index"))
            if key in seen:
                continue
            seen.add(key)
            merged.append(chunk)
        return merged[:8]

    def _build_warnings(
        self,
        retrieval_mode: str,
        reranked_candidates: list[dict],
        structured_sections: list[str],
        *,
        indexing_warnings: list[str] | None = None,
        indexed_count: int = 0,
    ) -> list[str]:
        warnings = []
        warnings.extend(indexing_warnings or [])
        if retrieval_mode != "document" and not structured_sections:
            warnings.append("No structured live-data sources matched this query strongly enough on the first pass.")
        if retrieval_mode != "structured" and not reranked_candidates:
            warnings.append("No strong document matches were found in indexed docs, notes, or uploads.")
        return warnings

    async def _get_configured_openai_client(self) -> OpenAIClient:
        restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        restaurant_key, key_warning = self._resolve_restaurant_api_key(restaurant)
        openai_client = OpenAIClient(api_key=restaurant_key or os.getenv("OPENAI_API_KEY"))
        if not openai_client.is_configured():
            raise HTTPException(
                status_code=400,
                detail=(
                    key_warning
                    or "Assistant uploads and indexing require a restaurant-level or server-level OpenAI API key."
                ),
            )
        return openai_client

    def _resolve_restaurant_api_key(self, restaurant) -> tuple[str | None, str | None]:
        encrypted_key = restaurant.assistant_openai_api_key
        if not encrypted_key:
            return None, None

        decrypted_key = decrypt_secret(encrypted_key)
        if decrypted_key:
            return decrypted_key, None

        return (
            None,
            "The stored restaurant OpenAI API key could not be decrypted. Set a stable ENCRYPTION_KEY and save the key again in Settings > Integrations.",
        )

    def _serialize_document(self, document) -> AssistantDocumentDTO:
        return AssistantDocumentDTO(
            document_id=document.document_id,
            source_type=document.source_type,
            display_name=document.display_name,
            source_path=document.source_path,
            index_status=document.index_status,
            content_type=document.content_type,
            updated_at=document.updated_at.isoformat() if document.updated_at else None,
            indexed_at=document.indexed_at.isoformat() if document.indexed_at else None,
        )
