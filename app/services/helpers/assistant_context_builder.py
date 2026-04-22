from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Tuple

from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_repo import InventoryRepository
from app.schemas.assistant_dto import AssistantCitationDTO
from app.services.alerts_service import AlertsService
from app.services.eod_service import EODService
from app.services.helpers.assistant_entity_resolver import AssistantEntityResolver
from app.services.inventory_service import InventoryService
from app.services.menu_service import MenuService
from app.services.prep_service import PrepService
from app.services.sales_forecast_service import SalesForecastService


MONTH_LOOKUP = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

WEEKDAY_LOOKUP = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


class AssistantContextBuilder:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id

    async def build(
        self,
        query: str,
        retrieval_mode: str,
    ) -> Tuple[List[str], List[AssistantCitationDTO], str | None]:
        if retrieval_mode == "document":
            return [], [], None

        normalized = query.lower()
        tokens = self._query_tokens(query)
        sections: List[str] = []
        citations: List[AssistantCitationDTO] = []
        resolver = AssistantEntityResolver(self.db, self.restaurant_id)

        forecast_query = self._matches_query_hints(
            normalized,
            tokens,
            (
                "forecast",
                "forecasts",
                "forecasted",
                "sales",
                "sell",
                "selling",
                "demand",
                "expected",
                "expect",
                "upcoming",
            ),
        )
        reorder_query = self._matches_query_hints(
            normalized,
            tokens,
            (
                "purchase order",
                "purchase",
                "purchasing",
                "po",
                "reorder",
                "order",
                "orders",
                "supplier",
                "suppliers",
                "suggest",
                "suggesting",
            ),
        )
        recipe_query = self._matches_query_hints(
            normalized,
            tokens,
            ("recipe", "recipes", "linked", "link", "used", "usage", "contains", "ingredient list"),
        )
        batch_query = self._matches_query_hints(
            normalized,
            tokens,
            ("batch", "prep", "linked", "link", "used", "usage", "contains"),
        )

        menu_item_resolution = await resolver.resolve_menu_item(query) if forecast_query else None
        ingredient_resolution = await resolver.resolve_ingredient(query) if reorder_query else None
        recipe_resolution = await resolver.resolve_recipe(query) if recipe_query else None
        batch_resolution = await resolver.resolve_batch_recipe(query) if batch_query else None

        clarification = self._build_clarification_message(
            normalized,
            menu_item_resolution,
            entity_label="menu item",
            skip_terms=("top", "summary", "all", "overall"),
        )
        if clarification:
            return [], [], clarification

        clarification = self._build_clarification_message(
            normalized,
            ingredient_resolution,
            entity_label="ingredient",
            skip_terms=("suppliers", "purchase order", "reorder suggestions", "all"),
        )
        if clarification:
            return [], [], clarification

        clarification = self._build_clarification_message(normalized, recipe_resolution, entity_label="recipe")
        if clarification:
            return [], [], clarification

        clarification = self._build_clarification_message(normalized, batch_resolution, entity_label="batch recipe")
        if clarification:
            return [], [], clarification

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

        if forecast_query:
            menu_item_match = (menu_item_resolution or {}).get("match") if menu_item_resolution else None
            if menu_item_match:
                forecast_section, forecast_citation = await self._build_menu_item_forecast_section(query, menu_item_match)
                sections.append(forecast_section)
                citations.append(forecast_citation)
            else:
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
                        label="SalesForecastService.get_forecast_state",
                        timestamp=self._stringify_timestamp(forecast_state.get("forecast_generated_at")),
                    )
                )

        if recipe_query and recipe_resolution and recipe_resolution.get("match"):
            recipe_match = recipe_resolution["match"]
            sections.append(await self._build_recipe_section(recipe_match))
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="MenuService.get_recipe_detail",
                )
            )

        if batch_query and batch_resolution and batch_resolution.get("match"):
            batch_match = batch_resolution["match"]
            sections.append(await self._build_batch_recipe_section(batch_match))
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="PrepService.get_batch_recipe_detail",
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

        if reorder_query:
            inventory_service = InventoryService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
            po_summary = await inventory_service.generate_purchase_order_suggestions(horizon_days=7, use_cached_forecast=True)
            ingredient_match = (ingredient_resolution or {}).get("match") if ingredient_resolution else None
            if ingredient_match:
                sections.append(self._format_reorder_reasoning_for_ingredient(po_summary, ingredient_match))
            else:
                sections.append(self._format_purchase_order_suggestions(po_summary))
            citations.append(
                AssistantCitationDTO(
                    source_type="service",
                    label="InventoryService.generate_purchase_order_suggestions",
                    timestamp=self._stringify_timestamp(po_summary.get("forecast_generated_at")),
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

        return sections, citations, None

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

    def _build_clarification_message(
        self,
        normalized: str,
        resolution: Dict[str, Any] | None,
        *,
        entity_label: str,
        skip_terms: Tuple[str, ...] = (),
    ) -> str | None:
        if not resolution or not resolution.get("ambiguous"):
            return None
        if any(term in normalized for term in skip_terms):
            return None

        candidates = resolution.get("candidates") or []
        if not candidates:
            return None
        if len(candidates) == 1:
            if float(candidates[0].get("confidence") or 0) < 0.72:
                return None
            return f"Did you mean the {entity_label} {candidates[0].get('name', 'unknown')}?"

        candidate_names = ", ".join(candidate.get("name", "unknown") for candidate in candidates[:3])
        return f"I found multiple {entity_label}s that look close: {candidate_names}. Which one did you mean?"

    async def _build_menu_item_forecast_section(
        self,
        query: str,
        menu_item_match: Dict[str, Any],
    ) -> Tuple[str, AssistantCitationDTO]:
        forecast_service = SalesForecastService(
            self.db,
            self.restaurant_id,
            self.subscription_tier,
            self.employee_id,
        )
        forecast_state = await forecast_service.get_forecast_state()
        target_date = self._extract_target_date(query)
        if target_date:
            item_forecast = await forecast_service.get_menu_item_forecast_on_date(
                menu_item_match["entity_id"],
                target_date,
            )
            if item_forecast:
                section = (
                    "Menu Item Forecast:\n"
                    f"- Item: {item_forecast.get('menu_item_name')}\n"
                    f"- Date: {item_forecast.get('date')}\n"
                    f"- Forecasted quantity: {item_forecast.get('forecasted_quantity')}\n"
                    f"- Forecasted revenue: {item_forecast.get('forecasted_revenue')}\n"
                    f"- Forecast status: {forecast_state.get('forecast_status')}\n"
                    f"- Forecast message: {forecast_state.get('forecast_status_message')}"
                )
            else:
                section = (
                    "Menu Item Forecast:\n"
                    f"- Item: {menu_item_match.get('name')}\n"
                    f"- Date: {target_date.isoformat()}\n"
                    "- No finalized forecast row was found for that date.\n"
                    f"- Forecast status: {forecast_state.get('forecast_status')}\n"
                    f"- Forecast message: {forecast_state.get('forecast_status_message')}"
                )
            citation = AssistantCitationDTO(
                source_type="service",
                label="SalesForecastService.get_menu_item_forecast_on_date",
                timestamp=self._stringify_timestamp(forecast_state.get("forecast_generated_at")),
            )
            return section, citation

        start_date = date.today()
        end_date = start_date + timedelta(days=6)
        range_forecast = await forecast_service.get_menu_item_forecast_range(
            menu_item_match["entity_id"],
            start_date,
            end_date,
        )
        days = range_forecast.get("days") if range_forecast else []
        lines = [
            "Upcoming Menu Item Forecast:",
            f"- Item: {range_forecast.get('menu_item_name') if range_forecast else menu_item_match.get('name')}",
            f"- Window: {start_date.isoformat()} to {end_date.isoformat()}",
            f"- Forecasted quantity: {range_forecast.get('forecasted_quantity') if range_forecast else 0}",
            f"- Forecasted revenue: {range_forecast.get('forecasted_revenue') if range_forecast else 0.0}",
            f"- Forecast status: {forecast_state.get('forecast_status')}",
            f"- Forecast message: {forecast_state.get('forecast_status_message')}",
        ]
        if days:
            lines.append("Daily forecast:")
            for day in days[:7]:
                lines.append(
                    f"- {day.get('date')}: {day.get('forecasted_quantity')} units (${day.get('forecasted_revenue')})"
                )
        else:
            lines.append("- No finalized forecast rows were found for the next 7 days.")

        citation = AssistantCitationDTO(
            source_type="service",
            label="SalesForecastService.get_menu_item_forecast_range",
            timestamp=self._stringify_timestamp(forecast_state.get("forecast_generated_at")),
        )
        return "\n".join(lines), citation

    async def _build_recipe_section(self, recipe_match: Dict[str, Any]) -> str:
        menu_service = MenuService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
        recipe = await menu_service.get_recipe_detail(recipe_match["entity_id"])
        usage = await menu_service.get_recipe_usage(recipe_match["entity_id"])
        menu_items = (usage.get("usage") or {}).get("menu_items") or []
        nested_recipes = (usage.get("usage") or {}).get("nested_in_recipes") or []
        lines = [
            "Recipe Overview:",
            f"- Recipe: {recipe.get('name')}",
            f"- Description: {recipe.get('description') or 'No description provided.'}",
            f"- Component count: {len(recipe.get('ingredients') or [])}",
        ]
        if recipe.get("ingredients"):
            lines.append("Components:")
            for ingredient in recipe.get("ingredients", [])[:10]:
                lines.append(
                    f"- {ingredient.get('name')}: {self._fmt(ingredient.get('quantity'))} {ingredient.get('unit') or ''} ({ingredient.get('type')})"
                )
        if menu_items:
            lines.append("Linked menu items: " + ", ".join(item.get("menu_item_name", "unknown") for item in menu_items[:8]))
        if nested_recipes:
            lines.append("Used inside recipes: " + ", ".join(item.get("recipe_name", "unknown") for item in nested_recipes[:8]))
        return "\n".join(lines)

    async def _build_batch_recipe_section(self, batch_match: Dict[str, Any]) -> str:
        prep_service = PrepService(self.db, self.restaurant_id, self.subscription_tier, self.employee_id)
        batch = await prep_service.get_batch_recipe_detail(batch_match["entity_id"])
        usage = await prep_service.get_batch_recipe_usage(batch_match["entity_id"])
        usage_payload = usage.get("usage") or {}
        lines = [
            "Batch Recipe Overview:",
            f"- Batch recipe: {batch.get('name')}",
            f"- Description: {batch.get('description') or 'No description provided.'}",
            f"- Yield: {self._fmt(batch.get('yield_quantity'))} {batch.get('yield_unit') or ''}".strip(),
            f"- Estimated prep time: {batch.get('estimated_prep_time_minutes') or 'unknown'} minutes",
            f"- Shelf life: {batch.get('shelf_life_days') or 'unknown'} day(s)",
        ]
        if batch.get("ingredients"):
            lines.append("Components:")
            for ingredient in batch.get("ingredients", [])[:10]:
                lines.append(
                    f"- {ingredient.get('ingredient_name')}: {self._fmt(ingredient.get('quantity_used'))} {ingredient.get('unit') or ''} ({ingredient.get('ingredient_type')})"
                )
        menu_items = usage_payload.get("menu_items") or []
        if menu_items:
            lines.append("Linked menu items: " + ", ".join(item.get("menu_item_name", "unknown") for item in menu_items[:8]))
        recipes = usage_payload.get("recipes") or []
        if recipes:
            lines.append("Used in recipes: " + ", ".join(item.get("recipe_name", "unknown") for item in recipes[:8]))
        batches = usage_payload.get("batches") or []
        if batches:
            lines.append("Used in parent batches: " + ", ".join(item.get("batch_recipe_name", "unknown") for item in batches[:8]))
        lines.append(
            f"- Prep schedules: {usage_payload.get('prep_schedule_count', 0)}; inventory lots: {usage_payload.get('inventory_lot_count', 0)}"
        )
        return "\n".join(lines)

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

    def _format_reorder_reasoning_for_ingredient(
        self,
        po_summary: Dict[str, Any],
        ingredient_match: Dict[str, Any],
    ) -> str:
        suggestion_groups = po_summary.get("suggestions") or []
        all_items = po_summary.get("all_items") or self._flatten_suggestion_groups(suggestion_groups)
        matched_item = next(
            (item for item in all_items if item.get("ingredient_id") == ingredient_match.get("entity_id")),
            None,
        )
        if not matched_item:
            return (
                "Reorder Review:\n"
                f"- Ingredient: {ingredient_match.get('name')}\n"
                "- This ingredient is not currently in the purchase-order suggestion list.\n"
                f"- Forecast status: {po_summary.get('forecast_status') or 'unknown'}\n"
                f"- Forecast message: {po_summary.get('forecast_status_message') or 'unavailable'}"
            )

        explanation = matched_item.get("explanation") or {}
        why = explanation.get("why_reorder") or {}
        quantity_factors = explanation.get("quantity_factors") or {}
        policy_factors = explanation.get("policy_factors") or {}
        supplier_factors = explanation.get("supplier_factors") or {}
        assumption_flags = explanation.get("assumption_flags") or {}
        lines = [
            "Reorder Review:",
            f"- Ingredient: {matched_item.get('ingredient_name')}",
            (
                f"- Suggested order: {self._fmt(matched_item.get('quantity_to_order'))} "
                f"{matched_item.get('unit') or ''}"
            ).strip(),
            f"- Supplier: {matched_item.get('supplier_name') or supplier_factors.get('selected_supplier') or 'unspecified supplier'}",
            f"- Forecast status: {po_summary.get('forecast_status') or 'unknown'}",
            f"- Forecast message: {po_summary.get('forecast_status_message') or 'unavailable'}",
        ]
        summary = explanation.get("summary")
        if summary:
            lines.append(f"- Reason: {summary}")
        lines.extend(
            [
                (
                    f"- Stock position: current {self._fmt(why.get('current_stock'))} "
                    f"{why.get('current_unit') or matched_item.get('unit') or ''}, "
                    f"total {self._fmt(why.get('total_stock'))}, excluded expiring {self._fmt(why.get('excluded_expiring_stock'))}, "
                    f"projected waste {self._fmt(why.get('projected_waste_quantity'))}"
                ),
                (
                    f"- Demand window math: lead demand {self._fmt(why.get('lead_demand'))}, "
                    f"shelf demand {self._fmt(why.get('shelf_demand'))}, safety stock {self._fmt(why.get('safety_stock'))}, "
                    f"reorder point {self._fmt(why.get('reorder_point'))}, reorder target {self._fmt(why.get('reorder_target'))}"
                ),
                (
                    f"- Coverage: effective lead days {why.get('effective_lead_days') or 'unknown'}, "
                    f"coverage days {why.get('coverage_days') or 'unknown'}, protection window {why.get('protection_window_days') or 'unknown'}, "
                    f"FEFO applied {why.get('fefo_applied')}"
                ),
                (
                    f"- Policy: {policy_factors.get('policy_type') or 'unknown'} via {policy_factors.get('reorder_method') or 'unknown'}, "
                    f"service level {self._fmt(policy_factors.get('target_service_level'))}, "
                    f"service z {self._fmt(policy_factors.get('service_level_z'))}, demand source {policy_factors.get('demand_source') or 'unknown'}"
                ),
                (
                    f"- Quantity math: raw {self._fmt(quantity_factors.get('raw_order_quantity'))}, "
                    f"buffered {self._fmt(quantity_factors.get('buffered_quantity'))}, final before pack rounding {self._fmt(quantity_factors.get('final_quantity_before_pack_rounding'))}, "
                    f"packs {quantity_factors.get('packs_to_order') or 0}, total ordered {self._fmt(quantity_factors.get('total_quantity_ordered'))}"
                ),
                (
                    f"- Supplier cadence: next order {supplier_factors.get('next_order_date') or 'unscheduled'}, "
                    f"next delivery {supplier_factors.get('next_delivery_date') or 'unscheduled'}, schedule {supplier_factors.get('order_schedule_type') or 'unknown'}, "
                    f"selection rule {supplier_factors.get('selection_rule') or 'unknown'}"
                ),
            ]
        )
        warnings = assumption_flags.get("cadence_warnings") or []
        if warnings:
            lines.append("- Warnings: " + "; ".join(str(warning) for warning in warnings[:4]))
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

    def _extract_target_date(self, query: str) -> date | None:
        normalized = query.lower()
        today = date.today()
        if "today" in normalized:
            return today
        if "tomorrow" in normalized:
            return today + timedelta(days=1)

        weekday_match = re.search(
            r"\b(?:this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
            normalized,
        )
        if weekday_match:
            target_weekday = WEEKDAY_LOOKUP[weekday_match.group(1)]
            days_ahead = (target_weekday - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7 if weekday_match.group(0).startswith("next") else 0
            return today + timedelta(days=days_ahead)

        month_match = re.search(
            r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b",
            normalized,
        )
        if month_match:
            month_value = MONTH_LOOKUP[month_match.group(1)]
            day_value = int(month_match.group(2))
            year_value = int(month_match.group(3)) if month_match.group(3) else today.year
            try:
                candidate = date(year_value, month_value, day_value)
            except ValueError:
                return None
            if not month_match.group(3) and candidate < today:
                try:
                    return date(year_value + 1, month_value, day_value)
                except ValueError:
                    return None
            return candidate
        return None

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

    @staticmethod
    def _stringify_timestamp(value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)
