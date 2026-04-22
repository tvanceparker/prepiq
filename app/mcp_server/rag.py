import os
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.openai_client import OpenAIClient
from app.repositories.restaurants_repo import RestaurantRepository
from app.services.helpers.assistant_context_builder import AssistantContextBuilder
from app.services.helpers.assistant_reranker import AssistantReranker
from app.services.helpers.assistant_retriever import AssistantRetriever
from app.utils.secret_encryption import decrypt_secret


class RAGPreflightContextAdapter:
    """Advisory retrieval for MCP planning.

    This adapter intentionally returns context only. It never authorizes or
    executes mutations; live DB/service validation still owns final truth.
    """

    def __init__(
        self,
        db: AsyncSession,
        *,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: int,
    ):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id

    async def build(
        self,
        *,
        query: str,
        target_tool: str | None = None,
        include_documents: bool = False,
    ) -> dict[str, Any]:
        context_builder = AssistantContextBuilder(
            self.db,
            self.restaurant_id,
            self.subscription_tier,
            self.employee_id,
        )
        structured_sections, citations, clarification = await context_builder.build(
            query,
            "structured",
        )

        warnings: list[str] = [
            "RAG context is advisory only; MCP guards and service validation decide whether actions execute.",
            "Restaurant scope is already authenticated from the PrepIQ JWT/database; do not ask the operator for restaurant_id or tier.",
        ]
        document_context: list[dict] = []
        if include_documents:
            document_context, document_warnings = await self._retrieve_documents(query)
            warnings.extend(document_warnings)

        return {
            "target_tool": target_tool,
            "query": query,
            "authenticated_scope": {
                "restaurant_id": self.restaurant_id,
                "subscription_tier": self.subscription_tier,
                "source": "authenticated_user",
                "tools_accept_restaurant_id": False,
            },
            "action_boundary": {
                "rag_can_retrieve": True,
                "rag_can_mutate": False,
                "mcp_tools_validate_live_database_state": True,
            },
            "structured_sections": structured_sections,
            "document_context": document_context,
            "citations": [citation.model_dump() for citation in citations],
            "clarification": clarification,
            "warnings": warnings,
            "authoritative_for_mutation": False,
        }

    async def _retrieve_documents(self, query: str) -> tuple[list[dict], list[str]]:
        restaurant_repo = RestaurantRepository(self.db, self.restaurant_id)
        restaurant = await restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            return [], ["Restaurant not found while building document context."]

        restaurant_key = decrypt_secret(restaurant.assistant_openai_api_key)
        openai_client = OpenAIClient(api_key=restaurant_key or os.getenv("OPENAI_API_KEY"))
        if not openai_client.is_configured():
            return [], ["Document retrieval skipped because no OpenAI API key is configured."]

        retriever = AssistantRetriever(self.db, self.restaurant_id)
        reranker = AssistantReranker()
        candidates = await retriever.retrieve(query, openai_client=openai_client, top_k=12)
        reranked = reranker.rerank(query, candidates, top_k=4)
        return [
            {
                "source_type": item.get("source_type"),
                "path": item.get("path"),
                "label": " > ".join(item.get("heading_trail") or []) or item.get("path"),
                "snippet": (item.get("text") or "")[:500],
            }
            for item in reranked
        ], []
