from datetime import date
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
from app.services.reorder import (
    ReorderContextBuilder,
    ReorderPolicyBootstrapHelper,
    ReorderPolicyMathHelper,
)
from app.repositories.alerts_repo import AlertRepository
from app.core.logging import logger
from app.utils.logger_helpers import log_method
import math


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
        self.policy_bootstrap = ReorderPolicyBootstrapHelper(self)
        self.context_builder = ReorderContextBuilder(self)
        self.policy_math = ReorderPolicyMathHelper(self)

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
        return self.policy_bootstrap.has_complete_policy_config(ingredient)

    def _needs_policy_bootstrap(self, ingredient: Optional[Any]) -> bool:
        return self.policy_bootstrap.needs_policy_bootstrap(ingredient)

    def _resolve_bootstrap_shelf_life_days(
        self,
        *,
        inventory: Optional[Any],
        supplier: Optional[Any],
    ) -> Optional[int]:
        return self.policy_bootstrap.resolve_bootstrap_shelf_life_days(
            inventory=inventory,
            supplier=supplier,
        )

    def _ingredient_matches_any_hint(
        self,
        ingredient: Any,
        *,
        hints: tuple[str, ...],
    ) -> bool:
        return self.policy_bootstrap.ingredient_matches_any_hint(
            ingredient,
            hints=hints,
        )

    def _looks_clearly_perishable(
        self,
        ingredient: Any,
        *,
        shelf_life_days: Optional[int],
    ) -> bool:
        return self.policy_bootstrap.looks_clearly_perishable(
            ingredient,
            shelf_life_days=shelf_life_days,
        )

    def _looks_like_prep_component(self, ingredient: Any) -> bool:
        return self.policy_bootstrap.looks_like_prep_component(ingredient)

    def _assess_bootstrap_sparse_demand(
        self,
        *,
        daily_forecast: List[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        return self.policy_bootstrap.assess_bootstrap_sparse_demand(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
        )

    async def _infer_policy_type_for_bootstrap(
        self,
        *,
        ingredient: Any,
        ingredient_id: int,
        daily_forecast: List[Any],
        as_of_date: date,
        shelf_life_days: Optional[int],
    ) -> tuple[str, str]:
        return await self.policy_bootstrap.infer_policy_type_for_bootstrap(
            ingredient=ingredient,
            ingredient_id=ingredient_id,
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            shelf_life_days=shelf_life_days,
        )

    def _default_target_service_level_for_policy(self, policy_type: str) -> Decimal:
        return self.policy_bootstrap.default_target_service_level_for_policy(policy_type)

    def _build_policy_bootstrap_reason(
        self,
        *,
        policy_type: str,
        missing_policy_type: bool,
        missing_service_level: bool,
        inference_reason: Optional[str],
    ) -> str:
        return self.policy_bootstrap.build_policy_bootstrap_reason(
            policy_type=policy_type,
            missing_policy_type=missing_policy_type,
            missing_service_level=missing_service_level,
            inference_reason=inference_reason,
        )

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
        return await self.policy_bootstrap.build_bootstrap_policy_update(
            ingredient=ingredient,
            ingredient_id=ingredient_id,
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            suppliers=suppliers,
            inventory=inventory,
        )

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
        return await self.context_builder.resolve_policy_context(
            ingredient_id,
            shelf_life_days=shelf_life_days,
        )

    def _resolve_supplier_cadence_context(
        self,
        supplier: Any,
        *,
        as_of_date: Optional[date],
        default_lead_time_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        return self.context_builder.resolve_supplier_cadence_context(
            supplier,
            as_of_date=as_of_date,
            default_lead_time_days=default_lead_time_days,
        )

    def _sum_forecast_window(
        self,
        daily_forecast: List[Any],
        *,
        start_date: date,
        window_days: int,
    ) -> Decimal:
        return self.context_builder.sum_forecast_window(
            daily_forecast,
            start_date=start_date,
            window_days=window_days,
        )

    def _window_forecast_points(
        self,
        daily_forecast: List[Any],
        *,
        start_date: date,
        window_days: int,
    ) -> List[Any]:
        return self.context_builder.window_forecast_points(
            daily_forecast,
            start_date=start_date,
            window_days=window_days,
        )

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
        return await self.context_builder.build_demand_context(
            ingredient_id=ingredient_id,
            daily_forecast=daily_forecast,
            supplier=supplier,
            as_of_date=as_of_date,
            lead_time=lead_time,
            shelf_life_days=shelf_life_days,
            current_unit=current_unit,
            current_stock=current_stock,
        )

    def _build_inventory_position_context(
        self,
        *,
        demand_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        return self.context_builder.build_inventory_position_context(
            demand_context=demand_context,
        )

    @staticmethod
    def _zero_policy_quantities(reorder_method: str) -> Dict[str, Any]:
        return ReorderPolicyMathHelper.zero_policy_quantities(reorder_method)

    def _resolve_fresh_perishable_window(
        self,
        *,
        demand_context: Dict[str, Any],
    ) -> int:
        return self.policy_math.resolve_fresh_perishable_window(
            demand_context=demand_context,
        )

    def _compute_perishable_reserve(
        self,
        *,
        forecast_use: Decimal,
        usable_window_days: int,
    ) -> Decimal:
        return self.policy_math.compute_perishable_reserve(
            forecast_use=forecast_use,
            usable_window_days=usable_window_days,
        )

    def _resolve_fresh_spoilage_cap(
        self,
        *,
        daily_forecast: List[Any],
        effective_shelf_life_days: Optional[int],
        supplier: Optional[Any],
        as_of_date: date,
    ) -> Decimal:
        return self.policy_math.resolve_fresh_spoilage_cap(
            daily_forecast,
            effective_shelf_life_days=effective_shelf_life_days,
            supplier=supplier,
            as_of_date=as_of_date,
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
        return self.policy_math.build_fresh_perishable_decision(
            demand_context=demand_context,
            daily_forecast=daily_forecast,
            inventory_position_context=inventory_position_context,
            supplier=supplier,
            as_of_date=as_of_date,
        )

    async def _compute_stable_safety_stock(
        self,
        *,
        ingredient_id: int,
        lead_time: int,
        service_level_z: Decimal,
    ) -> Decimal:
        return await self.policy_math.compute_stable_safety_stock(
            ingredient_id=ingredient_id,
            lead_time=lead_time,
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
        return await self.policy_math.build_stable_stocked_decision(
            ingredient_id=ingredient_id,
            demand_context=demand_context,
            inventory_position_context=inventory_position_context,
            service_level_z=service_level_z,
        )

    async def _build_recipe_dependency_context(
        self,
        ingredient_id: int,
    ) -> Dict[str, Any]:
        return await self.policy_math.build_recipe_dependency_context(ingredient_id)

    def _compute_recipe_requirement_guard(
        self,
        *,
        demand_context: Dict[str, Any],
        dependency_context: Dict[str, Any],
    ) -> Dict[str, Decimal]:
        return self.policy_math.compute_recipe_requirement_guard(
            demand_context=demand_context,
            dependency_context=dependency_context,
        )

    async def _build_recipe_dependent_decision(
        self,
        *,
        ingredient_id: int,
        demand_context: Dict[str, Any],
        inventory_position_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        return await self.policy_math.build_recipe_dependent_decision(
            ingredient_id=ingredient_id,
            demand_context=demand_context,
            inventory_position_context=inventory_position_context,
        )

    def _assess_demand_sparsity(
        self,
        *,
        daily_forecast: List[Any],
        as_of_date: date,
        demand_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        return self.policy_math.assess_demand_sparsity(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            demand_context=demand_context,
        )

    def _compute_sparse_guard_quantity(
        self,
        *,
        demand_context: Dict[str, Any],
        sparsity_context: Dict[str, Any],
    ) -> Decimal:
        return self.policy_math.compute_sparse_guard_quantity(
            demand_context=demand_context,
            sparsity_context=sparsity_context,
        )

    def _build_intermittent_review_flags(
        self,
        *,
        policy_safe_quantity: Decimal,
        moq_floor: Decimal,
        final_quantity: Decimal,
    ) -> Dict[str, Any]:
        return self.policy_math.build_intermittent_review_flags(
            policy_safe_quantity=policy_safe_quantity,
            moq_floor=moq_floor,
            final_quantity=final_quantity,
        )

    def _build_intermittent_low_turn_decision(
        self,
        *,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        return self.policy_math.build_intermittent_low_turn_decision(
            demand_context=demand_context,
            daily_forecast=daily_forecast,
            inventory_position_context=inventory_position_context,
            as_of_date=as_of_date,
        )

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
        return await self.context_builder.choose_supplier_option(
            suppliers,
            as_of_date=as_of_date,
        )

    def _build_stock_position_cap_context(
        self,
        *,
        inventory_position: Decimal,
        lead_demand: Decimal,
        capped_tail_demand: Decimal,
        safety_stock: Decimal,
        max_allowed: Decimal,
    ) -> Dict[str, Decimal]:
        max_target_stock = (
            self._to_decimal(lead_demand)
            + self._to_decimal(safety_stock)
            + self._to_decimal(capped_tail_demand)
        ).quantize(Decimal("0.01"))
        max_order_cap = max(
            max_target_stock - self._to_decimal(inventory_position),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        effective_constraint_cap = min(max_order_cap, max_allowed).quantize(
            Decimal("0.01")
        )
        return {
            "max_target_stock": max_target_stock,
            "max_order_cap": max_order_cap,
            "effective_constraint_cap": effective_constraint_cap,
        }

    def _build_moq_review_context(
        self,
        *,
        policy_type: str,
        policy_safe_quantity: Decimal,
        moq_floor: Decimal,
        effective_constraint_cap: Decimal,
        final_quantity: Decimal,
    ) -> Dict[str, Any]:
        cap_warning = None
        if policy_type == "fresh_perishable":
            if moq_floor > self._to_decimal(policy_safe_quantity):
                cap_warning = "configured MOQ exceeds waste-safe cap; review required"
        elif moq_floor > self._to_decimal(effective_constraint_cap):
            cap_warning = "configured MOQ exceeds stock-position cap; review required"

        moq_review_required = bool(cap_warning)
        policy_review_warnings = [cap_warning] if cap_warning else []

        if policy_type == "intermittent_low_turn":
            intermittent_review_flags = self._build_intermittent_review_flags(
                policy_safe_quantity=policy_safe_quantity,
                moq_floor=moq_floor,
                final_quantity=final_quantity,
            )
            moq_review_required = (
                moq_review_required or intermittent_review_flags["moq_review_required"]
            )
            for warning in intermittent_review_flags["policy_review_warnings"]:
                if warning not in policy_review_warnings:
                    policy_review_warnings.append(warning)

        return {
            "moq_review_required": moq_review_required,
            "policy_review_warnings": policy_review_warnings,
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
        projected_waste_quantity = Decimal("0.00")
        usable_until_date = None
        inventory_source = "inventory_summary"
        inventory_conversion_fallback = False
        fefo_applied = False
        lot_projection_summary: List[Dict[str, Any]] = []

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
        capped_tail_demand = self._to_decimal(
            demand_context.get("capped_tail_demand", shelf_demand)
        )
        total_demand = demand_context["total_demand"]
        coverage_days = demand_context["coverage_days"]
        uncapped_coverage_days = demand_context["uncapped_coverage_days"]
        coverage_capped_by_shelf_life = demand_context["coverage_capped_by_shelf_life"]
        usable_until_date = demand_context["usable_until_date"]
        current_stock = demand_context["current_stock"]
        current_unit = demand_context["current_unit"]
        total_stock = demand_context["total_stock"]
        excluded_expiring_stock = demand_context["excluded_expiring_stock"]
        projected_waste_quantity = demand_context.get(
            "projected_waste_quantity",
            excluded_expiring_stock,
        )
        inventory_source = demand_context["inventory_source"]
        inventory_conversion_fallback = demand_context["inventory_conversion_fallback"]
        fefo_applied = bool(demand_context.get("fefo_applied"))
        lot_projection_summary = demand_context.get("lot_projection_summary") or []
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
        cap_context = self._build_stock_position_cap_context(
            inventory_position=inventory_position,
            lead_demand=lead_demand,
            capped_tail_demand=capped_tail_demand,
            safety_stock=safety_stock,
            max_allowed=max_allowed,
        )
        max_target_stock = cap_context["max_target_stock"]
        max_order_cap = cap_context["max_order_cap"]
        effective_constraint_cap = cap_context["effective_constraint_cap"]
        policy_safe_quantity = min(
            policy_safe_quantity,
            effective_constraint_cap,
        ).quantize(Decimal("0.01"))
        buffered_quantity = min(
            policy_capped_quantity,
            effective_constraint_cap,
        ).quantize(Decimal("0.01"))
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
            final_quantity = min(proposed_quantity, effective_constraint_cap)
            final_quantity = max(final_quantity, Decimal("0.00")).quantize(
                Decimal("0.01")
            )
        review_context = self._build_moq_review_context(
            policy_type=policy_context["policy_type"],
            policy_safe_quantity=policy_safe_quantity,
            moq_floor=moq_floor,
            effective_constraint_cap=effective_constraint_cap,
            final_quantity=final_quantity,
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
            "[REORDER] Decision ingredient=%s policy=%s abc=%s current=%s%s inventory_position=%s lead_demand=%s shelf_demand=%s reserve=%s moq=%s proposed=%s max_order_cap=%s max_allowed=%s final=%s",
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
            max_order_cap,
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
            "projected_waste_quantity": self._to_decimal(projected_waste_quantity),
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
            "max_target_stock": max_target_stock,
            "max_order_cap": max_order_cap,
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
            "moq_review_required": review_context["moq_review_required"],
            "review_required": review_context["moq_review_required"],
            "policy_review_warnings": review_context["policy_review_warnings"],
            "usable_until_date": usable_until_date,
            "fefo_applied": fefo_applied,
            "lot_projection_summary": lot_projection_summary,
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
                f"produced raw order {decision['raw_order_quantity']}; spoilage cap, stock-position cap, and max-stock safeguards reduced the spoilage-safe quantity to {decision.get('policy_safe_quantity') or Decimal('0.00')}. "
                f"Final pre-pack quantity is {decision['final_quantity']} {current_unit}, then {packs_to_order} pack(s) from {supplier_name} total {total_quantity_ordered} {supplier_unit}."
            )
            if decision.get("moq_review_required"):
                summary += " Configured MOQ exceeds the waste-safe cap and should be reviewed."
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
        projected_waste_quantity = self._to_float(
            decision.get("projected_waste_quantity", decision.get("excluded_expiring_stock"))
        )
        if projected_waste_quantity:
            if decision.get("fefo_applied"):
                usable_stock_summary = (
                    f" {projected_waste_quantity:.2f} stock is projected to expire before it can be consumed by "
                    f"{usable_until.isoformat() if usable_until else 'the demand window'} when FEFO lot consumption is applied"
                    "."
                )
            else:
                usable_stock_summary = (
                    f" {projected_waste_quantity:.2f} stock was excluded because it expires before "
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
                "projected_waste_quantity": projected_waste_quantity,
                "usable_until_date": self._normalize_date_value(
                    decision.get("usable_until_date")
                ),
                "fefo_applied": bool(decision.get("fefo_applied")),
                "current_unit": decision["current_unit"] or inventory_unit or supplier_unit,
                "reorder_point": self._to_float(decision["reorder_point"]),
                "lead_demand": self._to_float(decision["lead_demand"]),
                "shelf_demand": self._to_float(decision["shelf_demand"]),
                "safety_stock": self._to_float(decision["safety_stock"]),
                "reorder_target": self._to_float(decision["reorder_target"]),
                "max_target_stock": self._to_float(decision.get("max_target_stock")),
                "effective_lead_days": decision.get("effective_lead_days"),
                "coverage_days": decision.get("coverage_days"),
                "protection_window_days": decision.get("protection_window_days"),
            },
            "quantity_factors": {
                "raw_order_quantity": self._to_float(decision["raw_order_quantity"]),
                "buffered_quantity": self._to_float(decision["buffered_quantity"]),
                "policy_safe_quantity": self._to_float(decision.get("policy_safe_quantity")),
                "max_order_cap": self._to_float(decision.get("max_order_cap")),
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
                "review_required": decision.get("review_required", False),
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
