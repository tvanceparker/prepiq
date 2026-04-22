import re

from app.schemas.assistant_dto import AssistantRetrievalMode


STRUCTURED_HINTS = {
    "inventory",
    "stock",
    "forecast",
    "forecasted",
    "sales",
    "sell",
    "selling",
    "expected",
    "expect",
    "upcoming",
    "alert",
    "alerts",
    "purchase order",
    "purchase",
    "purchasing",
    "order",
    "orders",
    "ordering",
    "po",
    "eod",
    "par",
    "ingredient",
    "ingredients",
    "waste",
    "usage",
    "reorder",
    "vendor",
    "vendors",
    "buy",
    "replenish",
    "recipe",
    "recipes",
    "batch",
    "linked",
    "contain",
    "contains",
    "used",
    "usage",
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


def _tokenize_query(query: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", query.lower()))


def _matches_hints(normalized: str, tokens: set[str], hints: set[str]) -> bool:
    for hint in hints:
        if " " in hint:
            if hint in normalized:
                return True
        elif hint in tokens:
            return True
    return False


def _looks_operational_query(normalized: str, tokens: set[str]) -> bool:
    if {
        "forecast",
        "forecasted",
        "sell",
        "selling",
        "expected",
        "upcoming",
        "reorder",
        "inventory",
        "ingredient",
        "recipe",
        "batch",
        "linked",
        "purchase",
    } & tokens:
        return True

    month_names = (
        "january|february|march|april|may|june|july|august|september|october|november|december"
    )
    return bool(re.search(rf"\b({month_names}|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", normalized))


class AssistantQueryRouter:
    @staticmethod
    def classify(query: str) -> AssistantRetrievalMode:
        normalized = query.lower()
        tokens = _tokenize_query(query)

        has_structured = _matches_hints(normalized, tokens, STRUCTURED_HINTS)
        has_document = _matches_hints(normalized, tokens, DOCUMENT_HINTS)
        has_blended = _matches_hints(normalized, tokens, BLENDED_HINTS)

        if has_structured:
            if _looks_operational_query(normalized, tokens):
                return AssistantRetrievalMode.structured
            if has_document:
                return AssistantRetrievalMode.blended
            return AssistantRetrievalMode.structured
        if has_blended and has_document:
            return AssistantRetrievalMode.blended
        if has_document:
            return AssistantRetrievalMode.document
        return AssistantRetrievalMode.document
