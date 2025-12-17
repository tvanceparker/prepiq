from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.schemas.waste_analytics_dto import (
    WasteAnalyticsResponse,
    WasteBreakdownItem,
    WasteInsight,
    WasteTrendPoint,
)
from app.utils.logger_helpers import log_method


class WasteAnalyticsService:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.usage_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.lot_repo = InventoryLotRepository(db, restaurant_id)
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)

    async def _estimate_cost(self, log) -> float:
        qty = float(log.used_quantity or 0)
        if qty == 0:
            return 0.0

        # Prefer lot supplier cost if present
        if log.lot_id:
            lot = await self.lot_repo.get_by_id(log.lot_id)
            if lot and lot.ingredient_supplier_id:
                unit_cost = await self.ingredient_supplier_repo.get_price_per_unit(
                    lot.ingredient_supplier_id
                )
                if unit_cost is not None:
                    return qty * float(unit_cost)

        # Fallback: try preferred supplier for ingredient
        supplier = await self.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier(
            log.ingredient_id
        )
        if supplier and supplier.cost_per_unit:
            return qty * float(supplier.cost_per_unit)

        return 0.0

    def _bucket_dates(self, start_date: date, end_date: date) -> List[date]:
        days = []
        current = start_date
        while current <= end_date:
            days.append(current)
            current += timedelta(days=1)
        return days

    @log_method()
    async def get_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> WasteAnalyticsResponse:
        # Default to last 30 days
        today = date.today()
        start_date = start_date or (today - timedelta(days=30))
        end_date = end_date or today

        logs = await self.usage_repo.get_all()
        waste_logs = [
            log
            for log in logs
            if log.usage_type in {"waste", "spoilage"}
            and start_date <= log.used_date.date() <= end_date
        ]

        trend_map: Dict[date, Dict[str, float]] = {}
        type_map: Dict[str, Dict[str, float]] = {}
        ingredient_map: Dict[int, Dict[str, float]] = {}
        reason_map: Dict[str, Dict[str, float]] = {}

        total_qty = 0.0
        total_cost = 0.0

        for log in waste_logs:
            qty = float(log.used_quantity or 0)
            cost = await self._estimate_cost(log)
            total_qty += qty
            total_cost += cost

            day = log.used_date.date()
            trend_bucket = trend_map.setdefault(day, {"qty": 0.0, "cost": 0.0})
            trend_bucket["qty"] += qty
            trend_bucket["cost"] += cost

            usage_type = getattr(log.usage_type, "value", str(log.usage_type))
            type_bucket = type_map.setdefault(usage_type, {"qty": 0.0, "cost": 0.0})
            type_bucket["qty"] += qty
            type_bucket["cost"] += cost

            ingredient_bucket = ingredient_map.setdefault(
                log.ingredient_id, {"qty": 0.0, "cost": 0.0}
            )
            ingredient_bucket["qty"] += qty
            ingredient_bucket["cost"] += cost

            reason = (log.notes or "unknown").strip().lower() or "unknown"
            reason_bucket = reason_map.setdefault(reason, {"qty": 0.0, "cost": 0.0})
            reason_bucket["qty"] += qty
            reason_bucket["cost"] += cost

        # Build trend points covering full window
        trend: List[WasteTrendPoint] = []
        for bucket_day in self._bucket_dates(start_date, end_date):
            stats = trend_map.get(bucket_day, {"qty": 0.0, "cost": 0.0})
            trend.append(
                WasteTrendPoint(
                    bucket_start=bucket_day,
                    total_quantity=round(stats["qty"], 2),
                    total_cost=round(stats["cost"], 2),
                )
            )

        async def label_ingredient(ingredient_id: int) -> str:
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            return ingredient.name if ingredient else f"Ingredient {ingredient_id}"

        top_ingredients: List[WasteBreakdownItem] = []
        for ingredient_id, stats in ingredient_map.items():
            label = await label_ingredient(ingredient_id)
            top_ingredients.append(
                WasteBreakdownItem(
                    key=str(ingredient_id),
                    label=label,
                    total_quantity=round(stats["qty"], 2),
                    total_cost=round(stats["cost"], 2),
                    usage_type=None,
                )
            )
        top_ingredients.sort(key=lambda x: x.total_cost, reverse=True)
        top_ingredients = top_ingredients[:10]

        by_type: List[WasteBreakdownItem] = [
            WasteBreakdownItem(
                key=key,
                label=key.title(),
                total_quantity=round(stats["qty"], 2),
                total_cost=round(stats["cost"], 2),
                usage_type=key,
            )
            for key, stats in type_map.items()
        ]
        by_type.sort(key=lambda x: x.total_cost, reverse=True)

        top_reasons: List[WasteBreakdownItem] = [
            WasteBreakdownItem(
                key=reason,
                label=reason.title(),
                total_quantity=round(stats["qty"], 2),
                total_cost=round(stats["cost"], 2),
            )
            for reason, stats in reason_map.items()
        ]
        top_reasons.sort(key=lambda x: x.total_cost, reverse=True)
        top_reasons = top_reasons[:5]

        days_in_range = max((end_date - start_date).days + 1, 1)
        average_daily_cost = round(total_cost / days_in_range, 2) if days_in_range else 0.0

        insights: List[WasteInsight] = []
        if total_cost > 0:
            insights.append(
                WasteInsight(
                    title="Waste cost",
                    detail=f"${total_cost:.2f} in waste between {start_date} and {end_date}.",
                    action="Prioritize top-cost waste items to recapture margin.",
                    severity="warning" if total_cost > 200 else "info",
                )
            )
        if top_ingredients:
            lead = top_ingredients[0]
            insights.append(
                WasteInsight(
                    title="Top waste driver",
                    detail=f"{lead.label} accounts for ${lead.total_cost:.2f} of waste.",
                    action="Audit prep sizes and storage for this item first.",
                    severity="critical" if lead.total_cost > (0.5 * total_cost) else "warning",
                )
            )
        if by_type:
            spoilage = next((b for b in by_type if b.usage_type == "spoilage"), None)
            if spoilage and spoilage.total_cost > 0:
                insights.append(
                    WasteInsight(
                        title="Spoilage detected",
                        detail=f"Spoilage accounts for ${spoilage.total_cost:.2f} in this window.",
                        action="Tighten rotation dates and lot checks.",
                        severity="warning",
                    )
                )

        return WasteAnalyticsResponse(
            start_date=start_date,
            end_date=end_date,
            total_waste_quantity=round(total_qty, 2),
            total_waste_cost=round(total_cost, 2),
            average_daily_cost=average_daily_cost,
            trend=trend,
            by_type=by_type,
            top_ingredients=top_ingredients,
            top_reasons=top_reasons,
            insights=insights,
        )
