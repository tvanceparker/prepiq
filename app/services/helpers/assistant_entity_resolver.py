from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Dict, List

from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.recipes_repo import RecipeRepository


MIN_CANDIDATE_SCORE = 0.62
HIGH_CONFIDENCE_SCORE = 0.78
AMBIGUITY_DELTA = 0.05


def _normalize_token(token: str) -> str:
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("es") and len(token) > 4:
        return token[:-2]
    if token.endswith("s") and len(token) > 3 and not token.endswith("ss"):
        return token[:-1]
    return token


def _normalize_text(value: str) -> str:
    tokens = [_normalize_token(token) for token in re.findall(r"[a-z0-9]+", value.lower())]
    return " ".join(token for token in tokens if token)


class AssistantEntityResolver:
    def __init__(self, db, restaurant_id: int):
        self.menu_repo = MenuItemRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)

    async def resolve_menu_item(self, query: str) -> Dict[str, Any]:
        return self._resolve_named_entity(
            query,
            entity_type="menu_item",
            rows=await self.menu_repo.get_active_menu_items(),
            id_field="menu_item_id",
            name_field="name",
        )

    async def resolve_ingredient(self, query: str) -> Dict[str, Any]:
        return self._resolve_named_entity(
            query,
            entity_type="ingredient",
            rows=await self.ingredient_repo.get_all(limit=1000),
            id_field="ingredient_id",
            name_field="name",
        )

    async def resolve_recipe(self, query: str) -> Dict[str, Any]:
        return self._resolve_named_entity(
            query,
            entity_type="recipe",
            rows=await self.recipe_repo.get_active(),
            id_field="recipe_id",
            name_field="name",
        )

    async def resolve_batch_recipe(self, query: str) -> Dict[str, Any]:
        return self._resolve_named_entity(
            query,
            entity_type="batch_recipe",
            rows=await self.batch_recipe_repo.get_active(),
            id_field="batch_recipe_id",
            name_field="name",
        )

    def _resolve_named_entity(
        self,
        query: str,
        *,
        entity_type: str,
        rows: List[Any],
        id_field: str,
        name_field: str,
    ) -> Dict[str, Any]:
        normalized_query = _normalize_text(query)
        query_tokens = normalized_query.split()
        candidates: List[Dict[str, Any]] = []

        for row in rows:
            entity_name = getattr(row, name_field, None)
            if not entity_name:
                continue
            score, match_kind = self._score_candidate(normalized_query, query_tokens, str(entity_name))
            if score < MIN_CANDIDATE_SCORE:
                continue
            candidates.append(
                {
                    "entity_type": entity_type,
                    "entity_id": getattr(row, id_field),
                    "name": str(entity_name),
                    "confidence": round(score, 3),
                    "match_kind": match_kind,
                }
            )

        candidates.sort(key=lambda item: item["confidence"], reverse=True)
        if not candidates:
            return {
                "entity_type": entity_type,
                "match": None,
                "candidates": [],
                "ambiguous": False,
            }

        top = candidates[0]
        second = candidates[1] if len(candidates) > 1 else None
        ambiguous = bool(
            second
            and top["confidence"] < 0.99
            and (top["confidence"] - second["confidence"]) <= AMBIGUITY_DELTA
        )

        if top["confidence"] >= HIGH_CONFIDENCE_SCORE and not ambiguous:
            return {
                "entity_type": entity_type,
                "match": top,
                "candidates": candidates[:3],
                "ambiguous": False,
            }

        return {
            "entity_type": entity_type,
            "match": None,
            "candidates": candidates[:3],
            "ambiguous": True,
        }

    def _score_candidate(
        self,
        normalized_query: str,
        query_tokens: List[str],
        entity_name: str,
    ) -> tuple[float, str]:
        normalized_entity = _normalize_text(entity_name)
        if not normalized_entity:
            return 0.0, "none"

        entity_tokens = normalized_entity.split()
        query_token_set = set(query_tokens)
        entity_token_set = set(entity_tokens)
        if normalized_entity == normalized_query:
            return 1.0, "exact"
        if normalized_entity in normalized_query:
            return 0.99, "substring"
        if entity_token_set and entity_token_set.issubset(query_token_set):
            return 0.96, "token_subset"

        token_overlap = 0.0
        if entity_token_set:
            token_overlap = len(entity_token_set & query_token_set) / max(len(entity_token_set), 1)

        best_similarity = 0.0
        query_windows = self._query_windows(query_tokens, len(entity_tokens))
        for window in query_windows:
            best_similarity = max(best_similarity, SequenceMatcher(None, normalized_entity, window).ratio())

        score = max(best_similarity * 0.75 + token_overlap * 0.25, token_overlap * 0.85)
        match_kind = "fuzzy" if best_similarity >= token_overlap else "token_overlap"
        return score, match_kind

    @staticmethod
    def _query_windows(query_tokens: List[str], entity_length: int) -> List[str]:
        if not query_tokens:
            return []

        windows = {" ".join(query_tokens)}
        for window_size in {max(1, entity_length - 1), entity_length, entity_length + 1}:
            if window_size > len(query_tokens):
                continue
            for index in range(len(query_tokens) - window_size + 1):
                windows.add(" ".join(query_tokens[index:index + window_size]))
        return list(windows)