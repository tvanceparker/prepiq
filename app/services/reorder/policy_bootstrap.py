from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from app.services.reorder_forecast_engine import ReorderForecastEngine


POLICY_BOOTSTRAP_TARGET_SERVICE_LEVELS = {
    "fresh_perishable": Decimal("0.9000"),
    "stable_stocked": Decimal("0.9500"),
    "recipe_dependent": Decimal("0.9300"),
    "intermittent_low_turn": Decimal("0.8800"),
}
POLICY_BOOTSTRAP_FRESH_SHELF_LIFE_DAYS = 5
POLICY_BOOTSTRAP_PERISHABLE_HINTS = (
    "arugula",
    "basil",
    "bread",
    "cilantro",
    "cream",
    "fillet",
    "fish",
    "herb",
    "lettuce",
    "milk",
    "parsley",
    "salmon",
    "scallop",
    "seafood",
    "shrimp",
    "spinach",
    "yogurt",
)
POLICY_BOOTSTRAP_PERISHABLE_CATEGORY_HINTS = (
    "bakery",
    "dairy",
    "produce",
    "seafood",
)
POLICY_BOOTSTRAP_PREP_COMPONENT_HINTS = (
    "aioli",
    "base",
    "broth",
    "dough",
    "dressing",
    "marinade",
    "prep",
    "reduction",
    "sauce",
    "slaw",
    "soup",
    "stock",
)


