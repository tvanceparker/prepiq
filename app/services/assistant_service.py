import os
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.mcp_action_audit_orm import MCPActionAudit
from app.integrations.openai_client import OpenAIClient, OpenAIToolInvocation
from app.mcp_server.confirmation import (
    DEFAULT_CONFIRMATION_TTL_SECONDS,
    issue_confirmation_token,
)
from app.repositories.restaurants_repo import RestaurantRepository
from app.schemas.assistant_dto import (
    AssistantDocumentDTO,
    AssistantCitationDTO,
    AssistantDocumentUploadResponseDTO,
    AssistantActionResultDTO,
    AssistantQueryRequestDTO,
    AssistantQueryResponseDTO,
    AssistantPendingActionDTO,
    AssistantReindexResponseDTO,
    AssistantResponseStatus,
)
from app.services.helpers.assistant_action_state import (
    AssistantPendingAction,
    assistant_action_state,
)
from app.services.helpers.assistant_context_builder import AssistantContextBuilder
from app.services.helpers.assistant_indexing_service import AssistantIndexingService
from app.services.helpers.assistant_prompt_builder import AssistantPromptBuilder
from app.services.helpers.assistant_query_router import AssistantQueryRouter
from app.services.helpers.assistant_reranker import AssistantReranker
from app.services.helpers.assistant_retriever import AssistantRetriever
from app.services.helpers.assistant_tool_executor import AssistantToolExecutor
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
    async def query(self, payload: AssistantQueryRequestDTO, *, raw_token: str | None = None) -> AssistantQueryResponseDTO:
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

        pending_action_response = await self._maybe_handle_pending_action(payload, retrieval_mode, raw_token=raw_token)
        if pending_action_response:
            return pending_action_response

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

        tool_invocations: list[OpenAIToolInvocation] = []
        tool_executor = None
        if retrieval_mode.value != "document":
            tool_executor = AssistantToolExecutor(
                self.db,
                self.restaurant_id,
                self.subscription_tier,
                self.employee_id,
                payload.query,
                raw_token=raw_token,
                conversation_id=payload.conversation_id,
            )

        try:
            if tool_executor:
                generation = await openai_client.generate_answer_with_tools(
                    messages=messages,
                    tools=tool_executor.get_openai_tools(),
                    tool_executor=tool_executor.execute_tool,
                )
                answer = generation.answer
                tool_invocations = generation.tool_invocations
            else:
                answer = await openai_client.generate_answer(messages)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Assistant generation failed: {exc}") from exc

        if tool_invocations:
            citations.extend(self._build_tool_citations(tool_invocations))

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
                tool_invocations=tool_invocations,
            ),
            citations=citations,
            pending_action=self._build_pending_action_dto(tool_executor.pending_action if tool_executor else None),
            action_result=self._build_action_result(tool_invocations),
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
        documents = await self.indexing_service.list_documents()
        return [self._serialize_document(document) for document in documents]

    @log_method("Assistant Reindex Documents")
    async def reindex_documents(self) -> AssistantReindexResponseDTO:
        openai_client = await self._get_configured_openai_client()
        result = await self.indexing_service.reindex_builtins(openai_client)
        return AssistantReindexResponseDTO(**result)

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

    def _build_tool_citations(self, invocations: list[OpenAIToolInvocation]) -> list[AssistantCitationDTO]:
        citations = []
        for invocation in invocations:
            result_snippet = json.dumps(invocation.result, default=str)[:220]
            label_prefix = "MCP Action Tool" if invocation.result.get("audit_id") is not None else "MCP Query Tool"
            citations.append(
                AssistantCitationDTO(
                    source_type="tool",
                    label=f"{label_prefix}: {invocation.name}",
                    snippet=result_snippet,
                )
            )
        return citations

    def _build_action_result(
        self,
        invocations: list[OpenAIToolInvocation],
    ) -> AssistantActionResultDTO | None:
        for invocation in reversed(invocations):
            if invocation.result.get("audit_id") is None:
                continue
            return AssistantActionResultDTO(
                tool=invocation.name,
                status=str(invocation.result.get("status") or "unknown"),
                audit_id=invocation.result.get("audit_id"),
                idempotent_replay=bool(invocation.result.get("idempotent_replay")),
            )
        return None

    def _build_pending_action_dto(
        self,
        pending_action,
    ) -> AssistantPendingActionDTO | None:
        if not pending_action:
            return None
        return AssistantPendingActionDTO(**pending_action.to_public_dict())

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
        tool_invocations: list[OpenAIToolInvocation] | None = None,
    ) -> list[str]:
        warnings = []
        warnings.extend(indexing_warnings or [])
        if retrieval_mode != "document" and not structured_sections:
            warnings.append("No structured live-data sources matched this query strongly enough on the first pass.")
        if retrieval_mode != "structured" and not reranked_candidates:
            warnings.append("No strong document matches were found in indexed docs, notes, or uploads.")
        for invocation in tool_invocations or []:
            if invocation.result.get("ok") is False:
                error = invocation.result.get("error") or {}
                warnings.append(
                    f"Assistant tool {invocation.name} failed: {error.get('message') or 'Unknown tool error.'}"
                )
            elif invocation.result.get("requires_confirmation"):
                warnings.append(f"Assistant action {invocation.name} is staged and waiting for your confirmation.")
        return warnings

    async def _maybe_handle_pending_action(
        self,
        payload: AssistantQueryRequestDTO,
        retrieval_mode,
        *,
        raw_token: str | None,
    ) -> AssistantQueryResponseDTO | None:
        if not payload.conversation_id:
            return None

        is_confirmation = self._is_confirmation_request(payload.query)
        pending_action = assistant_action_state.get(
            restaurant_id=self.restaurant_id,
            employee_id=self.employee_id,
            conversation_id=payload.conversation_id,
        )
        if not pending_action:
            if is_confirmation:
                pending_action = await self._load_pending_action_from_audit(
                    payload.conversation_id
                )
            if not pending_action:
                return None

        if self._is_cancellation_request(payload.query):
            assistant_action_state.clear(
                restaurant_id=self.restaurant_id,
                employee_id=self.employee_id,
                conversation_id=payload.conversation_id,
            )
            return AssistantQueryResponseDTO(
                status=AssistantResponseStatus.scaffolded,
                retrieval_mode=retrieval_mode,
                answer=f"Cancelled the pending {pending_action.tool_name} action.",
                action_result=AssistantActionResultDTO(
                    tool=pending_action.tool_name,
                    status="cancelled",
                    audit_id=pending_action.audit_id,
                ),
            )

        if not is_confirmation:
            return None

        executor = AssistantToolExecutor(
            self.db,
            self.restaurant_id,
            self.subscription_tier,
            self.employee_id,
            pending_action.operator_intent,
            raw_token=raw_token,
            conversation_id=payload.conversation_id,
        )
        result = await executor.execute_pending_action(pending_action)
        assistant_action_state.clear(
            restaurant_id=self.restaurant_id,
            employee_id=self.employee_id,
            conversation_id=payload.conversation_id,
        )

        warnings = []
        if not result.get("ok"):
            error = result.get("error") or {}
            warnings.append(error.get("message") or "The pending assistant action failed.")

        citations = [
            AssistantCitationDTO(
                source_type="tool",
                label=f"MCP Action Tool: {pending_action.tool_name}",
                snippet=json.dumps(result, default=str)[:220],
            )
        ]
        return AssistantQueryResponseDTO(
            status=AssistantResponseStatus.scaffolded,
            retrieval_mode=retrieval_mode,
            answer=self._format_pending_action_result(pending_action.tool_name, result),
            warnings=warnings,
            citations=citations,
            action_result=AssistantActionResultDTO(
                tool=pending_action.tool_name,
                status=str(result.get("status") or "unknown"),
                audit_id=result.get("audit_id"),
                idempotent_replay=bool(result.get("idempotent_replay")),
            ),
        )

    async def _load_pending_action_from_audit(
        self,
        conversation_id: str,
    ) -> AssistantPendingAction | None:
        if self.db is None:
            return None

        prefix = f"assistant:{conversation_id}:"
        result = await self.db.execute(
            select(MCPActionAudit)
            .where(
                MCPActionAudit.restaurant_id == self.restaurant_id,
                MCPActionAudit.employee_id == self.employee_id,
                MCPActionAudit.status == "requires_confirmation",
                MCPActionAudit.requires_confirmation.is_(True),
                MCPActionAudit.completed_at.is_(None),
                MCPActionAudit.idempotency_key.like(f"{prefix}%"),
            )
            .order_by(MCPActionAudit.created_at.desc())
            .limit(1)
        )
        audit = result.scalars().first()
        if not audit or not audit.input_summary:
            return None

        created_at = audit.created_at or datetime.utcnow()
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        expires_at = created_at + timedelta(seconds=DEFAULT_CONFIRMATION_TTL_SECONDS)
        if expires_at <= datetime.now(timezone.utc):
            return None

        arguments = {
            key: value
            for key, value in dict(audit.input_summary).items()
            if key
            not in {
                "idempotency_key",
                "dry_run",
                "confirmation_token",
                "operator_intent",
                "include_rag_context",
            }
        }
        confirmation_token = issue_confirmation_token(
            tool_name=audit.tool_name,
            restaurant_id=self.restaurant_id,
            employee_id=self.employee_id,
            payload_digest=audit.payload_hash,
            risk_level=audit.risk_level,
        )
        preview = audit.result_summary if isinstance(audit.result_summary, dict) else None
        return AssistantPendingAction(
            tool_name=audit.tool_name,
            idempotency_key=audit.idempotency_key,
            confirmation_token=confirmation_token,
            arguments=arguments,
            audit_id=audit.audit_id,
            operator_intent="Confirmed pending assistant action.",
            preview=preview,
            created_at=created_at,
            expires_at=expires_at,
        )

    def _format_pending_action_result(self, tool_name: str, result: dict) -> str:
        if result.get("ok"):
            return f"Confirmed and executed {tool_name} successfully."
        error = result.get("error") or {}
        return f"I tried to execute {tool_name}, but it failed: {error.get('message') or 'Unknown error.'}"

    def _is_confirmation_request(self, query: str) -> bool:
        normalized = re.sub(r"[^a-z]+", " ", query.lower()).strip()
        tokens = set(normalized.split())
        has_negation = bool(tokens & {"not", "dont", "don", "no", "cancel", "stop"})

        exact_confirmations = {
            "confirm",
            "yes",
            "yes confirm",
            "yes please",
            "confirm it",
            "approve",
            "approved",
            "do it",
            "go ahead",
            "looks good",
            "sounds good",
            "perfect",
        }
        if has_negation:
            return False

        if normalized in exact_confirmations:
            return True

        confirmation_phrases = {
            "confirm it",
            "do it",
            "go ahead",
            "looks good",
            "sounds good",
            "yes please",
        }
        if any(f" {phrase} " in f" {normalized} " for phrase in confirmation_phrases):
            return True

        return bool(tokens & {"confirm", "approve", "approved"})

    def _is_cancellation_request(self, query: str) -> bool:
        normalized = re.sub(r"[^a-z]+", " ", query.lower()).strip()
        return normalized in {
            "cancel",
            "never mind",
            "stop",
            "dont do that",
            "do not do that",
            "no cancel",
        }

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
