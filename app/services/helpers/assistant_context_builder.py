from __future__ import annotations

import re
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
        tokens = self._query_tokens(query)
        sections: List[str] = []
        citations: List[AssistantCitationDTO] = []

        if self._matches_query_hints(normalized, tokens, ("alert", "alerts", "warning", "warnings", "urgent")):
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

        if self._matches_query_hints(normalized, tokens, ("forecast", "forecasts", "sales", "demand")):
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

        if self._matches_query_hints(normalized, tokens, ("eod", "end of day", "finalize", "finalized")):
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

        if self._matches_query_hints(
            normalized,
            tokens,
            ("purchase order", "purchase", "purchasing", "po", "reorder", "order", "orders", "supplier", "suppliers"),
        ):
            inventory_service = InventoryService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
            po_summary = await inventory_service.generate_purchase_order_suggestions(horizon_days=7, use_cached_forecast=True)
            sections.append(self._format_purchase_order_suggestions(po_summary))
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="InventoryService.generate_purchase_order_suggestions",
                    timestamp=po_summary.get("forecast_generated_at"),
                )
            )

        if self._matches_query_hints(
            normalized,
            tokens,
            ("inventory", "stock", "ingredient", "ingredients", "reorder", "purchase order", "purchase", "po", "order", "orders"),
        ):
            sections.append(await self._build_inventory_snapshot_section())
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="InventoryRepository.get_all",
                )
            )

        return sections, citations

    @staticmethod
    def _query_tokens(query: str) -> set[str]:
        return set(re.findall(r"[a-z0-9]+", query.lower()))

    @staticmethod
    def _matches_query_hints(normalized: str, tokens: set[str], hints: Tuple[str, ...]) -> bool:
        for hint in hints:
            if " " in hint:
                if hint in normalized:
                    return True
            elif hint in tokens:
                return True
        return False

    def _format_purchase_order_suggestions(self, po_summary: Dict[str, Any]) -> str:
        suggestion_groups = po_summary.get("suggestions") or []
        all_items = po_summary.get("all_items") or self._flatten_suggestion_groups(suggestion_groups)
        active_groups = [
            group for group in suggestion_groups
            if isinstance(group, dict) and group.get("items")
        ]

        lines = [
            "Purchase Order Suggestions:",
            f"- Forecast status: {po_summary.get('forecast_status') or 'unknown'}",
            f"- Forecast message: {po_summary.get('forecast_status_message') or 'unavailable'}",
            f"- Forecast generated at: {po_summary.get('forecast_generated_at') or 'unavailable'}",
            f"- Last EOD run date: {po_summary.get('last_eod_run_date') or 'unavailable'}",
            f"- Horizon days: {po_summary.get('horizon_days') or 'unavailable'}",
            f"- Suppliers with suggestions: {len(active_groups)}",
            f"- Suggested items: {len(all_items)}",
        ]

        if not all_items:
            lines.extend(
                [
                    "- Reorder engine result: no purchase-order suggestion items were generated.",
                    "- Answer rule: do not claim the restaurant has nothing to do unless inventory snapshot also shows no low-stock items.",
                ]
            )
            return "\n".join(lines)

        lines.append("Recommended reorder items:")
        for item in all_items[:12]:
            explanation = item.get("explanation") or {}
            why = explanation.get("why_reorder") or {}
            quantity_factors = explanation.get("quantity_factors") or {}
            supplier_factors = explanation.get("supplier_factors") or {}
            warnings = (explanation.get("assumption_flags") or {}).get("cadence_warnings") or []

            item_lines = [
                (
                    f"- {item.get('ingredient_name', 'Unknown ingredient')}: order "
                    f"{self._fmt(item.get('quantity_to_order'))} {item.get('unit') or ''}".strip()
                    + f" from {item.get('supplier_name') or 'unspecified supplier'}"
                ),
                (
                    f"  Current stock: {self._fmt(item.get('current_stock'))} "
                    f"{why.get('current_unit') or item.get('unit') or ''}; "
                    f"lead demand: {self._fmt(item.get('lead_demand'))}; "
                    f"shelf demand: {self._fmt(item.get('shelf_demand'))}"
                ),
                (
                    f"  Pack/order detail: {item.get('packs_to_order') or 0} pack(s), "
                    f"{self._fmt(quantity_factors.get('quantity_per_pack'))} {item.get('unit') or ''} per pack, "
                    f"line total ${self._fmt_money(item.get('line_total'))}"
                ),
            ]
            summary = explanation.get("summary")
            if summary:
                item_lines.append(f"  Reason: {summary}")
            if supplier_factors.get("next_order_date") or supplier_factors.get("next_delivery_date"):
                item_lines.append(
                    "  Cadence: "
                    f"next order {supplier_factors.get('next_order_date') or 'unscheduled'}, "
                    f"next delivery {supplier_factors.get('next_delivery_date') or 'unscheduled'}"
                )
            if warnings:
                item_lines.append("  Warnings: " + "; ".join(str(warning) for warning in warnings[:3]))
            lines.extend(item_lines)

        if len(all_items) > 12:
            lines.append(f"- Additional suggestion items omitted from prompt context: {len(all_items) - 12}")
        return "\n".join(lines)

    async def _build_inventory_snapshot_section(self) -> str:
        inventory_repo = InventoryRepository(self.db, self.restaurant_id)
        ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
        inventory_rows = await inventory_repo.get_all(limit=100)
        ingredient_rows = await ingredient_repo.get_all(limit=300)
        ingredient_lookup = {row.ingredient_id: row for row in ingredient_rows}
        low_stock = []
        for row in inventory_rows:
            if row.quantity_on_hand is None:
                continue
            min_level = row.min_stock_level or 0
            if min_level and row.quantity_on_hand <= min_level:
                ingredient = ingredient_lookup.get(row.ingredient_id)
                low_stock.append(
                    {
                        "name": ingredient.name if ingredient else f"Ingredient {row.ingredient_id}",
                        "quantity": row.quantity_on_hand,
                        "unit": row.unit,
                        "min_level": min_level,
                    }
                )

        if not low_stock:
            return "Inventory Snapshot:\n- No low-stock items were detected in the sampled inventory rows."

        low_stock.sort(key=lambda item: float(item["quantity"] or 0) / max(float(item["min_level"] or 1), 0.0001))
        lines = [
            "Inventory Snapshot:",
            "- Low-stock items from current inventory. These are not the same as approved PO suggestions, but they are operational review flags.",
        ]
        for item in low_stock[:12]:
            lines.append(
                f"- {item['name']}: {self._fmt(item['quantity'])} {item['unit']} on hand "
                f"(min {self._fmt(item['min_level'])})"
            )
        if len(low_stock) > 12:
            lines.append(f"- Additional low-stock items omitted from prompt context: {len(low_stock) - 12}")
        return "\n".join(lines)

    @staticmethod
    def _flatten_suggestion_groups(suggestion_groups: Any) -> List[Dict[str, Any]]:
        if not isinstance(suggestion_groups, list):
            return []
        items: List[Dict[str, Any]] = []
        for group in suggestion_groups:
            if isinstance(group, dict):
                group_items = group.get("items") or []
                if isinstance(group_items, list):
                    items.extend(item for item in group_items if isinstance(item, dict))
        return items

    @staticmethod
    def _fmt(value: Any) -> str:
        if value is None:
            return "unknown"
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return str(value)
        if numeric.is_integer():
            return str(int(numeric))
        return f"{numeric:.2f}".rstrip("0").rstrip(".")

    @staticmethod
    def _fmt_money(value: Any) -> str:
        if value is None:
            return "0.00"
        try:
            return f"{float(value):.2f}"
        except (TypeError, ValueError):
            return "0.00"
