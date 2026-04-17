from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.batch_recipe_ingredients_repo import BatchRecipeIngredientRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.services.inventory_stats_service import InventoryStatsService
from app.repositories.alerts_repo import AlertRepository
from app.core.logging import logger
from app.utils.logger_helpers import log_method
from app.utils.replenishment_policy import resolve_cadence
import math
from statistics import NormalDist


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


class ReorderForecastEngine:
    """
    Engine for calculating reorder points, safety stock, and suggested reorder quantities
    for ingredients based on inventory statistics and forecasting data.
    """

    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str = None):
        """
        Initialize the reorder forecast engine with the necessary repositories and services.

        Args:
            db (AsyncSession): The async database session.
            restaurant_id (int): ID of the restaurant for which forecast data is handled.
        """
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.stats_service = InventoryStatsService(db, restaurant_id)
        self.alert_repo = AlertRepository(db,restaurant_id)
        self._abc_cache: Dict[int, str] = {}

    @staticmethod
    def _to_float(value: Optional[Decimal]) -> Optional[float]:
        if value is None:
            return None
        try:
            if isinstance(value, Decimal) and not value.is_finite():
                return None
            converted = float(value)
            if not math.isfinite(converted):
                return None
            return converted
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_priority(value) -> Optional[int]:
        if value is None:
            return None
        if not isinstance(value, (int, float, Decimal, str)):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _to_decimal(value: Optional[Any]) -> Decimal:
        if value is None:
            return Decimal("0.00")
        return Decimal(str(value)).quantize(Decimal("0.01"))

    @staticmethod
    def _normalize_date_value(value: Optional[Any]) -> Optional[date]:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _normalize_floatlike(value: Optional[Any]) -> Optional[float]:
        if value is None:
            return None
        if not isinstance(value, (int, float, Decimal, str)):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_textlike(value: Optional[Any]) -> str:
        if not isinstance(value, str):
            return ""
        return value.strip().lower()

    def _normalize_assignment_mode(self, value: Optional[Any]) -> Optional[str]:
        normalized = self._normalize_textlike(value)
        return normalized or None

    def _normalize_policy_type_value(self, value: Optional[Any]) -> Optional[str]:
        normalized = self._normalize_textlike(value)
        return normalized or None

    def _has_complete_policy_config(self, ingredient: Optional[Any]) -> bool:
        if ingredient is None:
            return False
        policy_type = self._normalize_policy_type_value(
            getattr(ingredient, "policy_type", None)
        )
        if not policy_type:
            return False

        return (
            self._normalize_floatlike(getattr(ingredient, "target_service_level", None))
            is not None
            or self._normalize_floatlike(getattr(ingredient, "service_level_z", None))
            is not None
        )

    def _needs_policy_bootstrap(self, ingredient: Optional[Any]) -> bool:
        return not self._has_complete_policy_config(ingredient)

    def _resolve_bootstrap_shelf_life_days(
        self,
        *,
        inventory: Optional[Any],
        supplier: Optional[Any],
    ) -> Optional[int]:
        for source in (
            getattr(inventory, "shelf_life_days", None) if inventory is not None else None,
            getattr(supplier, "shelf_life_days", None) if supplier is not None else None,
        ):
            normalized = self._normalize_priority(source)
            if normalized is not None and normalized > 0:
                return normalized
        return None

    def _ingredient_matches_any_hint(
        self,
        ingredient: Any,
        *,
        hints: tuple[str, ...],
    ) -> bool:
        haystack = " ".join(
            filter(
                None,
                [
                    self._normalize_textlike(getattr(ingredient, "name", None)),
                    self._normalize_textlike(getattr(ingredient, "category", None)),
                ],
            )
        )
        return any(hint in haystack for hint in hints)

    def _looks_clearly_perishable(
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
        return self._ingredient_matches_any_hint(
            ingredient,
            hints=(
                *POLICY_BOOTSTRAP_PERISHABLE_HINTS,
                *POLICY_BOOTSTRAP_PERISHABLE_CATEGORY_HINTS,
            ),
        )

    def _looks_like_prep_component(self, ingredient: Any) -> bool:
        return self._ingredient_matches_any_hint(
            ingredient,
            hints=POLICY_BOOTSTRAP_PREP_COMPONENT_HINTS,
        )

    def _assess_bootstrap_sparse_demand(
        self,
        *,
        daily_forecast: List[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        window_days = max(len(daily_forecast), 1)
        forecast_points = self._window_forecast_points(
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
        sparsity_context = self._assess_demand_sparsity(
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

    async def _infer_policy_type_for_bootstrap(
        self,
        *,
        ingredient: Any,
        ingredient_id: int,
        daily_forecast: List[Any],
        as_of_date: date,
        shelf_life_days: Optional[int],
    ) -> tuple[str, str]:
        # Freshness wins over recipe dependency in bootstrap because short shelf life
        # is the harder operational constraint when the system has incomplete config.
        if self._looks_clearly_perishable(
            ingredient,
            shelf_life_days=shelf_life_days,
        ):
            if (
                shelf_life_days is not None
                and shelf_life_days <= POLICY_BOOTSTRAP_FRESH_SHELF_LIFE_DAYS
            ):
                return "fresh_perishable", f"shelf_life_days={shelf_life_days}"
            return "fresh_perishable", "perishable ingredient hint"

        dependency_context = await self._build_recipe_dependency_context(ingredient_id)
        if dependency_context["batch_recipe_count"] > 0:
            return "recipe_dependent", "batch recipe dependency"
        if (
            dependency_context["recipe_count"] > 0
            and self._looks_like_prep_component(ingredient)
        ):
            return "recipe_dependent", "prep-component recipe dependency"

        sparsity_context = self._assess_bootstrap_sparse_demand(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
        )
        if sparsity_context["is_sparse"]:
            return (
                "intermittent_low_turn",
                f"sparse forecast events ratio={sparsity_context['positive_point_ratio']:.2f}",
            )

        return "stable_stocked", "stable-stock fallback"

    def _default_target_service_level_for_policy(self, policy_type: str) -> Decimal:
        return POLICY_BOOTSTRAP_TARGET_SERVICE_LEVELS[policy_type].quantize(
            Decimal("0.0001")
        )

    def _build_policy_bootstrap_reason(
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

    async def _build_bootstrap_policy_update(
        self,
        *,
        ingredient: Any,
        ingredient_id: int,
        daily_forecast: List[Any],
        as_of_date: date,
        suppliers: List[Any],
        inventory: Optional[Any],
    ) -> Dict[str, Any]:
        existing_policy_type = self._normalize_policy_type_value(
            getattr(ingredient, "policy_type", None)
        )
        existing_assignment_mode = self._normalize_assignment_mode(
            getattr(ingredient, "policy_assignment_mode", None)
        )
        has_service_level = (
            self._normalize_floatlike(getattr(ingredient, "target_service_level", None))
            is not None
            or self._normalize_floatlike(getattr(ingredient, "service_level_z", None))
            is not None
        )
        missing_policy_type = not existing_policy_type
        missing_service_level = not has_service_level

        if not (missing_policy_type or missing_service_level):
            return {}

        supplier_selection = await self.choose_supplier_option(
            suppliers,
            as_of_date=as_of_date,
        )
        selected_supplier = supplier_selection["supplier"] if supplier_selection else None
        shelf_life_days = self._resolve_bootstrap_shelf_life_days(
            inventory=inventory,
            supplier=selected_supplier,
        )

        inference_reason = None
        policy_type = existing_policy_type
        if missing_policy_type:
            policy_type, inference_reason = await self._infer_policy_type_for_bootstrap(
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
            update_payload["target_service_level"] = (
                self._default_target_service_level_for_policy(policy_type)
            )
            if not missing_policy_type and existing_assignment_mode is None:
                update_payload["policy_assignment_mode"] = "system"

        if not self._normalize_textlike(getattr(ingredient, "policy_override_reason", None)):
            update_payload["policy_override_reason"] = self._build_policy_bootstrap_reason(
                policy_type=policy_type,
                missing_policy_type=missing_policy_type,
                missing_service_level=missing_service_level,
                inference_reason=inference_reason,
            )

        return update_payload

    @log_method("Reorder: Bootstrap Missing Policy Config")
    async def bootstrap_missing_policy_config(
        self,
        *,
        ingredient_forecast: Dict[int, dict],
        as_of_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        anchor_date = as_of_date or date.today()
        summary = {
            "updated_count": 0,
            "skipped_count": 0,
            "failed_count": 0,
            "updated_ingredient_ids": [],
            "failed_items": [],
        }

        for ingredient_id in sorted(ingredient_forecast.keys()):
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            if ingredient is None or getattr(ingredient, "is_active", True) is False:
                summary["skipped_count"] += 1
                continue

            if not self._needs_policy_bootstrap(ingredient):
                summary["skipped_count"] += 1
                continue

            daily_forecast = ingredient_forecast.get(ingredient_id, {}).get(
                "daily_breakdown",
                [],
            )
            suppliers = await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                ingredient_id
            )
            inventory = await self.inventory_repo.get_inventory_by_ingredient(
                ingredient_id
            )

            try:
                update_payload = await self._build_bootstrap_policy_update(
                    ingredient=ingredient,
                    ingredient_id=ingredient_id,
                    daily_forecast=daily_forecast,
                    as_of_date=anchor_date,
                    suppliers=suppliers,
                    inventory=inventory,
                )
                if not update_payload:
                    summary["skipped_count"] += 1
                    continue

                await self.ingredient_repo.update(ingredient_id, update_payload)
                summary["updated_count"] += 1
                summary["updated_ingredient_ids"].append(ingredient_id)
            except Exception as exc:
                logger.warning(
                    "[REORDER] Policy bootstrap failed ingredient=%s error=%s",
                    ingredient_id,
                    exc,
                )
                summary["failed_count"] += 1
                summary["failed_items"].append(
                    {"ingredient_id": ingredient_id, "reason": str(exc)}
                )

        return summary

    async def _resolve_policy_context(
        self,
        ingredient_id: int,
        *,
        shelf_life_days: Optional[int],
    ) -> Dict[str, Any]:
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        configured_policy = getattr(ingredient, "policy_type", None)
        policy_type = self._normalize_policy_type_value(configured_policy)
        if not policy_type:
            raise ValueError(
                f"ingredient {ingredient_id} missing policy_type; configure an explicit replenishment policy"
            )

        policy_assignment_mode = self._normalize_assignment_mode(
            getattr(ingredient, "policy_assignment_mode", None)
        )
        override_target_service_level = self._normalize_floatlike(
            getattr(ingredient, "target_service_level", None)
        )
        override_service_level_z = self._normalize_floatlike(
            getattr(ingredient, "service_level_z", None)
        )

        if override_service_level_z is None and override_target_service_level is None:
            raise ValueError(
                f"ingredient {ingredient_id} missing target_service_level/service_level_z for policy {policy_type}"
            )

        if override_service_level_z is not None:
            service_level_z = Decimal(str(override_service_level_z)).quantize(
                Decimal("0.0001")
            )
            target_service_level = Decimal(
                str(NormalDist().cdf(float(service_level_z)))
            ).quantize(Decimal("0.0001"))
            service_level_source = "ingredient_override"
        else:
            target_service_level = Decimal(str(override_target_service_level)).quantize(
                Decimal("0.0001")
            )
            service_level_z = Decimal(
                str(NormalDist().inv_cdf(float(target_service_level)))
            ).quantize(Decimal("0.0001"))
            service_level_source = "ingredient_target"

        return {
            "policy_type": policy_type,
            "policy_assignment_mode": policy_assignment_mode,
            "target_service_level": target_service_level,
            "service_level_z": service_level_z,
            "service_level_source": service_level_source,
            "policy_override_reason": getattr(ingredient, "policy_override_reason", None),
            "policy_inferred": policy_assignment_mode == "system",
        }

    def _resolve_supplier_cadence_context(
        self,
        supplier: Any,
        *,
        as_of_date: Optional[date],
        default_lead_time_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        lead_time_days = self._normalize_priority(getattr(supplier, "lead_time_days", None))
        if lead_time_days is None:
            lead_time_days = max(int(default_lead_time_days or 0), 0)

        review_period_days = self._normalize_priority(
            getattr(supplier, "review_period_days", None)
        )
        order_schedule_type = getattr(supplier, "order_schedule_type", None)
        if not isinstance(order_schedule_type, (str, type(None))):
            order_schedule_type = None
        allowed_order_days = getattr(supplier, "allowed_order_days", None)
        if not isinstance(allowed_order_days, (list, tuple, str, type(None))):
            allowed_order_days = None
        allowed_delivery_days = getattr(supplier, "allowed_delivery_days", None)
        if not isinstance(allowed_delivery_days, (list, tuple, str, type(None))):
            allowed_delivery_days = None

        cadence = resolve_cadence(
            as_of_date=as_of_date,
            lead_time_days=lead_time_days,
            review_period_days=review_period_days,
            order_schedule_type=order_schedule_type,
            allowed_order_days=allowed_order_days,
            allowed_delivery_days=allowed_delivery_days,
        )
        next_delivery_date = cadence.next_delivery_date
        next_order_date = cadence.next_order_date
        anchor_date = as_of_date or date.today()
        effective_lead_days = max(
            (next_delivery_date - anchor_date).days if next_delivery_date else lead_time_days,
            0,
        )
        cadence_source = getattr(supplier, "cadence_source", None)
        if not isinstance(cadence_source, (str, type(None))):
            cadence_source = None

        return {
            "cadence": cadence,
            "lead_time_days": lead_time_days,
            "effective_lead_days": effective_lead_days,
            "review_period_days": cadence.review_period_days,
            "order_schedule_type": cadence.order_schedule_type,
            "allowed_order_days": list(cadence.allowed_order_days),
            "allowed_delivery_days": list(cadence.allowed_delivery_days),
            "next_order_date": next_order_date,
            "next_delivery_date": next_delivery_date,
            "days_until_next_order": cadence.days_until_next_order,
            "protection_window_days": cadence.protection_window_days,
            "warnings": list(cadence.warnings),
            "cadence_source": cadence_source,
            "cadence_confidence_score": self._normalize_floatlike(
                getattr(supplier, "cadence_confidence_score", None)
            ),
            "explicit_cadence": bool(
                review_period_days
                or order_schedule_type
                or allowed_order_days
                or allowed_delivery_days
            ),
        }

    def _sum_forecast_window(
        self,
        daily_forecast: List[Any],
        *,
        start_date: date,
        window_days: int,
    ) -> Decimal:
        if window_days <= 0:
            return Decimal("0.00")
        end_date = start_date + timedelta(days=window_days)
        total = Decimal("0.00")
        for forecast_day, quantity in daily_forecast:
            normalized_day = self._normalize_date_value(forecast_day)
            if normalized_day is None:
                continue
            if start_date <= normalized_day < end_date:
                total += self._to_decimal(quantity)
        return total.quantize(Decimal("0.01"))

    def _window_forecast_points(
        self,
        daily_forecast: List[Any],
        *,
        start_date: date,
        window_days: int,
    ) -> List[Any]:
        if window_days <= 0:
            return []

        end_date = start_date + timedelta(days=window_days)
        points = []
        for forecast_day, quantity in daily_forecast:
            normalized_day = self._normalize_date_value(forecast_day)
            if normalized_day is None:
                continue
            if start_date <= normalized_day < end_date:
                points.append((normalized_day, self._to_decimal(quantity)))

        points.sort(key=lambda item: item[0])
        return points

    async def _build_demand_context(
        self,
        *,
        ingredient_id: int,
        daily_forecast: List[Any],
        supplier: Optional[Any],
        as_of_date: date,
        lead_time: int,
        shelf_life_days: Optional[int],
        current_unit: str,
        current_stock: Decimal,
    ) -> Dict[str, Any]:
        cadence_context = self._resolve_supplier_cadence_context(
            supplier,
            as_of_date=as_of_date,
            default_lead_time_days=lead_time,
        )
        effective_lead_days = cadence_context["effective_lead_days"]
        normalized_shelf_life_days = (
            max(int(shelf_life_days), 0) if shelf_life_days is not None else None
        )

        uncapped_coverage_days = max(
            cadence_context["protection_window_days"],
            effective_lead_days,
        )
        if uncapped_coverage_days == 0 and supplier is None and normalized_shelf_life_days:
            uncapped_coverage_days = normalized_shelf_life_days

        coverage_days = uncapped_coverage_days
        coverage_capped_by_shelf_life = False
        if normalized_shelf_life_days is not None and normalized_shelf_life_days > 0:
            if coverage_days > normalized_shelf_life_days:
                coverage_days = normalized_shelf_life_days
                coverage_capped_by_shelf_life = True

        if coverage_days == 0 and supplier is None and normalized_shelf_life_days:
            coverage_days = normalized_shelf_life_days

        lead_window_days = min(effective_lead_days, coverage_days)
        lead_points = self._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=lead_window_days,
        )
        protection_lead_points = self._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=effective_lead_days,
        )
        coverage_points = self._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=coverage_days,
        )
        protection_points = self._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=uncapped_coverage_days,
        )

        lead_demand = sum((qty for _, qty in lead_points), Decimal("0.00")).quantize(
            Decimal("0.01")
        )
        protection_lead_demand = sum(
            (qty for _, qty in protection_lead_points),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        total_demand = sum((qty for _, qty in coverage_points), Decimal("0.00")).quantize(
            Decimal("0.01")
        )
        protection_total_demand = sum(
            (qty for _, qty in protection_points),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        shelf_demand = max(total_demand - lead_demand, Decimal("0.00")).quantize(
            Decimal("0.01")
        )
        positive_points = [(day, qty) for day, qty in coverage_points if qty > 0]
        next_event_demand = (
            positive_points[0][1] if positive_points else Decimal("0.00")
        ).quantize(Decimal("0.01"))
        average_daily_demand = (
            (total_demand / Decimal(str(coverage_days))).quantize(Decimal("0.01"))
            if coverage_days
            else Decimal("0.00")
        )
        max_daily_demand = max(
            (qty for _, qty in coverage_points),
            default=Decimal("0.00"),
        ).quantize(Decimal("0.01"))

        usable_until_date = cadence_context["next_delivery_date"] or (
            as_of_date + timedelta(days=effective_lead_days)
        )
        usable_inventory = await self.stats_service.get_usable_inventory(
            ingredient_id,
            usable_until_date=usable_until_date,
        )
        usable_stock = self._to_decimal(usable_inventory["quantity"])
        usable_unit = usable_inventory.get("unit") or current_unit

        return {
            "demand_source": "forecast_daily_breakdown",
            "cadence_context": cadence_context,
            "effective_lead_days": effective_lead_days,
            "lead_window_days": lead_window_days,
            "coverage_days": coverage_days,
            "uncapped_coverage_days": uncapped_coverage_days,
            "coverage_capped_by_shelf_life": coverage_capped_by_shelf_life,
            "lead_demand": lead_demand,
            "protection_lead_demand": protection_lead_demand,
            "shelf_demand": shelf_demand,
            "total_demand": total_demand,
            "protection_total_demand": protection_total_demand,
            "average_daily_demand": average_daily_demand,
            "max_daily_demand": max_daily_demand,
            "demand_event_count": len(positive_points),
            "next_event_demand": next_event_demand,
            "effective_shelf_life_days": normalized_shelf_life_days,
            "usable_until_date": usable_until_date,
            "current_stock": usable_stock,
            "current_unit": usable_unit,
            "total_stock": self._to_decimal(usable_inventory.get("total_quantity")),
            "excluded_expiring_stock": self._to_decimal(
                usable_inventory.get("excluded_quantity")
            ),
            "inventory_source": usable_inventory.get("source") or "inventory_summary",
            "inventory_conversion_fallback": bool(
                usable_inventory.get("conversion_fallback")
            ),
            "fallback_stock": current_stock,
        }

    def _build_inventory_position_context(
        self,
        *,
        demand_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        usable_stock = self._to_decimal(demand_context.get("current_stock"))
        inbound_quantity = Decimal("0.00")
        backorder_quantity = Decimal("0.00")
        inventory_position = (usable_stock + inbound_quantity - backorder_quantity).quantize(
            Decimal("0.01")
        )
        assumption_warnings = [
            "inbound quantity unavailable; assumed zero",
            "backorders unavailable; assumed zero",
        ]

        return {
            "usable_stock": usable_stock,
            "inbound_quantity": inbound_quantity,
            "backorder_quantity": backorder_quantity,
            "inventory_position": inventory_position,
            "inbound_quantity_assumed_zero": True,
            "backorder_quantity_assumed_zero": True,
            "assumption_warnings": assumption_warnings,
        }

    @staticmethod
    def _zero_policy_quantities(reorder_method: str) -> Dict[str, Any]:
        zero = Decimal("0.00")
        return {
            "reorder_point": zero,
            "reorder_target": zero,
            "raw_order_quantity": zero,
            "policy_capped_quantity": zero,
            "policy_buffer_quantity": zero,
            "policy_safe_quantity": zero,
            "safety_stock": zero,
            "trigger_met": False,
            "reorder_method": reorder_method,
        }

    def _resolve_fresh_perishable_window(
        self,
        *,
        demand_context: Dict[str, Any],
    ) -> int:
        effective_shelf_life_days = demand_context.get("effective_shelf_life_days")
        if not effective_shelf_life_days:
            return 0
        protection_window_days = int(demand_context.get("uncapped_coverage_days") or 0)
        if protection_window_days <= 0:
            protection_window_days = int(effective_shelf_life_days)
        return max(
            min(
                int(effective_shelf_life_days),
                protection_window_days,
            ),
            0,
        )

    def _compute_perishable_reserve(
        self,
        *,
        forecast_use: Decimal,
        usable_window_days: int,
    ) -> Decimal:
        forecast_use = self._to_decimal(forecast_use)
        if forecast_use <= 0 or usable_window_days <= 0:
            return Decimal("0.00")
        average_daily_demand = (forecast_use / Decimal(str(usable_window_days))).quantize(
            Decimal("0.01")
        )
        return min(average_daily_demand, forecast_use).quantize(Decimal("0.01"))

    def _resolve_fresh_spoilage_cap(
        self,
        *,
        daily_forecast: List[Any],
        effective_shelf_life_days: Optional[int],
        supplier: Optional[Any],
        as_of_date: date,
    ) -> Decimal:
        if effective_shelf_life_days is None or int(effective_shelf_life_days) <= 0:
            return Decimal("0.00")
        historical_spoilage_rate = max(
            self._to_decimal(
                getattr(supplier, "spoilage_rate", None) if supplier is not None else None
            ),
            Decimal("0.00"),
        )
        base_freshness_buffer = Decimal("0.10")
        freshness_buffer = max(
            base_freshness_buffer - min(historical_spoilage_rate, base_freshness_buffer),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        shelf_life_demand = self._sum_forecast_window(
            daily_forecast,
            start_date=as_of_date,
            window_days=int(effective_shelf_life_days),
        )
        return (shelf_life_demand * (Decimal("1.00") + freshness_buffer)).quantize(
            Decimal("0.01")
        )

    def _build_fresh_perishable_decision(
        self,
        *,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        supplier: Optional[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        usable_window_days = self._resolve_fresh_perishable_window(
            demand_context=demand_context,
        )
        if usable_window_days <= 0:
            return {
                **self._zero_policy_quantities("perishable_window"),
                "usable_window_days": usable_window_days,
                "spoilage_cap_quantity": Decimal("0.00"),
                "reserve_type": "perishable_reserve",
            }

        forecast_use = self._sum_forecast_window(
            daily_forecast,
            start_date=as_of_date,
            window_days=usable_window_days,
        )
        perishable_reserve = self._compute_perishable_reserve(
            forecast_use=forecast_use,
            usable_window_days=usable_window_days,
        )
        inventory_position = inventory_position_context["inventory_position"]
        target_stock = (forecast_use + perishable_reserve).quantize(Decimal("0.01"))
        raw_order_quantity = max(
            target_stock - inventory_position,
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        spoilage_cap_quantity = self._resolve_fresh_spoilage_cap(
            daily_forecast=daily_forecast,
            effective_shelf_life_days=demand_context.get("effective_shelf_life_days"),
            supplier=supplier,
            as_of_date=as_of_date,
        )
        policy_capped_quantity = min(raw_order_quantity, spoilage_cap_quantity).quantize(
            Decimal("0.01")
        )
        protection_window_days = int(demand_context.get("uncapped_coverage_days") or 0)
        return {
            "reorder_point": target_stock,
            "reorder_target": target_stock,
            "raw_order_quantity": raw_order_quantity,
            "policy_capped_quantity": policy_capped_quantity,
            "policy_safe_quantity": policy_capped_quantity,
            "policy_buffer_quantity": perishable_reserve,
            "safety_stock": Decimal("0.00"),
            "trigger_met": raw_order_quantity > 0,
            "reorder_method": "perishable_window",
            "usable_window_days": usable_window_days,
            "forecast_use": forecast_use,
            "spoilage_cap_quantity": spoilage_cap_quantity,
            "reserve_type": "perishable_reserve",
            "coverage_days": usable_window_days,
            "coverage_capped_by_shelf_life": bool(
                protection_window_days and usable_window_days < protection_window_days
            ),
        }

    async def _compute_stable_safety_stock(
        self,
        *,
        ingredient_id: int,
        lead_time: int,
        service_level_z: Decimal,
    ) -> Decimal:
        return await self.calculate_safety_stock(
            ingredient_id,
            lead_time,
            service_level_z=service_level_z,
        )

    async def _build_stable_stocked_decision(
        self,
        *,
        ingredient_id: int,
        demand_context: Dict[str, Any],
        inventory_position_context: Dict[str, Any],
        service_level_z: Decimal,
    ) -> Dict[str, Any]:
        lead_demand = self._to_decimal(demand_context.get("protection_lead_demand"))
        protection_window_demand = self._to_decimal(
            demand_context.get("protection_total_demand")
        )
        if protection_window_demand <= 0:
            return self._zero_policy_quantities("continuous_review")

        safety_stock = await self._compute_stable_safety_stock(
            ingredient_id=ingredient_id,
            lead_time=int(demand_context.get("effective_lead_days") or 0),
            service_level_z=service_level_z,
        )
        reorder_point = (lead_demand + safety_stock).quantize(Decimal("0.01"))
        reorder_target = (protection_window_demand + safety_stock).quantize(
            Decimal("0.01")
        )
        inventory_position = inventory_position_context["inventory_position"]
        trigger_met = inventory_position <= reorder_point
        raw_order_quantity = (
            max(reorder_target - inventory_position, Decimal("0.00"))
            if trigger_met
            else Decimal("0.00")
        ).quantize(Decimal("0.01"))
        return {
            "reorder_point": reorder_point,
            "reorder_target": reorder_target,
            "raw_order_quantity": raw_order_quantity,
            "policy_capped_quantity": raw_order_quantity,
            "policy_safe_quantity": raw_order_quantity,
            "policy_buffer_quantity": safety_stock.quantize(Decimal("0.01")),
            "safety_stock": safety_stock.quantize(Decimal("0.01")),
            "trigger_met": trigger_met,
            "reorder_method": "continuous_review",
            "reserve_type": "stable_safety_stock",
            "coverage_days": int(demand_context.get("uncapped_coverage_days") or 0),
        }

    async def _build_recipe_dependency_context(
        self,
        ingredient_id: int,
    ) -> Dict[str, Any]:
        recipe_links = await self.recipe_ingredient_repo.get_all_by_reference_id_and_type(
            "ingredient",
            ingredient_id,
        )
        batch_links = await self.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type(
            "ingredient",
            ingredient_id,
        )

        recipe_ids = {
            getattr(link, "recipe_id", None)
            for link in recipe_links
            if getattr(link, "recipe_id", None) is not None
        }
        batch_recipe_ids = {
            getattr(link, "batch_recipe_id", None)
            for link in batch_links
            if getattr(link, "batch_recipe_id", None) is not None
        }
        menu_item_ids = set()
        menu_linked_recipe_ids = set()
        for recipe_id in recipe_ids:
            menu_links = await self.menu_item_recipe_repo.get_by_recipe(recipe_id)
            if not menu_links:
                continue
            menu_linked_recipe_ids.add(recipe_id)
            for menu_link in menu_links:
                menu_item_id = getattr(menu_link, "menu_item_id", None)
                if menu_item_id is not None:
                    menu_item_ids.add(menu_item_id)

        if menu_linked_recipe_ids and batch_recipe_ids:
            dependency_mode = "mixed"
        elif batch_recipe_ids:
            dependency_mode = "batch_only"
        elif menu_linked_recipe_ids:
            dependency_mode = "menu_only"
        else:
            dependency_mode = "unknown"

        return {
            "dependency_mode": dependency_mode,
            "recipe_count": len(recipe_ids),
            "batch_recipe_count": len(batch_recipe_ids),
            "menu_item_count": len(menu_item_ids),
        }

    def _compute_recipe_requirement_guard(
        self,
        *,
        demand_context: Dict[str, Any],
        dependency_context: Dict[str, Any],
    ) -> Dict[str, Decimal]:
        average_daily_demand = self._to_decimal(demand_context.get("average_daily_demand"))
        daily_peak_quantity = self._to_decimal(demand_context.get("max_daily_demand"))
        menu_guard_quantity = min(average_daily_demand, daily_peak_quantity).quantize(
            Decimal("0.01")
        )
        batch_guard_quantity = daily_peak_quantity.quantize(Decimal("0.01"))
        dependency_mode = dependency_context.get("dependency_mode")

        if dependency_mode == "batch_only":
            recipe_guard_quantity = batch_guard_quantity
        elif dependency_mode == "mixed":
            recipe_guard_quantity = max(
                menu_guard_quantity,
                batch_guard_quantity,
            ).quantize(Decimal("0.01"))
        else:
            recipe_guard_quantity = menu_guard_quantity

        return {
            "recipe_guard_quantity": recipe_guard_quantity,
            "menu_guard_quantity": menu_guard_quantity,
            "batch_guard_quantity": batch_guard_quantity,
        }

    async def _build_recipe_dependent_decision(
        self,
        *,
        ingredient_id: int,
        demand_context: Dict[str, Any],
        inventory_position_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        dependency_context = await self._build_recipe_dependency_context(ingredient_id)
        net_requirement_quantity = self._to_decimal(
            demand_context.get("protection_total_demand")
        )
        guard_context = self._compute_recipe_requirement_guard(
            demand_context=demand_context,
            dependency_context=dependency_context,
        )
        recipe_guard_quantity = guard_context["recipe_guard_quantity"]
        coverage_days = int(demand_context.get("uncapped_coverage_days") or 0)
        reorder_method = "recipe_net_requirement_order_up_to"

        if net_requirement_quantity <= 0:
            return {
                **self._zero_policy_quantities(reorder_method),
                "reserve_type": "recipe_dependency_guard",
                "coverage_days": coverage_days,
                "coverage_capped_by_shelf_life": False,
                "recipe_dependency_mode": dependency_context["dependency_mode"],
                "recipe_count": dependency_context["recipe_count"],
                "batch_recipe_count": dependency_context["batch_recipe_count"],
                "menu_item_count": dependency_context["menu_item_count"],
                "net_requirement_quantity": net_requirement_quantity,
                "menu_guard_quantity": guard_context["menu_guard_quantity"],
                "batch_guard_quantity": guard_context["batch_guard_quantity"],
            }

        inventory_position = inventory_position_context["inventory_position"]
        target_stock = (net_requirement_quantity + recipe_guard_quantity).quantize(
            Decimal("0.01")
        )
        raw_order_quantity = max(
            target_stock - inventory_position,
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))

        return {
            "reorder_point": net_requirement_quantity,
            "reorder_target": target_stock,
            "raw_order_quantity": raw_order_quantity,
            "policy_capped_quantity": raw_order_quantity,
            "policy_safe_quantity": raw_order_quantity,
            "policy_buffer_quantity": recipe_guard_quantity,
            "safety_stock": Decimal("0.00"),
            "trigger_met": raw_order_quantity > 0,
            "reorder_method": reorder_method,
            "reserve_type": "recipe_dependency_guard",
            "coverage_days": coverage_days,
            "coverage_capped_by_shelf_life": False,
            "recipe_dependency_mode": dependency_context["dependency_mode"],
            "recipe_count": dependency_context["recipe_count"],
            "batch_recipe_count": dependency_context["batch_recipe_count"],
            "menu_item_count": dependency_context["menu_item_count"],
            "net_requirement_quantity": net_requirement_quantity,
            "menu_guard_quantity": guard_context["menu_guard_quantity"],
            "batch_guard_quantity": guard_context["batch_guard_quantity"],
        }

    def _assess_demand_sparsity(
        self,
        *,
        daily_forecast: List[Any],
        as_of_date: date,
        demand_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        protection_window_days = int(
            demand_context.get("uncapped_coverage_days")
            or demand_context.get("coverage_days")
            or demand_context.get("effective_lead_days")
            or 0
        )
        if protection_window_days <= 0:
            protection_window_days = 1
        forecast_points = self._window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=protection_window_days,
        )
        positive_points = [(day, qty) for day, qty in forecast_points if qty > 0]
        event_spacing_days = [
            (positive_points[index][0] - positive_points[index - 1][0]).days
            for index in range(1, len(positive_points))
        ]
        if len(positive_points) <= 1:
            sparsity_classification = "single_event"
        else:
            sparsity_classification = "repeated_sparse"

        return {
            "event_count": len(positive_points),
            "event_spacing_days": event_spacing_days,
            "days_until_next_event": (
                (positive_points[0][0] - as_of_date).days if positive_points else None
            ),
            "sparsity_classification": sparsity_classification,
        }

    def _compute_sparse_guard_quantity(
        self,
        *,
        demand_context: Dict[str, Any],
        sparsity_context: Dict[str, Any],
    ) -> Decimal:
        trigger_quantity = self._to_decimal(demand_context.get("next_event_demand"))
        if trigger_quantity <= 0 or sparsity_context.get("event_count", 0) <= 1:
            return Decimal("0.00")

        average_daily_demand = self._to_decimal(demand_context.get("average_daily_demand"))
        max_daily_demand = self._to_decimal(demand_context.get("max_daily_demand"))
        peak_delta = max(max_daily_demand - trigger_quantity, Decimal("0.00"))
        return min(
            average_daily_demand,
            peak_delta if peak_delta > 0 else average_daily_demand,
        ).quantize(Decimal("0.01"))

    def _build_intermittent_review_flags(
        self,
        *,
        policy_safe_quantity: Decimal,
        moq_floor: Decimal,
        final_quantity: Decimal,
    ) -> Dict[str, Any]:
        policy_safe_quantity = self._to_decimal(policy_safe_quantity)
        moq_floor = self._to_decimal(moq_floor)
        final_quantity = self._to_decimal(final_quantity)
        materially_inflated = False
        if final_quantity > policy_safe_quantity:
            if policy_safe_quantity <= 0:
                materially_inflated = final_quantity > 0 and moq_floor > 0
            else:
                materially_inflated = (
                    final_quantity >= (policy_safe_quantity * Decimal("1.50")).quantize(
                        Decimal("0.01")
                    )
                    or (final_quantity - policy_safe_quantity) >= Decimal("1.00")
                )

        return {
            "moq_review_required": materially_inflated,
            "policy_review_warnings": (
                ["configured MOQ materially exceeds sparse policy-safe quantity"]
                if materially_inflated
                else []
            ),
        }

    def _build_intermittent_low_turn_decision(
        self,
        *,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        trigger_quantity = self._to_decimal(demand_context.get("next_event_demand"))
        sparsity_context = self._assess_demand_sparsity(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            demand_context=demand_context,
        )
        reorder_method = "sparse_event_replenishment"
        coverage_days = int(demand_context.get("uncapped_coverage_days") or 0)

        if trigger_quantity <= 0:
            return {
                **self._zero_policy_quantities(reorder_method),
                "reserve_type": "sparse_event_guard",
                "coverage_days": coverage_days,
                "coverage_capped_by_shelf_life": False,
                "demand_sparsity_classification": sparsity_context[
                    "sparsity_classification"
                ],
                "event_spacing_days": sparsity_context["event_spacing_days"],
                "days_until_next_event": sparsity_context["days_until_next_event"],
            }

        sparse_guard_quantity = self._compute_sparse_guard_quantity(
            demand_context=demand_context,
            sparsity_context=sparsity_context,
        )
        inventory_position = inventory_position_context["inventory_position"]
        target_stock = (trigger_quantity + sparse_guard_quantity).quantize(
            Decimal("0.01")
        )
        raw_order_quantity = max(
            target_stock - inventory_position,
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))

        return {
            "reorder_point": trigger_quantity,
            "reorder_target": target_stock,
            "raw_order_quantity": raw_order_quantity,
            "policy_capped_quantity": raw_order_quantity,
            "policy_safe_quantity": raw_order_quantity,
            "policy_buffer_quantity": sparse_guard_quantity,
            "safety_stock": Decimal("0.00"),
            "trigger_met": raw_order_quantity > 0,
            "reorder_method": reorder_method,
            "reserve_type": "sparse_event_guard",
            "coverage_days": coverage_days,
            "coverage_capped_by_shelf_life": False,
            "demand_sparsity_classification": sparsity_context[
                "sparsity_classification"
            ],
            "event_spacing_days": sparsity_context["event_spacing_days"],
            "days_until_next_event": sparsity_context["days_until_next_event"],
        }

    async def _dispatch_policy_quantities(
        self,
        *,
        ingredient_id: int,
        policy_type: str,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        service_level_z: Decimal,
        supplier: Optional[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        if policy_type == "fresh_perishable":
            return self._build_fresh_perishable_decision(
                demand_context=demand_context,
                daily_forecast=daily_forecast,
                inventory_position_context=inventory_position_context,
                supplier=supplier,
                as_of_date=as_of_date,
            )
        if policy_type == "stable_stocked":
            return await self._build_stable_stocked_decision(
                ingredient_id=ingredient_id,
                demand_context=demand_context,
                inventory_position_context=inventory_position_context,
                service_level_z=service_level_z,
            )
        if policy_type == "recipe_dependent":
            return await self._build_recipe_dependent_decision(
                ingredient_id=ingredient_id,
                demand_context=demand_context,
                inventory_position_context=inventory_position_context,
            )
        if policy_type == "intermittent_low_turn":
            return self._build_intermittent_low_turn_decision(
                demand_context=demand_context,
                daily_forecast=daily_forecast,
                inventory_position_context=inventory_position_context,
                as_of_date=as_of_date,
            )

        safety_stock = await self._compute_stable_safety_stock(
            ingredient_id=ingredient_id,
            lead_time=int(demand_context.get("effective_lead_days") or 0),
            service_level_z=service_level_z,
        )
        raise ValueError(f"unsupported replenishment policy_type: {policy_type}")

    async def _get_abc_context(self, ingredient_id: int) -> Dict[str, Any]:
        cached = self._abc_cache.get(ingredient_id)
        if cached:
            return {"abc_class": cached, "used_default": False}

        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        abc_class = (getattr(ingredient, "abc_class", None) or "C").upper()
        self._abc_cache[ingredient_id] = abc_class
        return {
            "abc_class": abc_class,
            "used_default": getattr(ingredient, "abc_class", None) in (None, ""),
        }

    async def choose_supplier_option(
        self,
        suppliers: List[Any],
        *,
        as_of_date: Optional[date] = None,
    ) -> Optional[Dict[str, Any]]:
        if not suppliers:
            return None

        supplier_contexts = [
            (supplier, self._resolve_supplier_cadence_context(supplier, as_of_date=as_of_date))
            for supplier in suppliers
        ]
        preferred_suppliers = [item for item in supplier_contexts if bool(getattr(item[0], "preferred", False))]
        candidate_pool = preferred_suppliers or supplier_contexts
        candidate_scope = "preferred" if preferred_suppliers else "fallback"
        use_cadence = any(context[1]["explicit_cadence"] for context in candidate_pool)

        def sort_key(item: Any) -> Any:
            supplier, cadence_context = item
            priority = self._normalize_priority(getattr(supplier, "supplier_priority", None))
            if use_cadence:
                return (
                    cadence_context["next_delivery_date"] or date.max,
                    cadence_context["next_order_date"] or date.max,
                    priority is None,
                    priority if priority is not None else float("inf"),
                )
            return (
                priority is None,
                priority if priority is not None else float("inf"),
            )

        selected_supplier, cadence_context = min(candidate_pool, key=sort_key)
        reason_code = (
            f"{candidate_scope}_best_cadence"
            if use_cadence
            else f"{candidate_scope}_lowest_priority"
        )

        return {
            "supplier": selected_supplier,
            "cadence_context": cadence_context,
            "reason_code": reason_code,
            "preferred_supplier_available": bool(preferred_suppliers),
            "selected_supplier_priority": self._normalize_priority(
                getattr(selected_supplier, "supplier_priority", None)
            ),
            "selected_supplier_preferred": bool(getattr(selected_supplier, "preferred", False)),
            "pricing_available": getattr(selected_supplier, "cost_per_unit", None) is not None,
        }

    async def build_reorder_decision(
        self,
        *,
        ingredient_id: int,
        unit: str,
        lead_time: int,
        daily_forecast: Optional[List[Any]] = None,
        supplier: Optional[Any] = None,
        as_of_date: Optional[date] = None,
        shelf_life_days: Optional[int] = None,
        current_stock: Optional[Decimal] = None,
        current_unit: Optional[str] = None,
        moq: Optional[Decimal] = None,
        manage_alerts: bool = True,
    ) -> Dict[str, Any]:
        abc_context = await self._get_abc_context(ingredient_id)
        abc_class = abc_context["abc_class"]
        if daily_forecast is None:
            raise ValueError("daily_forecast is required for reorder decisions")
        daily_forecast = daily_forecast or []

        if current_stock is None or current_unit is None:
            current_stock, current_unit = await self.stats_service.get_current_inventory(
                ingredient_id
            )
        current_stock = self._to_decimal(current_stock)
        current_unit = current_unit or unit or ""
        total_stock = current_stock
        excluded_expiring_stock = Decimal("0.00")
        usable_until_date = None
        inventory_source = "inventory_summary"
        inventory_conversion_fallback = False

        if moq is None:
            moq = await self.stats_service.get_moq(ingredient_id)
        moq = self._to_decimal(moq)

        anchor_date = as_of_date or date.today()
        normalized_shelf_life_days = (
            max(int(shelf_life_days), 0) if shelf_life_days is not None else None
        )
        policy_context = await self._resolve_policy_context(
            ingredient_id,
            shelf_life_days=normalized_shelf_life_days,
        )
        demand_context = await self._build_demand_context(
            ingredient_id=ingredient_id,
            daily_forecast=daily_forecast,
            supplier=supplier,
            as_of_date=anchor_date,
            lead_time=lead_time,
            shelf_life_days=normalized_shelf_life_days,
            current_unit=current_unit,
            current_stock=current_stock,
        )
        cadence_context = demand_context["cadence_context"]
        effective_lead_days = demand_context["effective_lead_days"]
        lead_demand = demand_context["lead_demand"]
        shelf_demand = demand_context["shelf_demand"]
        total_demand = demand_context["total_demand"]
        coverage_days = demand_context["coverage_days"]
        uncapped_coverage_days = demand_context["uncapped_coverage_days"]
        coverage_capped_by_shelf_life = demand_context["coverage_capped_by_shelf_life"]
        usable_until_date = demand_context["usable_until_date"]
        current_stock = demand_context["current_stock"]
        current_unit = demand_context["current_unit"]
        total_stock = demand_context["total_stock"]
        excluded_expiring_stock = demand_context["excluded_expiring_stock"]
        inventory_source = demand_context["inventory_source"]
        inventory_conversion_fallback = demand_context["inventory_conversion_fallback"]
        inventory_position_context = self._build_inventory_position_context(
            demand_context=demand_context,
        )

        service_level_z = policy_context["service_level_z"]
        policy_quantities = await self._dispatch_policy_quantities(
            ingredient_id=ingredient_id,
            policy_type=policy_context["policy_type"],
            demand_context=demand_context,
            daily_forecast=daily_forecast,
            inventory_position_context=inventory_position_context,
            service_level_z=service_level_z,
            supplier=supplier,
            as_of_date=anchor_date,
        )

        reorder_point = policy_quantities["reorder_point"]
        reorder_target = policy_quantities["reorder_target"]
        raw_order_quantity = self._to_decimal(
            policy_quantities.get(
                "raw_order_quantity",
                max(
                    reorder_target - inventory_position_context["inventory_position"],
                    Decimal("0.00"),
                ),
            )
        )
        policy_capped_quantity = self._to_decimal(
            policy_quantities.get("policy_capped_quantity", raw_order_quantity)
        )
        policy_safe_quantity = self._to_decimal(
            policy_quantities.get("policy_safe_quantity", policy_capped_quantity)
        )
        safety_stock = self._to_decimal(
            policy_quantities.get(
                "safety_stock",
                policy_quantities.get("policy_buffer_quantity"),
            )
        )
        inventory_position = inventory_position_context["inventory_position"]
        max_allowed = await self.calculate_max_order(ingredient_id, current_stock)
        policy_safe_quantity = min(policy_safe_quantity, max_allowed).quantize(
            Decimal("0.01")
        )
        buffered_quantity = min(policy_capped_quantity, max_allowed).quantize(
            Decimal("0.01")
        )
        moq_floor = (
            moq.quantize(Decimal("0.01"))
            if reorder_target > 0
            else Decimal("0.00")
        )
        if policy_context["policy_type"] == "fresh_perishable":
            proposed_quantity = policy_safe_quantity
            final_quantity = max(policy_safe_quantity, Decimal("0.00")).quantize(
                Decimal("0.01")
            )
        else:
            proposed_quantity = max(buffered_quantity, moq_floor)
            final_quantity = min(proposed_quantity, max_allowed)
            final_quantity = max(final_quantity, Decimal("0.00")).quantize(
                Decimal("0.01")
            )
        intermittent_review_flags = (
            self._build_intermittent_review_flags(
                policy_safe_quantity=policy_safe_quantity,
                moq_floor=moq_floor,
                final_quantity=final_quantity,
            )
            if policy_context["policy_type"] == "intermittent_low_turn"
            else {"moq_review_required": False, "policy_review_warnings": []}
        )
        trigger_met = bool(
            policy_quantities.get("trigger_met", inventory_position < reorder_point)
        )
        should_reorder = reorder_target > 0 and trigger_met and final_quantity > 0
        coverage_days = int(policy_quantities.get("coverage_days", coverage_days) or 0)
        coverage_capped_by_shelf_life = bool(
            policy_quantities.get(
                "coverage_capped_by_shelf_life",
                coverage_capped_by_shelf_life,
            )
        )

        logger.debug(
            "[REORDER] Decision ingredient=%s policy=%s abc=%s current=%s%s inventory_position=%s lead_demand=%s shelf_demand=%s reserve=%s moq=%s proposed=%s max_allowed=%s final=%s",
            ingredient_id,
            policy_context["policy_type"],
            abc_class,
            current_stock,
            current_unit,
            inventory_position,
            lead_demand,
            shelf_demand,
            safety_stock,
            moq,
            proposed_quantity,
            max_allowed,
            final_quantity,
        )

        if manage_alerts:
            if not should_reorder:
                await self.alert_repo.resolve_open_low_stock_alerts(ingredient_id)
            else:
                await self.create_low_stock_alert(ingredient_id, current_stock, reorder_point)

        return {
            "ingredient_id": ingredient_id,
            "unit": unit,
            "current_stock": current_stock,
            "total_stock": total_stock,
            "excluded_expiring_stock": excluded_expiring_stock,
            "current_unit": current_unit,
            "lead_demand": lead_demand.quantize(Decimal("0.01")),
            "shelf_demand": shelf_demand.quantize(Decimal("0.01")),
            "total_demand": total_demand.quantize(Decimal("0.01")),
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "reorder_target": reorder_target,
            "raw_order_quantity": raw_order_quantity,
            "buffered_quantity": buffered_quantity,
            "moq": moq,
            "moq_floor": moq_floor,
            "max_allowed": max_allowed,
            "final_quantity": final_quantity,
            "should_reorder": should_reorder,
            "skip_reason": (
                None
                if should_reorder
                else (
                    "no_forecast_demand"
                    if reorder_target <= 0
                    else (
                        "inventory_position_at_or_above_target_stock"
                        if policy_context["policy_type"] in {
                            "fresh_perishable",
                            "recipe_dependent",
                            "intermittent_low_turn",
                        }
                        else "stock_at_or_above_reorder_point"
                    )
                )
            ),
            "service_level_z": service_level_z,
            "abc_class": abc_class,
            "abc_multiplier": None,
            "abc_defaulted": abc_context["used_default"],
            "demand_source": demand_context["demand_source"],
            "reorder_method": policy_quantities["reorder_method"],
            "policy_buffer_quantity": policy_quantities["policy_buffer_quantity"],
            "reserve_type": policy_quantities.get("reserve_type"),
            "policy_type": policy_context["policy_type"] if policy_context else None,
            "policy_assignment_mode": (
                policy_context["policy_assignment_mode"] if policy_context else None
            ),
            "target_service_level": (
                policy_context["target_service_level"] if policy_context else None
            ),
            "service_level_source": (
                policy_context["service_level_source"] if policy_context else None
            ),
            "policy_override_reason": (
                policy_context["policy_override_reason"] if policy_context else None
            ),
            "policy_inferred": policy_context["policy_inferred"] if policy_context else False,
            "effective_lead_days": effective_lead_days,
            "coverage_days": coverage_days,
            "uncapped_coverage_days": uncapped_coverage_days,
            "coverage_capped_by_shelf_life": coverage_capped_by_shelf_life,
            "demand_event_count": demand_context["demand_event_count"],
            "next_event_demand": demand_context["next_event_demand"],
            "inventory_position": inventory_position,
            "inbound_quantity": inventory_position_context["inbound_quantity"],
            "backorder_quantity": inventory_position_context["backorder_quantity"],
            "inbound_quantity_assumed_zero": inventory_position_context[
                "inbound_quantity_assumed_zero"
            ],
            "backorder_quantity_assumed_zero": inventory_position_context[
                "backorder_quantity_assumed_zero"
            ],
            "assumption_warnings": inventory_position_context["assumption_warnings"],
            "policy_safe_quantity": policy_safe_quantity,
            "spoilage_cap_quantity": policy_quantities.get("spoilage_cap_quantity"),
            "usable_window_days": policy_quantities.get("usable_window_days"),
            "forecast_use": policy_quantities.get("forecast_use"),
            "net_requirement_quantity": policy_quantities.get("net_requirement_quantity"),
            "recipe_dependency_mode": policy_quantities.get("recipe_dependency_mode"),
            "recipe_count": policy_quantities.get("recipe_count"),
            "batch_recipe_count": policy_quantities.get("batch_recipe_count"),
            "menu_item_count": policy_quantities.get("menu_item_count"),
            "menu_guard_quantity": policy_quantities.get("menu_guard_quantity"),
            "batch_guard_quantity": policy_quantities.get("batch_guard_quantity"),
            "demand_sparsity_classification": policy_quantities.get(
                "demand_sparsity_classification"
            ),
            "event_spacing_days": policy_quantities.get("event_spacing_days") or [],
            "days_until_next_event": policy_quantities.get("days_until_next_event"),
            "moq_review_required": intermittent_review_flags["moq_review_required"],
            "policy_review_warnings": intermittent_review_flags[
                "policy_review_warnings"
            ],
            "usable_until_date": usable_until_date,
            "inventory_source": inventory_source,
            "inventory_conversion_fallback": inventory_conversion_fallback,
            "next_order_date": cadence_context["next_order_date"] if cadence_context else None,
            "next_delivery_date": cadence_context["next_delivery_date"] if cadence_context else None,
            "days_until_next_order": (
                cadence_context["days_until_next_order"] if cadence_context else None
            ),
            "review_period_days": (
                cadence_context["review_period_days"] if cadence_context else None
            ),
            "protection_window_days": (
                uncapped_coverage_days if cadence_context else None
            ),
            "order_schedule_type": (
                cadence_context["order_schedule_type"] if cadence_context else None
            ),
            "allowed_order_days": (
                cadence_context["allowed_order_days"] if cadence_context else []
            ),
            "allowed_delivery_days": (
                cadence_context["allowed_delivery_days"] if cadence_context else []
            ),
            "cadence_source": cadence_context["cadence_source"] if cadence_context else None,
            "cadence_confidence_score": (
                cadence_context["cadence_confidence_score"] if cadence_context else None
            ),
            "cadence_warnings": cadence_context["warnings"] if cadence_context else [],
        }

    def _build_policy_summary(
        self,
        *,
        decision: Dict[str, Any],
        supplier_name: str,
        inventory_unit: Optional[str],
        supplier_unit: str,
        packs_to_order: int,
        total_quantity_ordered: Decimal,
    ) -> str:
        policy_type = decision.get("policy_type")
        current_unit = decision["current_unit"] or inventory_unit or supplier_unit
        if policy_type == "fresh_perishable":
            summary = (
                f"Fresh-perishable ordering uses a shelf-life-capped window of {decision.get('usable_window_days') or 0} day(s). "
                f"Forecast use {decision.get('forecast_use') or Decimal('0.00')} plus small reserve {decision.get('policy_buffer_quantity') or Decimal('0.00')} "
                f"sets target stock {decision['reorder_target']}. Inventory position {decision.get('inventory_position') or Decimal('0.00')} "
                f"produced raw order {decision['raw_order_quantity']}; spoilage cap and max-stock safeguards reduced the spoilage-safe quantity to {decision.get('policy_safe_quantity') or Decimal('0.00')}. "
                f"Final pre-pack quantity is {decision['final_quantity']} {current_unit}, then {packs_to_order} pack(s) from {supplier_name} total {total_quantity_ordered} {supplier_unit}."
            )
            if (
                self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("policy_safe_quantity"))
                and self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("final_quantity"))
            ):
                summary += " Pack rounding pushes the ordered quantity above the spoilage-safe quantity."
            return summary

        if policy_type == "stable_stocked":
            comparison = (
                "is at or below"
                if decision.get("should_reorder")
                else "is above"
            )
            return (
                f"Stable-stocked ordering uses reorder point {decision['reorder_point']} from lead-time demand {decision['lead_demand']} plus safety stock {decision['safety_stock']}. "
                f"The protection window target is {decision['reorder_target']} over {decision.get('coverage_days') or decision.get('protection_window_days') or 0} day(s). "
                f"Inventory position {decision.get('inventory_position') or Decimal('0.00')} {comparison} the reorder point, so the final pre-pack quantity is {decision['final_quantity']} {current_unit}, then {packs_to_order} pack(s) from {supplier_name}."
            )

        if policy_type == "recipe_dependent":
            summary = (
                f"Recipe-dependent ordering uses forecast-owned ingredient net requirement {decision.get('net_requirement_quantity') or Decimal('0.00')} "
                f"over {decision.get('coverage_days') or decision.get('protection_window_days') or 0} day(s). "
                f"Dependency mode {str(decision.get('recipe_dependency_mode') or 'unknown').replace('_', ' ')} adds guard {decision.get('policy_buffer_quantity') or Decimal('0.00')}, "
                f"setting target stock {decision['reorder_target']}. Inventory position {decision.get('inventory_position') or Decimal('0.00')} "
                f"produced policy-safe quantity {decision.get('policy_safe_quantity') or Decimal('0.00')}. Final pre-pack quantity is {decision['final_quantity']} {current_unit}, "
                f"then {packs_to_order} pack(s) from {supplier_name} total {total_quantity_ordered} {supplier_unit}."
            )
            if self._to_decimal(decision.get("final_quantity")) > self._to_decimal(
                decision.get("policy_safe_quantity")
            ):
                summary += " Configured MOQ increased the pre-pack quantity above the recipe policy-safe quantity."
            return summary

        if policy_type == "intermittent_low_turn":
            summary = (
                f"Intermittent low-turn ordering uses next sparse event {decision['reorder_point']} with sparse guard {decision.get('policy_buffer_quantity') or Decimal('0.00')}, "
                f"setting target stock {decision['reorder_target']}. Inventory position {decision.get('inventory_position') or Decimal('0.00')} "
                f"produced sparse policy-safe quantity {decision.get('policy_safe_quantity') or Decimal('0.00')}. Final pre-pack quantity is {decision['final_quantity']} {current_unit}, "
                f"then {packs_to_order} pack(s) from {supplier_name} total {total_quantity_ordered} {supplier_unit}."
            )
            if decision.get("moq_review_required"):
                summary += " Configured MOQ materially exceeds the sparse policy-safe quantity and should be reviewed."
            if (
                self._to_decimal(total_quantity_ordered)
                > self._to_decimal(decision.get("policy_safe_quantity"))
                and self._to_decimal(total_quantity_ordered)
                > self._to_decimal(decision.get("final_quantity"))
            ):
                summary += " Pack rounding pushes the ordered quantity further above the sparse policy-safe quantity."
            return summary

        reorder_method = str(decision.get("reorder_method") or "policy").replace("_", " ")
        demand_source = str(decision.get("demand_source") or "forecast").replace("_", " ")
        return (
            f"Suggested because stock {decision['current_stock']} {current_unit} is below reorder point {decision['reorder_point']}. "
            f"Raw reorder {decision['raw_order_quantity']} became {decision['final_quantity']} after {reorder_method} on {demand_source} demand, then {packs_to_order} packs from {supplier_name}."
        )

    def build_explanation_payload(
        self,
        *,
        decision: Dict[str, Any],
        supplier_selection: Dict[str, Any],
        supplier_name: str,
        inventory_unit: Optional[str],
        supplier_unit: str,
        converted_quantity_needed: Decimal,
        pack_size: int,
        quantity_per_pack_item: Decimal,
        packs_to_order: int,
        total_quantity_ordered: Decimal,
        assumption_flags: Dict[str, Any],
    ) -> Dict[str, Any]:
        quantity_per_pack = (Decimal(str(pack_size or 1)) * quantity_per_pack_item).quantize(
            Decimal("0.01")
        )
        warning_list = list(decision.get("cadence_warnings") or [])
        warning_list.extend(decision.get("assumption_warnings") or [])
        warning_list.extend(decision.get("policy_review_warnings") or [])
        if (
            decision.get("policy_type") == "fresh_perishable"
            and self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("policy_safe_quantity"))
            and self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("final_quantity"))
        ):
            warning_list.append("pack rounding exceeds spoilage-safe quantity")
        if (
            decision.get("policy_type") == "intermittent_low_turn"
            and self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("policy_safe_quantity"))
            and self._to_decimal(total_quantity_ordered) > self._to_decimal(decision.get("final_quantity"))
        ):
            warning_list.append("pack rounding exceeds sparse policy-safe quantity")
        next_delivery = self._normalize_date_value(decision.get("next_delivery_date"))
        cadence_summary = ""
        if decision.get("protection_window_days"):
            cadence_summary = (
                f" Coverage protects {decision.get('coverage_days') or decision.get('protection_window_days')} day(s)"
                f" with next delivery on {next_delivery.isoformat() if next_delivery else 'unscheduled'}"
                f" and {str(decision.get('order_schedule_type') or 'ad_hoc').replace('_', ' ')} cadence."
            )
        shelf_life_cap_summary = ""
        if decision.get("coverage_capped_by_shelf_life"):
            shelf_life_cap_summary = " Coverage was capped by shelf life before sizing the order."
        usable_stock_summary = ""
        usable_until = self._normalize_date_value(decision.get("usable_until_date"))
        if self._to_float(decision.get("excluded_expiring_stock")):
            usable_stock_summary = (
                f" {self._to_float(decision.get('excluded_expiring_stock')):.2f} stock was excluded because it expires before "
                f"{usable_until.isoformat() if usable_until else 'the replenishment window'}"
                "."
            )
        summary = self._build_policy_summary(
            decision=decision,
            supplier_name=supplier_name,
            inventory_unit=inventory_unit,
            supplier_unit=supplier_unit,
            packs_to_order=packs_to_order,
            total_quantity_ordered=total_quantity_ordered,
        )
        summary = f"{summary}{cadence_summary}{shelf_life_cap_summary}{usable_stock_summary}"

        return {
            "summary": summary,
            "why_reorder": {
                "current_stock": self._to_float(decision["current_stock"]),
                "total_stock": self._to_float(decision.get("total_stock")),
                "excluded_expiring_stock": self._to_float(
                    decision.get("excluded_expiring_stock")
                ),
                "usable_until_date": self._normalize_date_value(
                    decision.get("usable_until_date")
                ),
                "current_unit": decision["current_unit"] or inventory_unit or supplier_unit,
                "reorder_point": self._to_float(decision["reorder_point"]),
                "lead_demand": self._to_float(decision["lead_demand"]),
                "shelf_demand": self._to_float(decision["shelf_demand"]),
                "safety_stock": self._to_float(decision["safety_stock"]),
                "reorder_target": self._to_float(decision["reorder_target"]),
                "effective_lead_days": decision.get("effective_lead_days"),
                "coverage_days": decision.get("coverage_days"),
                "protection_window_days": decision.get("protection_window_days"),
            },
            "quantity_factors": {
                "raw_order_quantity": self._to_float(decision["raw_order_quantity"]),
                "buffered_quantity": self._to_float(decision["buffered_quantity"]),
                "final_quantity_before_pack_rounding": self._to_float(decision["final_quantity"]),
                "converted_quantity_needed": self._to_float(converted_quantity_needed),
                "pack_size": int(pack_size or 1),
                "quantity_per_pack_item": self._to_float(quantity_per_pack_item),
                "quantity_per_pack": self._to_float(quantity_per_pack),
                "packs_to_order": int(packs_to_order),
                "total_quantity_ordered": self._to_float(total_quantity_ordered),
                "inventory_unit": inventory_unit,
                "supplier_unit": supplier_unit,
            },
            "policy_factors": {
                "service_level_z": self._to_float(decision["service_level_z"]),
                "target_service_level": self._to_float(decision.get("target_service_level")),
                "service_level_source": decision.get("service_level_source"),
                "demand_source": decision.get("demand_source"),
                "reorder_method": decision.get("reorder_method"),
                "policy_type": decision.get("policy_type"),
                "policy_assignment_mode": decision.get("policy_assignment_mode"),
                "policy_buffer_quantity": self._to_float(
                    decision.get("policy_buffer_quantity")
                ),
                "abc_class": decision["abc_class"],
                "abc_multiplier": self._to_float(decision["abc_multiplier"]),
                "moq": self._to_float(decision["moq"]),
                "moq_floor": self._to_float(decision["moq_floor"]),
                "max_allowed": self._to_float(decision["max_allowed"]),
            },
            "supplier_factors": {
                "selected_supplier": supplier_name,
                "selection_rule": supplier_selection["reason_code"],
                "preferred_supplier_available": supplier_selection["preferred_supplier_available"],
                "selected_supplier_priority": supplier_selection["selected_supplier_priority"],
                "selected_supplier_preferred": supplier_selection["selected_supplier_preferred"],
                "pricing_available": supplier_selection["pricing_available"],
                "order_schedule_type": decision.get("order_schedule_type"),
                "review_period_days": decision.get("review_period_days"),
                "allowed_order_days": decision.get("allowed_order_days") or [],
                "allowed_delivery_days": decision.get("allowed_delivery_days") or [],
                "next_order_date": self._normalize_date_value(decision.get("next_order_date")),
                "next_delivery_date": self._normalize_date_value(decision.get("next_delivery_date")),
                "cadence_source": decision.get("cadence_source"),
                "cadence_confidence_score": decision.get("cadence_confidence_score"),
            },
            "assumption_flags": {
                **assumption_flags,
                "abc_defaulted": decision["abc_defaulted"],
                "policy_inferred": decision.get("policy_inferred", False),
                "coverage_capped_by_shelf_life": decision.get(
                    "coverage_capped_by_shelf_life", False
                ),
                "service_level_source": decision.get("service_level_source"),
                "usable_stock_applied": decision.get("usable_until_date") is not None,
                "inventory_source": decision.get("inventory_source") or assumption_flags.get(
                    "inventory_source"
                ),
                "inventory_conversion_fallback": decision.get(
                    "inventory_conversion_fallback", False
                ),
                "cadence_warnings": warning_list,
            },
        }

    @log_method("Reorder: Safety Stock")
    async def calculate_safety_stock(
        self,
        ingredient_id: int,
        lead_time: int,
        service_level_z: Decimal,
    ) -> Decimal:
        """
        Calculate the safety stock for an ingredient based on its standard deviation of usage and lead time.

        Args:
            ingredient_id (int): ID of the ingredient.
            lead_time (int): Lead time in days for ordering the ingredient.

        Returns:
            Decimal: The calculated safety stock rounded to two decimal places.
        """
        if lead_time <= 0:
            return Decimal("0.00")
        stddev_usage = await self.stats_service.get_std_dev_usage(ingredient_id)
        safety_stock = (
            service_level_z * stddev_usage * Decimal(math.sqrt(lead_time))
        )
        safety_stock = safety_stock.quantize(Decimal("0.01"))
        logger.debug(
            f"[REORDER] SafetyStock ingredient={ingredient_id} stddev={stddev_usage} lead_time={lead_time} value={safety_stock}"
        )
        return safety_stock

    @log_method("Reorder: Max Order")
    async def calculate_max_order(
        self, ingredient_id: int, current_stock: Decimal
    ) -> Decimal:
        """
        Calculate the maximum allowable order quantity for an ingredient based on its max stock level and current stock.

        Args:
            ingredient_id (int): ID of the ingredient.
            current_stock (Decimal): Current inventory level of the ingredient.

        Returns:
            Decimal: The maximum allowable order quantity.
        """
        max_stock = await self.stats_service.get_max_stock_level(ingredient_id)
        if max_stock is not None:
            max_allowed = max_stock - current_stock
            max_allowed = max(max_allowed, Decimal(0))
            logger.debug(
                f"[REORDER] MaxOrder ingredient={ingredient_id} max_stock={max_stock} current={current_stock} allowed={max_allowed}"
            )
            return max_allowed
        logger.debug(f"[REORDER] MaxOrder ingredient={ingredient_id} no_limit")
        return Decimal("Infinity")

    @log_method("Reorder: Classify Single ABC")
    async def classify_abc_item(self, ingredient_id: int) -> str:
        """
        Classify an ingredient into an ABC category based on its usage and cost.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            str: The ABC classification ('A', 'B', or 'C') of the ingredient.
        """
        context = await self._get_abc_context(ingredient_id)
        abc = context["abc_class"]
        logger.debug(
            f"[REORDER] ABC DB ingredient={ingredient_id} class={abc}"
        )
        return abc

    @log_method("Reorder: Classify All ABC")
    async def classify_all_ingredients(self, days: int = 90):
        """
        Automatically classify all ingredients based on their consumption value (usage * cost)
        over the past `days`. Updates the ABC classification in the ingredients table.

        Args:
            days (int, optional): Number of days to consider for classification. Defaults to 90.
        """
        ingredients = await self.ingredient_repo.get_all()
        usage_data = []

        self._abc_cache = {}

        for ingredient in ingredients:
            usage = await self.stats_service.get_total_usage_last_n_days(
                ingredient.ingredient_id, days
            )
            supplier = await self.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier(
                ingredient.ingredient_id
            )
            cost_value = supplier.cost_per_unit if supplier else None
            cost = Decimal(cost_value or 0)
            value = usage * cost
            usage_data.append((ingredient.ingredient_id, value, ingredient.abc_class))

        if not usage_data:
            logger.info("[REORDER] ABC classify none_found")
            return

        usage_data.sort(key=lambda x: x[1], reverse=True)
        total_value = sum(v for _, v, _ in usage_data)
        if total_value == 0:
            logger.info(
                f"[REORDER] ABC classify zero_total_value days={days} default_all=C"
            )

        cumulative = Decimal("0")

        for ingredient_id, value, current_class in usage_data:
            cumulative += value
            pct = (cumulative / total_value * Decimal("100")) if total_value else Decimal("100")
            if pct <= Decimal("70"):
                abc = "A"
            elif pct <= Decimal("90"):
                abc = "B"
            else:
                abc = "C"

            self._abc_cache[ingredient_id] = abc

            if current_class != abc:
                await self.ingredient_repo.update(ingredient_id, {"abc_class": abc})
                logger.debug(
                    f"[REORDER] ABC update ingredient={ingredient_id} from={current_class} to={abc} value={value} pct={pct}"
                )
            else:
                logger.debug(
                    f"[REORDER] ABC unchanged ingredient={ingredient_id} class={abc} value={value} pct={pct}"
                )

    @log_method("Reorder: Low Stock Alert")
    async def create_low_stock_alert(self, ingredient_id: int, current_stock: Decimal, reorder_point: Decimal):
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        message = (
            f"Low stock alert: '{ingredient.name}' stock is at {current_stock} "
            f"which is below the reorder point ({reorder_point})."
        )
        alert_meta = {
            "ingredient_id": ingredient_id,
            "current_stock": float(current_stock),
            "reorder_point": float(reorder_point),
        }
        existing_alert = await self.alert_repo.get_open_low_stock_alert(ingredient_id)
        if existing_alert:
            await self.alert_repo.update(
                existing_alert.alert_id,
                {
                    "message": message,
                    "meta": alert_meta,
                },
            )
            logger.info(
                f"[REORDER] AlertUpdated ingredient={ingredient_id} current={current_stock} reorder_point={reorder_point}"
            )
            return

        alert_data = {
            "restaurant_id": self.restaurant_id,
            "employee_id": None,  # system-generated
            "role": "system",
            "alert_type": "LowStock",
            "message": message,
            "status": "Active",
            "is_acknowledged": 0,
            "severity": "warning",
            "meta": alert_meta,
        }
        await self.alert_repo.create(alert_data)
        logger.info(f"[REORDER] AlertCreated ingredient={ingredient_id} current={current_stock} reorder_point={reorder_point}")
