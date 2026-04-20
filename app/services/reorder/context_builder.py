from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from statistics import NormalDist
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from app.utils.replenishment_policy import resolve_cadence

if TYPE_CHECKING:
    from app.services.reorder_forecast_engine import ReorderForecastEngine


class ReorderContextBuilder:
    def __init__(self, engine: "ReorderForecastEngine"):
        self.engine = engine

    async def resolve_policy_context(
        self,
        ingredient_id: int,
        *,
        shelf_life_days: Optional[int],
    ) -> Dict[str, Any]:
        ingredient = await self.engine.ingredient_repo.get_by_id(ingredient_id)
        configured_policy = getattr(ingredient, "policy_type", None)
        policy_type = self.engine._normalize_policy_type_value(configured_policy)
        if not policy_type:
            raise ValueError(
                f"ingredient {ingredient_id} missing policy_type; configure an explicit replenishment policy"
            )

        policy_assignment_mode = self.engine._normalize_assignment_mode(
            getattr(ingredient, "policy_assignment_mode", None)
        )
        override_target_service_level = self.engine._normalize_floatlike(
            getattr(ingredient, "target_service_level", None)
        )
        override_service_level_z = self.engine._normalize_floatlike(
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

    def resolve_supplier_cadence_context(
        self,
        supplier: Any,
        *,
        as_of_date: Optional[date],
        default_lead_time_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        lead_time_days = self.engine._normalize_priority(getattr(supplier, "lead_time_days", None))
        if lead_time_days is None:
            lead_time_days = max(int(default_lead_time_days or 0), 0)

        review_period_days = self.engine._normalize_priority(
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
            "cadence_confidence_score": self.engine._normalize_floatlike(
                getattr(supplier, "cadence_confidence_score", None)
            ),
            "explicit_cadence": bool(
                review_period_days
                or order_schedule_type
                or allowed_order_days
                or allowed_delivery_days
            ),
        }

    def sum_forecast_window(
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
            normalized_day = self.engine._normalize_date_value(forecast_day)
            if normalized_day is None:
                continue
            if start_date <= normalized_day < end_date:
                total += self.engine._to_decimal(quantity)
        return total.quantize(Decimal("0.01"))

    def window_forecast_points(
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
            normalized_day = self.engine._normalize_date_value(forecast_day)
            if normalized_day is None:
                continue
            if start_date <= normalized_day < end_date:
                points.append((normalized_day, self.engine._to_decimal(quantity)))

        points.sort(key=lambda item: item[0])
        return points

    async def build_demand_context(
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
        cadence_context = self.resolve_supplier_cadence_context(
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
        lead_points = self.window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=lead_window_days,
        )
        protection_lead_points = self.window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=effective_lead_days,
        )
        coverage_points = self.window_forecast_points(
            daily_forecast,
            start_date=as_of_date,
            window_days=coverage_days,
        )
        protection_points = self.window_forecast_points(
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
        capped_tail_demand = shelf_demand
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

        projection_end_date = None
        if coverage_days > 0:
            projection_end_date = as_of_date + timedelta(days=coverage_days - 1)

        usable_until_date = projection_end_date or cadence_context["next_delivery_date"] or (
            as_of_date + timedelta(days=effective_lead_days)
        )
        usable_inventory = await self.engine.stats_service.get_usable_inventory(
            ingredient_id,
            usable_until_date=usable_until_date,
            daily_demand_points=coverage_points,
            projection_start_date=as_of_date if projection_end_date is not None else None,
        )
        usable_stock = self.engine._to_decimal(usable_inventory["quantity"])
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
            "capped_tail_demand": capped_tail_demand,
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
            "total_stock": self.engine._to_decimal(usable_inventory.get("total_quantity")),
            "excluded_expiring_stock": self.engine._to_decimal(
                usable_inventory.get("excluded_quantity")
            ),
            "projected_waste_quantity": self.engine._to_decimal(
                usable_inventory.get("projected_waste_quantity")
            ),
            "fefo_applied": bool(usable_inventory.get("fefo_applied")),
            "lot_projection_summary": usable_inventory.get("lot_projection_summary") or [],
            "inventory_source": usable_inventory.get("source") or "inventory_summary",
            "inventory_conversion_fallback": bool(
                usable_inventory.get("conversion_fallback")
            ),
            "fallback_stock": current_stock,
        }

    def build_inventory_position_context(
        self,
        *,
        demand_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        usable_stock = self.engine._to_decimal(demand_context.get("current_stock"))
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

    async def choose_supplier_option(
        self,
        suppliers: List[Any],
        *,
        as_of_date: Optional[date] = None,
    ) -> Optional[Dict[str, Any]]:
        if not suppliers:
            return None

        supplier_contexts = [
            (supplier, self.resolve_supplier_cadence_context(supplier, as_of_date=as_of_date))
            for supplier in suppliers
        ]
        preferred_suppliers = [
            item for item in supplier_contexts if bool(getattr(item[0], "preferred", False))
        ]
        candidate_pool = preferred_suppliers or supplier_contexts
        candidate_scope = "preferred" if preferred_suppliers else "fallback"
        use_cadence = any(context[1]["explicit_cadence"] for context in candidate_pool)

        def sort_key(item: Any) -> Any:
            supplier, cadence_context = item
            priority = self.engine._normalize_priority(
                getattr(supplier, "supplier_priority", None)
            )
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
            "selected_supplier_priority": self.engine._normalize_priority(
                getattr(selected_supplier, "supplier_priority", None)
            ),
            "selected_supplier_preferred": bool(getattr(selected_supplier, "preferred", False)),
            "pricing_available": getattr(selected_supplier, "cost_per_unit", None) is not None,
        }