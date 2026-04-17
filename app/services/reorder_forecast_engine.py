from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.services.inventory_stats_service import InventoryStatsService
from app.repositories.alerts_repo import AlertRepository
from app.core.logging import logger
from app.utils.logger_helpers import log_method
from app.utils.replenishment_policy import resolve_cadence
import math
from statistics import NormalDist


class ReorderForecastEngine:
    """
    Engine for calculating reorder points, safety stock, and suggested reorder quantities
    for ingredients based on inventory statistics and forecasting data.

    Attributes:
        SERVICE_LEVEL_Z (Decimal): Z-score used for a 95% service level in safety stock calculations.
    """

    SERVICE_LEVEL_Z = Decimal("1.65")  # Z-score for 95% service level
    ABC_MULTIPLIERS = {
        "A": Decimal("1.0"),
        "B": Decimal("1.1"),
        "C": Decimal("1.5"),
    }
    POLICY_SERVICE_LEVELS = {
        "fresh_perishable": Decimal("0.92"),
        "stable_stocked": Decimal("0.97"),
        "recipe_dependent": Decimal("0.95"),
        "intermittent_low_turn": Decimal("0.88"),
    }

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

    def _infer_policy_type(
        self,
        *,
        shelf_life_days: Optional[int],
        avg_daily_usage: Decimal,
    ) -> str:
        if shelf_life_days is not None and shelf_life_days <= 5:
            return "fresh_perishable"
        if avg_daily_usage <= Decimal("0.25"):
            return "intermittent_low_turn"
        return "stable_stocked"

    async def _resolve_policy_context(
        self,
        ingredient_id: int,
        *,
        shelf_life_days: Optional[int],
    ) -> Dict[str, Any]:
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        configured_policy = getattr(ingredient, "policy_type", None)
        avg_daily_usage = await self.stats_service.get_average_daily_usage(ingredient_id)
        policy_type = configured_policy or self._infer_policy_type(
            shelf_life_days=shelf_life_days,
            avg_daily_usage=avg_daily_usage,
        )
        policy_assignment_mode = getattr(ingredient, "policy_assignment_mode", None) or (
            "manual" if configured_policy else "system"
        )
        override_target_service_level = self._normalize_floatlike(
            getattr(ingredient, "target_service_level", None)
        )
        override_service_level_z = self._normalize_floatlike(
            getattr(ingredient, "service_level_z", None)
        )

        target_service_level = Decimal(
            str(
                override_target_service_level
                if override_target_service_level is not None
                else self.POLICY_SERVICE_LEVELS.get(policy_type, Decimal("0.95"))
            )
        ).quantize(Decimal("0.0001"))
        if override_service_level_z is not None:
            service_level_z = Decimal(str(override_service_level_z)).quantize(
                Decimal("0.0001")
            )
            service_level_source = "ingredient_override"
        else:
            service_level_z = Decimal(
                str(NormalDist().inv_cdf(float(target_service_level)))
            ).quantize(Decimal("0.0001"))
            service_level_source = (
                "ingredient_target"
                if override_target_service_level is not None
                else "policy_default"
            )

        return {
            "policy_type": policy_type,
            "policy_assignment_mode": policy_assignment_mode,
            "target_service_level": target_service_level,
            "service_level_z": service_level_z,
            "service_level_source": service_level_source,
            "policy_override_reason": getattr(ingredient, "policy_override_reason", None),
            "policy_inferred": configured_policy is None,
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
        cadence_source = getattr(supplier, "cadence_source", None) or (
            "manual"
            if any(
                value
                for value in (
                    review_period_days,
                    order_schedule_type,
                    allowed_order_days,
                    allowed_delivery_days,
                )
            )
            else "default"
        )
        if not isinstance(cadence_source, str):
            cadence_source = "default"

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
        lead_demand: Decimal,
        shelf_demand: Decimal,
        total_demand: Decimal,
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
        abc_multiplier = self.ABC_MULTIPLIERS.get(abc_class, self.ABC_MULTIPLIERS["C"])

        lead_demand = self._to_decimal(lead_demand)
        shelf_demand = self._to_decimal(shelf_demand)
        total_demand = self._to_decimal(total_demand)

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

        policy_context = None
        cadence_context = None
        if daily_forecast is not None:
            anchor_date = as_of_date or date.today()
            cadence_context = self._resolve_supplier_cadence_context(
                supplier,
                as_of_date=anchor_date,
                default_lead_time_days=lead_time,
            )
            lead_time = cadence_context["effective_lead_days"]
            normalized_shelf_life_days = (
                max(int(shelf_life_days), 0) if shelf_life_days is not None else None
            )
            policy_context = await self._resolve_policy_context(
                ingredient_id,
                shelf_life_days=normalized_shelf_life_days,
            )
            uncapped_coverage_days = max(cadence_context["protection_window_days"], lead_time)
            coverage_days = uncapped_coverage_days
            coverage_capped_by_shelf_life = False
            if normalized_shelf_life_days is not None and normalized_shelf_life_days > 0:
                if coverage_days > normalized_shelf_life_days:
                    coverage_days = normalized_shelf_life_days
                    coverage_capped_by_shelf_life = True

            if coverage_days == 0 and supplier is None and normalized_shelf_life_days:
                coverage_days = normalized_shelf_life_days

            lead_window_days = min(lead_time, coverage_days)
            lead_demand = self._sum_forecast_window(
                daily_forecast,
                start_date=anchor_date,
                window_days=lead_window_days,
            )
            total_demand = self._sum_forecast_window(
                daily_forecast,
                start_date=anchor_date,
                window_days=coverage_days,
            )
            shelf_demand = max(total_demand - lead_demand, Decimal("0.00")).quantize(
                Decimal("0.01")
            )

            usable_until_date = cadence_context["next_delivery_date"] or (
                anchor_date + timedelta(days=lead_time)
            )
            usable_inventory = await self.stats_service.get_usable_inventory(
                ingredient_id,
                usable_until_date=usable_until_date,
            )
            current_stock = self._to_decimal(usable_inventory["quantity"])
            current_unit = usable_inventory.get("unit") or current_unit
            total_stock = self._to_decimal(usable_inventory.get("total_quantity"))
            excluded_expiring_stock = self._to_decimal(
                usable_inventory.get("excluded_quantity")
            )
            inventory_source = usable_inventory.get("source") or inventory_source
            inventory_conversion_fallback = bool(
                usable_inventory.get("conversion_fallback")
            )
        else:
            coverage_days = None
            uncapped_coverage_days = None
            coverage_capped_by_shelf_life = False

        service_level_z = (
            policy_context["service_level_z"]
            if policy_context is not None
            else self.SERVICE_LEVEL_Z
        )
        safety_stock = await self.calculate_safety_stock(
            ingredient_id,
            lead_time,
            service_level_z=service_level_z,
        )
        reorder_point = (lead_demand + safety_stock).quantize(Decimal("0.01"))
        reorder_target = (total_demand + safety_stock).quantize(Decimal("0.01"))
        raw_order_quantity = (reorder_target - current_stock).quantize(Decimal("0.01"))
        moq_floor = (moq * Decimal("2") if abc_class == "C" else moq).quantize(
            Decimal("0.01")
        )
        buffered_quantity = (raw_order_quantity * abc_multiplier).quantize(
            Decimal("0.01")
        )
        proposed_quantity = max(buffered_quantity, moq_floor)
        max_allowed = await self.calculate_max_order(ingredient_id, current_stock)
        final_quantity = min(proposed_quantity, max_allowed)
        final_quantity = max(final_quantity, Decimal("0")).quantize(Decimal("0.01"))
        should_reorder = current_stock < reorder_point and final_quantity > 0

        logger.debug(
            "[REORDER] Decision ingredient=%s abc=%s current=%s%s lead_demand=%s shelf_demand=%s safety=%s moq=%s proposed=%s max_allowed=%s final=%s",
            ingredient_id,
            abc_class,
            current_stock,
            current_unit,
            lead_demand,
            shelf_demand,
            safety_stock,
            moq,
            proposed_quantity,
            max_allowed,
            final_quantity,
        )

        if manage_alerts:
            if current_stock >= reorder_point:
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
                None if should_reorder else "stock_at_or_above_reorder_point"
            ),
            "service_level_z": service_level_z,
            "abc_class": abc_class,
            "abc_multiplier": abc_multiplier,
            "abc_defaulted": abc_context["used_default"],
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
            "effective_lead_days": lead_time,
            "coverage_days": coverage_days,
            "uncapped_coverage_days": uncapped_coverage_days,
            "coverage_capped_by_shelf_life": coverage_capped_by_shelf_life,
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
                cadence_context["protection_window_days"] if cadence_context else None
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
        summary = (
            f"Suggested because stock {decision['current_stock']} {decision['current_unit'] or inventory_unit or supplier_unit} "
            f"is below reorder point {decision['reorder_point']}. "
            f"Raw reorder {decision['raw_order_quantity']} became {decision['final_quantity']} after "
            f"{decision['abc_class']} policy and MOQ, then {packs_to_order} packs from {supplier_name}."
            f"{cadence_summary}{shelf_life_cap_summary}{usable_stock_summary}"
        )

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
                "policy_type": decision.get("policy_type"),
                "policy_assignment_mode": decision.get("policy_assignment_mode"),
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
                "cadence_warnings": decision.get("cadence_warnings") or [],
                "service_level_source": decision.get("service_level_source"),
                "usable_stock_applied": decision.get("usable_until_date") is not None,
                "inventory_source": decision.get("inventory_source") or assumption_flags.get(
                    "inventory_source"
                ),
                "inventory_conversion_fallback": decision.get(
                    "inventory_conversion_fallback", False
                ),
            },
        }

    @log_method("Reorder: Safety Stock")
    async def calculate_safety_stock(
        self,
        ingredient_id: int,
        lead_time: int,
        service_level_z: Optional[Decimal] = None,
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
        z_score = service_level_z if service_level_z is not None else self.SERVICE_LEVEL_Z
        safety_stock = (
            z_score * stddev_usage * Decimal(math.sqrt(lead_time))
        )
        safety_stock = safety_stock.quantize(Decimal("0.01"))
        logger.debug(
            f"[REORDER] SafetyStock ingredient={ingredient_id} stddev={stddev_usage} lead_time={lead_time} value={safety_stock}"
        )
        return safety_stock

    @log_method("Reorder: Reorder Point")
    async def calculate_reorder_point(self, ingredient_id: int) -> Decimal:
        """
        Calculate the reorder point for an ingredient based on average daily usage, lead time, and safety stock.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            Decimal: The calculated reorder point rounded to two decimal places.
        """
        lead_time = await self.stats_service.get_lead_time_days(ingredient_id)
        avg_daily_usage = await self.stats_service.get_average_daily_usage(
            ingredient_id
        )
        lead_demand = avg_daily_usage * Decimal(lead_time)
        safety_stock = await self.calculate_safety_stock(ingredient_id, lead_time)
        reorder_point = (lead_demand + safety_stock).quantize(Decimal("0.01"))
        logger.debug(
            f"[REORDER] ReorderPoint ingredient={ingredient_id} avg_usage={avg_daily_usage} lead_time={lead_time} safety={safety_stock} point={reorder_point}"
        )
        return reorder_point

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

    @log_method("Reorder: Suggest Quantity")
    async def suggest_reorder_quantity(
        self,
        ingredient_id: int,
        lead_demand: Decimal,
        shelf_demand: Decimal,
        total_demand: Decimal,
        unit: str,
        lead_time: int,
    ) -> Decimal:
        """
        Suggest the reorder quantity for an ingredient based on demand, safety stock, and MOQ (minimum order quantity).

        Args:
            ingredient_id (int): ID of the ingredient.
            lead_demand (Decimal): The demand for the ingredient during the lead time.
            shelf_demand (Decimal): The forecasted demand for the ingredient during the shelf life.
            total_demand (Decimal): Total demand considering both lead and shelf life.
            unit (str): Unit of measurement for the ingredient.
            lead_time (int): Lead time in days.

        Returns:
            Decimal: The suggested reorder quantity rounded to two decimal places.
        """
        decision = await self.build_reorder_decision(
            ingredient_id=ingredient_id,
            lead_demand=lead_demand,
            shelf_demand=shelf_demand,
            total_demand=total_demand,
            unit=unit,
            lead_time=lead_time,
            manage_alerts=True,
        )
        logger.debug(
            f"[REORDER] Final ingredient={ingredient_id} qty={decision['final_quantity']} unit={unit}"
        )
        return decision["final_quantity"]

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
