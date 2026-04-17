from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from app.services.reorder_forecast_engine import ReorderForecastEngine


class ReorderPolicyMathHelper:
    def __init__(self, engine: "ReorderForecastEngine"):
        self.engine = engine

    @staticmethod
    def zero_policy_quantities(reorder_method: str) -> Dict[str, Any]:
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

    def resolve_fresh_perishable_window(
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

    def compute_perishable_reserve(
        self,
        *,
        forecast_use: Decimal,
        usable_window_days: int,
    ) -> Decimal:
        forecast_use = self.engine._to_decimal(forecast_use)
        if forecast_use <= 0 or usable_window_days <= 0:
            return Decimal("0.00")
        average_daily_demand = (forecast_use / Decimal(str(usable_window_days))).quantize(
            Decimal("0.01")
        )
        return min(average_daily_demand, forecast_use).quantize(Decimal("0.01"))

    def resolve_fresh_spoilage_cap(
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
            self.engine._to_decimal(
                getattr(supplier, "spoilage_rate", None) if supplier is not None else None
            ),
            Decimal("0.00"),
        )
        base_freshness_buffer = Decimal("0.10")
        freshness_buffer = max(
            base_freshness_buffer - min(historical_spoilage_rate, base_freshness_buffer),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        shelf_life_demand = self.engine._sum_forecast_window(
            daily_forecast,
            start_date=as_of_date,
            window_days=int(effective_shelf_life_days),
        )
        return (shelf_life_demand * (Decimal("1.00") + freshness_buffer)).quantize(
            Decimal("0.01")
        )

    def build_fresh_perishable_decision(
        self,
        *,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        supplier: Optional[Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        usable_window_days = self.resolve_fresh_perishable_window(
            demand_context=demand_context,
        )
        if usable_window_days <= 0:
            return {
                **self.zero_policy_quantities("perishable_window"),
                "usable_window_days": usable_window_days,
                "spoilage_cap_quantity": Decimal("0.00"),
                "reserve_type": "perishable_reserve",
            }

        forecast_use = self.engine._sum_forecast_window(
            daily_forecast,
            start_date=as_of_date,
            window_days=usable_window_days,
        )
        perishable_reserve = self.compute_perishable_reserve(
            forecast_use=forecast_use,
            usable_window_days=usable_window_days,
        )
        inventory_position = inventory_position_context["inventory_position"]
        target_stock = (forecast_use + perishable_reserve).quantize(Decimal("0.01"))
        raw_order_quantity = max(
            target_stock - inventory_position,
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        spoilage_cap_quantity = self.resolve_fresh_spoilage_cap(
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

    async def compute_stable_safety_stock(
        self,
        *,
        ingredient_id: int,
        lead_time: int,
        service_level_z: Decimal,
    ) -> Decimal:
        return await self.engine.calculate_safety_stock(
            ingredient_id,
            lead_time,
            service_level_z=service_level_z,
        )

    async def build_stable_stocked_decision(
        self,
        *,
        ingredient_id: int,
        demand_context: Dict[str, Any],
        inventory_position_context: Dict[str, Any],
        service_level_z: Decimal,
    ) -> Dict[str, Any]:
        lead_demand = self.engine._to_decimal(demand_context.get("protection_lead_demand"))
        protection_window_demand = self.engine._to_decimal(
            demand_context.get("protection_total_demand")
        )
        if protection_window_demand <= 0:
            return self.zero_policy_quantities("continuous_review")

        safety_stock = await self.compute_stable_safety_stock(
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

    async def build_recipe_dependency_context(
        self,
        ingredient_id: int,
    ) -> Dict[str, Any]:
        recipe_links = await self.engine.recipe_ingredient_repo.get_all_by_reference_id_and_type(
            "ingredient",
            ingredient_id,
        )
        batch_links = await self.engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type(
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
            menu_links = await self.engine.menu_item_recipe_repo.get_by_recipe(recipe_id)
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

    def compute_recipe_requirement_guard(
        self,
        *,
        demand_context: Dict[str, Any],
        dependency_context: Dict[str, Any],
    ) -> Dict[str, Decimal]:
        average_daily_demand = self.engine._to_decimal(demand_context.get("average_daily_demand"))
        daily_peak_quantity = self.engine._to_decimal(demand_context.get("max_daily_demand"))
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

    async def build_recipe_dependent_decision(
        self,
        *,
        ingredient_id: int,
        demand_context: Dict[str, Any],
        inventory_position_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        dependency_context = await self.build_recipe_dependency_context(ingredient_id)
        net_requirement_quantity = self.engine._to_decimal(
            demand_context.get("protection_total_demand")
        )
        guard_context = self.compute_recipe_requirement_guard(
            demand_context=demand_context,
            dependency_context=dependency_context,
        )
        recipe_guard_quantity = guard_context["recipe_guard_quantity"]
        coverage_days = int(demand_context.get("uncapped_coverage_days") or 0)
        reorder_method = "recipe_net_requirement_order_up_to"

        if net_requirement_quantity <= 0:
            return {
                **self.zero_policy_quantities(reorder_method),
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

    def assess_demand_sparsity(
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
        forecast_points = self.engine._window_forecast_points(
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

    def compute_sparse_guard_quantity(
        self,
        *,
        demand_context: Dict[str, Any],
        sparsity_context: Dict[str, Any],
    ) -> Decimal:
        trigger_quantity = self.engine._to_decimal(demand_context.get("next_event_demand"))
        if trigger_quantity <= 0 or sparsity_context.get("event_count", 0) <= 1:
            return Decimal("0.00")

        average_daily_demand = self.engine._to_decimal(demand_context.get("average_daily_demand"))
        max_daily_demand = self.engine._to_decimal(demand_context.get("max_daily_demand"))
        peak_delta = max(max_daily_demand - trigger_quantity, Decimal("0.00"))
        return min(
            average_daily_demand,
            peak_delta if peak_delta > 0 else average_daily_demand,
        ).quantize(Decimal("0.01"))

    def build_intermittent_review_flags(
        self,
        *,
        policy_safe_quantity: Decimal,
        moq_floor: Decimal,
        final_quantity: Decimal,
    ) -> Dict[str, Any]:
        policy_safe_quantity = self.engine._to_decimal(policy_safe_quantity)
        moq_floor = self.engine._to_decimal(moq_floor)
        final_quantity = self.engine._to_decimal(final_quantity)
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

    def build_intermittent_low_turn_decision(
        self,
        *,
        demand_context: Dict[str, Any],
        daily_forecast: List[Any],
        inventory_position_context: Dict[str, Any],
        as_of_date: date,
    ) -> Dict[str, Any]:
        trigger_quantity = self.engine._to_decimal(demand_context.get("next_event_demand"))
        sparsity_context = self.assess_demand_sparsity(
            daily_forecast=daily_forecast,
            as_of_date=as_of_date,
            demand_context=demand_context,
        )
        reorder_method = "sparse_event_replenishment"
        coverage_days = int(demand_context.get("uncapped_coverage_days") or 0)

        if trigger_quantity <= 0:
            return {
                **self.zero_policy_quantities(reorder_method),
                "reserve_type": "sparse_event_guard",
                "coverage_days": coverage_days,
                "coverage_capped_by_shelf_life": False,
                "demand_sparsity_classification": sparsity_context[
                    "sparsity_classification"
                ],
                "event_spacing_days": sparsity_context["event_spacing_days"],
                "days_until_next_event": sparsity_context["days_until_next_event"],
            }

        sparse_guard_quantity = self.compute_sparse_guard_quantity(
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