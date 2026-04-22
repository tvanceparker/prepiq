from app.schemas.assistant_dto import AssistantRetrievalMode


STRUCTURED_HINTS = {
    "inventory",
    "stock",
    "forecast",
    "sales",
    "alert",
    "alerts",
    "purchase order",
    "order",
    "po",
    "eod",
    "par",
    "ingredient",
    "waste",
    "usage",
    "reorder",
    "vendor",
    "buy",
    "replenish",
}

DOCUMENT_HINTS = {
    "how",
    "why",
    "process",
    "procedure",
    "setup",
    "configure",
    "policy",
    "onboard",
    "upload",
    "document",
    "docs",
    "file",
    "guide",
    "playbook",
    "manual",
}

BLENDED_HINTS = {
    "should",
    "recommend",
    "what changed",
    "what do i need",
    "what do we need",
    "why is",
}


class AssistantQueryRouter:
    @staticmethod
    def classify(query: str) -> AssistantRetrievalMode:
        normalized = query.lower()

        has_structured = any(term in normalized for term in STRUCTURED_HINTS)
        has_document = any(term in normalized for term in DOCUMENT_HINTS)
        has_blended = any(term in normalized for term in BLENDED_HINTS)

        if has_structured and has_document:
            return AssistantRetrievalMode.blended
        if has_structured:
            return AssistantRetrievalMode.structured
        if has_blended and has_document:
            return AssistantRetrievalMode.blended
        if has_document:
            return AssistantRetrievalMode.document
        return AssistantRetrievalMode.document
