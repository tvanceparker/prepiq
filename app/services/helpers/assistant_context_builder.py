from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Tuple

from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_repo import InventoryRepository
from app.schemas.assistant_dto import AssistantCitationDTO
from app.services.alerts_service import AlertsService
from app.services.eod_service import EODService
from app.services.inventory_service import InventoryService
from app.services.sales_forecast_service import SalesForecastService


class AssistantContextBuilder:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id

    async def build(self, query: str, retrieval_mode: str) -> Tuple[List[str], List[AssistantCitationDTO]]:
        if retrieval_mode == "document":
            return [], []

        normalized = query.lower()
        sections: List[str] = []
        citations: List[AssistantCitationDTO] = []

        if any(term in normalized for term in ("alert", "alerts", "warning", "urgent")):
            alerts_service = AlertsService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
            alerts = await alerts_service.get_active_alerts(limit=5)
            if alerts:
                lines = [
                    f"- {alert.get('severity', 'info')}: {alert.get('message', 'No message')}"
                    for alert in alerts[:5]
                ]
                sections.append("Active Alerts:\n" + "\n".join(lines))
                citations.append(
                    AssistantCitationDTO(
                        source_type="service",
                        label="AlertsService.get_active_alerts",
                    )
                )

        if any(term in normalized for term in ("forecast", "sales", "demand")):
            forecast_service = SalesForecastService(
                self.db,
                self.restaurant_id,
                self.subscription_tier,
                self.employee_id,
            )
            forecast_state = await forecast_service.get_forecast_state()
            start_date = date.today()
            end_date = start_date + timedelta(days=6)
            forecast_totals = await forecast_service.get_upcoming_forecast_totals_basic(start_date, end_date, mode="total")
            top_items = await forecast_service.get_top_forecasted_items_basic(start_date, end_date, limit=3)
            sections.append(
                "Forecast Summary:\n"
                f"- Status: {forecast_state.get('forecast_status')}\n"
                f"- Message: {forecast_state.get('forecast_status_message')}\n"
                f"- Confidence: {forecast_state.get('forecast_confidence_score')}\n"
                f"- 7-day quantity: {forecast_totals.get('forecasted_quantity')}\n"
                f"- 7-day revenue: {forecast_totals.get('forecasted_revenue')}\n"
                + (
                    "- Top items: " + ", ".join(item.get("name", "unknown") for item in top_items)
                    if top_items
                    else "- Top items: unavailable"
                )
            )
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="SalesForecastService",
                    timestamp=forecast_state.get("forecast_generated_at"),
                )
            )

        if any(term in normalized for term in ("eod", "end of day", "finalize")):
            eod_service = EODService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
            eod_summary = await eod_service.get_eod_run_summary()
            if eod_summary:
                sections.append(
                    "EOD Summary:\n"
                    f"- Status: {eod_summary.get('status')}\n"
                    f"- Message: {eod_summary.get('status_message')}\n"
                    f"- Finalized: {eod_summary.get('finalized')}\n"
                    f"- Run date: {eod_summary.get('run_date')}"
                )
                citations.append(
                    AssistantCitationDTO(
                        source_type="service",
                        label="EODService.get_eod_run_summary",
                        timestamp=str(eod_summary.get("finished_at")) if eod_summary.get("finished_at") else None,
                    )
                )

        if any(term in normalized for term in ("purchase order", "po", "reorder", "supplier")):
            inventory_service = InventoryService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
            po_summary = await inventory_service.generate_purchase_order_suggestions(horizon_days=7, use_cached_forecast=True)
            suggestions = po_summary.get("suggestions") or {}
            supplier_count = len(suggestions)
            item_count = sum(len(items or []) for items in suggestions.values()) if isinstance(suggestions, dict) else 0
            forecast_state = po_summary.get("forecast_state") or {}
            sections.append(
                "Purchase Order Suggestions:\n"
                f"- Suppliers with suggestions: {supplier_count}\n"
                f"- Suggested items: {item_count}\n"
                f"- Forecast status: {forecast_state.get('forecast_status')}\n"
                f"- Forecast message: {forecast_state.get('forecast_status_message')}"
            )
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="InventoryService.generate_purchase_order_suggestions",
                    timestamp=forecast_state.get("forecast_generated_at"),
                )
            )

        if any(term in normalized for term in ("inventory", "stock", "ingredient")):
            inventory_repo = InventoryRepository(self.db, self.restaurant_id)
            ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
            inventory_rows = await inventory_repo.get_all(limit=50)
            ingredient_rows = await ingredient_repo.get_all(limit=200)
            ingredient_lookup = {row.ingredient_id: row for row in ingredient_rows}
            low_stock = []
            for row in inventory_rows:
                if row.quantity_on_hand is None:
                    continue
                min_level = row.min_stock_level or 0
                if min_level and row.quantity_on_hand <= min_level:
                    ingredient = ingredient_lookup.get(row.ingredient_id)
                    low_stock.append(
                        f"- {(ingredient.name if ingredient else f'Ingredient {row.ingredient_id}')}: {row.quantity_on_hand} {row.unit} on hand (min {min_level})"
                    )
            if low_stock:
                sections.append("Inventory Snapshot:\n" + "\n".join(low_stock[:5]))
            else:
                sections.append("Inventory Snapshot:\n- No low-stock items were detected in the sampled inventory rows.")
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="InventoryRepository.get_all",
                )
            )

        return sections, citations