import math
import re
from collections import Counter
from typing import Any, Dict, List


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "we",
    "what",
    "when",
    "why",
    "with",
}


SOURCE_PRIORITY = {
    "docs": 1.0,
    "notes": 0.8,
    "upload": 0.9,
}


DOMAIN_PATH_BOOSTS = {
    "reorder": {
        "docs/REPLENISHMENT_POLICY_ENGINE.md",
        "docs/INVENTORY_DEDUCTION_AND_PO.md",
        "docs/core-workflows.md",
        "docs/rag-ingestion-guide.md",
    },
    "inventory": {
        "docs/INVENTORY_DEDUCTION_AND_PO.md",
        "docs/database-map.md",
        "docs/core-workflows.md",
    },
    "forecast": {
        "docs/FORECASTING_SYSTEM.md",
        "docs/core-workflows.md",
    },
    "assistant": {
        "docs/ASSISTANT_IMPLEMENTATION_STATUS.md",
        "docs/ASSISTANT_RETRIEVAL_DESIGN.md",
        "docs/rag-ingestion-guide.md",
    },
}


def _tokenize(value: str) -> List[str]:
    return [token for token in re.findall(r"[a-z0-9_\-]+", value.lower()) if token not in STOPWORDS]


class AssistantReranker:
    def rerank(self, query: str, candidates: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        query_tokens = _tokenize(query)
        query_counts = Counter(query_tokens)
        exact_query = query.strip().lower()
        source_counts: Counter[str] = Counter()
        rescored: List[Dict[str, Any]] = []

        for candidate in candidates:
            text = candidate.get("text", "")
            heading = " ".join(candidate.get("heading_trail") or [])
            text_tokens = _tokenize(text)
            text_counts = Counter(text_tokens)

            lexical_overlap = 0.0
            if query_counts:
                matched = sum(min(count, text_counts.get(term, 0)) for term, count in query_counts.items())
                lexical_overlap = matched / max(sum(query_counts.values()), 1)

            if exact_query and exact_query in text.lower():
                lexical_overlap = min(1.0, lexical_overlap + 0.15)

            heading_tokens = set(_tokenize(heading))
            heading_match = 0.0
            if query_tokens and heading_tokens:
                heading_match = len(set(query_tokens) & heading_tokens) / max(len(set(query_tokens)), 1)

            source_type = candidate.get("source_type", "docs")
            source_priority = SOURCE_PRIORITY.get(source_type, 0.75)
            path_boost = self._domain_path_boost(query_tokens, str(candidate.get("path") or ""))

            freshness_bonus = 0.5
            modified_ts = candidate.get("modified_ts")
            if modified_ts:
                freshness_bonus = 0.5 + min(0.5, 1.0 / max(1.0, math.log1p(modified_ts)))
                freshness_bonus = max(0.2, min(1.0, freshness_bonus))

            retrieval_score = float(candidate.get("retrieval_score", 0.0))
            section_key = f"{candidate.get('path')}::{heading}"
            diversity_penalty = 0.05 * source_counts[section_key]

            score = (
                0.55 * retrieval_score
                + 0.2 * lexical_overlap
                + 0.15 * heading_match
                + 0.05 * source_priority
                + 0.05 * freshness_bonus
                + path_boost
                - diversity_penalty
            )

            next_candidate = dict(candidate)
            next_candidate["rerank_score"] = round(score, 6)
            rescored.append(next_candidate)
            source_counts[section_key] += 1

        rescored.sort(key=lambda item: item.get("rerank_score", 0.0), reverse=True)
        return rescored[:top_k]

    def _domain_path_boost(self, query_tokens: List[str], path: str) -> float:
        if not query_tokens or not path:
            return 0.0
        token_set = set(query_tokens)
        boost = 0.0
        if {"reorder", "replenish", "supplier", "purchase", "po", "order"} & token_set:
            if path in DOMAIN_PATH_BOOSTS["reorder"]:
                boost += 0.35
        if {"inventory", "stock", "ingredient"} & token_set:
            if path in DOMAIN_PATH_BOOSTS["inventory"]:
                boost += 0.2
        if {"forecast", "demand", "sales"} & token_set:
            if path in DOMAIN_PATH_BOOSTS["forecast"]:
                boost += 0.2
        if {"assistant", "rag", "upload", "index"} & token_set:
            if path in DOMAIN_PATH_BOOSTS["assistant"]:
                boost += 0.2
        return boost