class ReorderPolicyBootstrapHelper:
    def __init__(self, engine: "ReorderForecastEngine"):
        self.engine = engine

    def has_complete_policy_config(self, ingredient: Optional[Any]) -> bool:
        if ingredient is None:
            return False
        policy_type = self.engine._normalize_policy_type_value(
            getattr(ingredient, "policy_type", None)
        )
        if not policy_type:
            return False

        return (
            self.engine._normalize_floatlike(
                getattr(ingredient, "target_service_level", None)
            )
            is not None
            or self.engine._normalize_floatlike(
                getattr(ingredient, "service_level_z", None)
            )
            is not None
        )

    def needs_policy_bootstrap(self, ingredient: Optional[Any]) -> bool:
        return not self.has_complete_policy_config(ingredient)

    def resolve_bootstrap_shelf_life_days(
        self,
        *,
        inventory: Optional[Any],
        supplier: Optional[Any],
    ) -> Optional[int]:
        for source in (
            getattr(inventory, "shelf_life_days", None) if inventory is not None else None,
            getattr(supplier, "shelf_life_days", None) if supplier is not None else None,
        ):
            normalized = self.engine._normalize_priority(source)
            if normalized is not None and normalized > 0:
                return normalized
        return None

    def ingredient_matches_any_hint(
        self,
        ingredient: Any,
        *,
        hints: tuple[str, ...],
    ) -> bool:
        haystack = " ".join(
            filter(
                None,
                [
                    self.engine._normalize_textlike(getattr(ingredient, "name", None)),
                    self.engine._normalize_textlike(getattr(ingredient, "category", None)),
                ],
            )
        )
        return any(hint in haystack for hint in hints)

    def looks_clearly_perishable(
        self,
        ingredient: Any,
        *,
        shelf_life_days: Optional[int],
    ) -> bool:
        if (
            shelf_life_days is not None
            and shelf_life_days <= POLICY_BOOTSTRAP_FRESH_SHELF_LIFE_DAYS
        ):
            return True
        return self.ingredient_matches_any_hint(
            ingredient,
            hints=(
                *POLICY_BOOTSTRAP_PERISHABLE_HINTS,
                *POLICY_BOOTSTRAP_PERISHABLE_CATEGORY_HINTS,
            ),
        )

    def looks_like_prep_component(self, ingredient: Any) -> bool:
        return self.ingredient_matches_any_hint(
            ingredient,
            hints=POLICY_BOOTSTRAP_PREP_COMPONENT_HINTS,
        )

    def assess_bootstrap_sparse_demand(
        self,
        *,
        daily_forecast: List[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        window_days = max(len(daily_forecast), 1)
        forecast_points = self.engine._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=window_days,
        )
        positive_point_count = sum(1 for _, qty in forecast_points if qty > 0)
        positive_point_ratio = (
            positive_point_count / max(len(forecast_points), 1)
            if forecast_points
            else 0.0
        )
        sparsity_context = self.engine._assess_demand_sparsity(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            demand_context={"uncapped_coverage_days": window_days},
        )
        average_spacing_days = None
        if sparsity_context["event_spacing_days"]:
            average_spacing_days = sum(sparsity_context["event_spacing_days"]) / len(
                sparsity_context["event_spacing_days"]
            )

        is_sparse = positive_point_count > 0 and (
            positive_point_ratio <= 0.25
            or (positive_point_count <= 2 and len(forecast_points) >= 7)
            or (average_spacing_days is not None and average_spacing_days >= 4)
        )

        return {
            **sparsity_context,
            "window_days": len(forecast_points),
            "positive_point_count": positive_point_count,
            "positive_point_ratio": positive_point_ratio,
            "average_spacing_days": average_spacing_days,
            "is_sparse": is_sparse,
        }

    async def infer_policy_type_for_bootstrap(
        self,
        *,
        ingredient: Any,
        ingredient_id: int,
        daily_forecast: List[Any],
        as_of_date: date,
        shelf_life_days: Optional[int],
    ) -> tuple[str, str]:
        if self.looks_clearly_perishable(
            ingredient,
            shelf_life_days=shelf_life_days,
        ):
            if (
                shelf_life_days is not None
                and shelf_life_days <= POLICY_BOOTSTRAP_FRESH_SHELF_LIFE_DAYS
            ):
                return "fresh_perishable", f"shelf_life_days={shelf_life_days}"
            return "fresh_perishable", "perishable ingredient hint"

        dependency_context = await self.engine._build_recipe_dependency_context(ingredient_id)
        if dependency_context["batch_recipe_count"] > 0:
            return "recipe_dependent", "batch recipe dependency"
        if (
            dependency_context["recipe_count"] > 0
            and self.looks_like_prep_component(ingredient)
        ):
            return "recipe_dependent", "prep-component recipe dependency"

        sparsity_context = self.assess_bootstrap_sparse_demand(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
        )
        if sparsity_context["is_sparse"]:
            return (
                "intermittent_low_turn",
                f"sparse forecast events ratio={sparsity_context['positive_point_ratio']:.2f}",
            )

        return "stable_stocked", "stable-stock fallback"

    def default_target_service_level_for_policy(self, policy_type: str) -> Decimal:
        return POLICY_BOOTSTRAP_TARGET_SERVICE_LEVELS[policy_type].quantize(
            Decimal("0.0001")
        )

    def build_policy_bootstrap_reason(
        self,
        *,
        policy_type: str,
        missing_policy_type: bool,
        missing_service_level: bool,
        inference_reason: Optional[str],
    ) -> str:
        if missing_policy_type:
            return (
                f"EOD bootstrap inferred policy_type={policy_type}"
                f" ({inference_reason or 'policy inference'})."
            )
        if missing_service_level:
            return (
                f"EOD bootstrap filled missing service-level defaults for policy_type={policy_type}."
            )
        return "EOD bootstrap reviewed replenishment policy configuration."

    async def build_bootstrap_policy_update(
        self,
        *,
        ingredient: Any,
        ingredient_id: int,
        daily_forecast: List[Any],
        as_of_date: date,
        suppliers: List[Any],
        inventory: Optional[Any],
    ) -> Dict[str, Any]:
        existing_policy_type = self.engine._normalize_policy_type_value(
            getattr(ingredient, "policy_type", None)
        )
        existing_assignment_mode = self.engine._normalize_assignment_mode(
            getattr(ingredient, "policy_assignment_mode", None)
        )
        has_service_level = (
            self.engine._normalize_floatlike(getattr(ingredient, "target_service_level", None))
            is not None
            or self.engine._normalize_floatlike(getattr(ingredient, "service_level_z", None))
            is not None
        )
        missing_policy_type = not existing_policy_type
        missing_service_level = not has_service_level

        if not (missing_policy_type or missing_service_level):
            return {}

        supplier_selection = await self.engine.choose_supplier_option(
            suppliers,
            as_of_date=as_of_date,
        )
        selected_supplier = supplier_selection["supplier"] if supplier_selection else None
        shelf_life_days = self.resolve_bootstrap_shelf_life_days(
            inventory=inventory,
            supplier=selected_supplier,
        )

        inference_reason = None
        policy_type = existing_policy_type
        if missing_policy_type:
            policy_type, inference_reason = await self.infer_policy_type_for_bootstrap(
                ingredient=ingredient,
                ingredient_id=ingredient_id,
                daily_forecast=daily_forecast,
                as_of_date=as_of_date,
                shelf_life_days=shelf_life_days,
            )

        update_payload: Dict[str, Any] = {}
        if missing_policy_type:
            update_payload["policy_type"] = policy_type
            update_payload["policy_assignment_mode"] = "system"

        if missing_service_level:
            update_payload["target_service_level"] = self.default_target_service_level_for_policy(
                policy_type
            )
            if not missing_policy_type and existing_assignment_mode is None:
                update_payload["policy_assignment_mode"] = "system"

        if not self.engine._normalize_textlike(
            getattr(ingredient, "policy_override_reason", None)
        ):
            update_payload["policy_override_reason"] = self.build_policy_bootstrap_reason(
                policy_type=policy_type,
                missing_policy_type=missing_policy_type,
                missing_service_level=missing_service_level,
                inference_reason=inference_reason,
            )

        return update_payload