from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence

from app.core.logging import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.sales_repo import SalesRepository
from app.services.alerts_service import AlertsService
from app.services.utils.unit_conversion import convert_unit, normalize_unit


class InventoryDeductionHelper:
    """Shared helper that encapsulates ingredient/batch deduction logic and alerting."""

    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: Optional[int],
    ) -> None:
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.alerts_service = AlertsService(db, restaurant_id, subscription_tier, employee_id)

    async def _reference_context(self, reference_type: str, reference_id: int) -> Dict[str, Any]:
        context: Dict[str, Any] = {
            "reference_type": reference_type,
            "reference_id": reference_id,
            "deduction_reason": f"{reference_type}:{reference_id}",
            "attempted_at": datetime.utcnow().isoformat() + "Z",
            "attempted_day": datetime.utcnow().date().isoformat(),
        }

        if reference_type == "sale":
            sale = await self.sales_repo.get_by_id(reference_id)
            if sale and getattr(sale, "sale_timestamp", None):
                context["sale_timestamp"] = sale.sale_timestamp.isoformat()
                context["attempted_day"] = sale.sale_timestamp.date().isoformat()

        return context

    async def is_real_time_enabled(self) -> bool:
        row = await self.restaurant_repo.get_settings()
        if not row:
            return False
        settings_blob = dict(row).get("settings") or {}
        return settings_blob.get("inventory_deduction_mode", "eod") == "real_time"

    async def deduct_for_menu_items(
        self,
        menu_items: Sequence[Dict[str, Any]],
        reference_id: int,
        reference_type: str = "sale",
    ) -> Dict[str, Any]:
        """Deduct inventory for the provided menu items (typically a single order)."""
        if not menu_items:
            return {"deducted_items": [], "failures": [], "skipped": "no_items"}

        already_logged = await self.inventory_usage_log_repo.exists_for_reference(
            reference_type, reference_id
        )
        if already_logged:
            logger.info(
                "[InventoryDeduction] Skipping reference %s/%s (already logged)",
                reference_type,
                reference_id,
            )
            return {"deducted_items": [], "failures": [], "skipped": "already_logged"}

        usage_summary = await self._build_usage_summary(menu_items)
        if not usage_summary:
            return {"deducted_items": [], "failures": [], "skipped": "no_usage"}

        return await self._apply_usage_summary(
            usage_summary, reference_type=reference_type, reference_id=reference_id
        )

    async def deduct_usage_summary(
        self,
        usage_summary: Sequence[Dict[str, Any]],
        reference_type: str,
        reference_id: int,
    ) -> Dict[str, Any]:
        """Apply a precomputed usage summary (e.g., from EOD aggregation)."""
        if not usage_summary:
            return {"deducted_items": [], "failures": []}
        already_logged = await self.inventory_usage_log_repo.exists_for_reference(
            reference_type, reference_id
        )
        if already_logged:
            logger.info(
                "[InventoryDeduction] Skipping reference %s/%s (already logged)",
                reference_type,
                reference_id,
            )
            return {"deducted_items": [], "failures": [], "skipped": "already_logged"}
        return await self._apply_usage_summary(
            usage_summary, reference_type=reference_type, reference_id=reference_id
        )

    async def _build_usage_summary(
        self, menu_items: Sequence[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        usage_summary: List[Dict[str, Any]] = []
        ingredient_totals: Dict[int, Decimal] = {}
        ingredient_units: Dict[int, str] = {}
        batch_totals: Dict[int, Decimal] = {}

        for item in menu_items:
            menu_item_id = item.get("menu_item_id")
            quantity = Decimal(str(item.get("quantity", 0)))
            if not menu_item_id or quantity <= 0:
                continue

            menu_item_recipes = await self.menu_item_recipe_repo.get_by_menu_item(
                menu_item_id
            )
            if not menu_item_recipes:
                continue

            for mir in menu_item_recipes:
                recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(
                    mir.recipe_id
                )
                for ri in recipe_ingredients:
                    used_qty = Decimal(str(ri.quantity_used or 0)) * quantity
                    reference_id = ri.reference_id
                    if ri.ingredient_type == "ingredient" and reference_id:
                        ingredient = await self.ingredient_repo.get_by_id(reference_id)
                        if not ingredient:
                            continue
                        unit = ingredient.unit or "count"
                        ingredient_totals.setdefault(reference_id, Decimal("0"))
                        ingredient_totals[reference_id] += used_qty
                        ingredient_units[reference_id] = unit
                    elif ri.ingredient_type == "batch" and reference_id:
                        batch_totals.setdefault(reference_id, Decimal("0"))
                        batch_totals[reference_id] += used_qty

        for ingredient_id, qty in ingredient_totals.items():
            usage_summary.append(
                {
                    "ingredient_id": ingredient_id,
                    "quantity": qty,
                    "unit": ingredient_units.get(ingredient_id, "count"),
                    "source": "sale",
                }
            )

        for batch_recipe_id, qty in batch_totals.items():
            batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
            unit = (batch_recipe.yield_unit if batch_recipe else None) or "count"
            usage_summary.append(
                {
                    "batch_recipe_id": batch_recipe_id,
                    "quantity": qty,
                    "unit": unit,
                    "source": "batch",
                }
            )

        return usage_summary

    async def _apply_usage_summary(
        self,
        usage_summary: Sequence[Dict[str, Any]],
        reference_type: str,
        reference_id: int,
    ) -> Dict[str, Any]:
        deducted_items: List[Dict[str, Any]] = []
        failures: List[Dict[str, Any]] = []

        for usage in usage_summary:
            try:
                if usage.get("source") == "sale" and usage.get("ingredient_id"):
                    result = await self._deduct_ingredient_usage(
                        usage, reference_type, reference_id
                    )
                    if result:
                        deducted_items.append(result)
                elif usage.get("source") == "batch" and usage.get("batch_recipe_id"):
                    batch_results = await self._deduct_batch_usage(
                        usage, reference_type, reference_id
                    )
                    deducted_items.extend(batch_results)
                else:
                    logger.warning("[InventoryDeduction] Unknown usage payload %s", usage)
            except Exception as exc:  # pragma: no cover - defensive logging
                failures.append({"usage": usage, "error": str(exc)})
                await self._create_alert(
                    message=str(exc),
                    meta={"usage": usage, "reference_id": reference_id},
                )

        return {"deducted_items": deducted_items, "failures": failures}

    async def _deduct_ingredient_usage(
        self,
        usage: Dict[str, Any],
        reference_type: str,
        reference_id: int,
    ) -> Optional[Dict[str, Any]]:
        ingredient_id = usage["ingredient_id"]
        qty = Decimal(str(usage["quantity"]))
        unit = usage.get("unit", "count")
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        ingredient_name = ingredient.name if ingredient else f"Ingredient {ingredient_id}"
        ref_ctx = await self._reference_context(reference_type, reference_id)

        inventory_entry = await self.inventory_repo.get_inventory_by_ingredient(
            ingredient_id
        )
        if not inventory_entry:
            await self._create_alert(
                message=(
                    f"Inventory deduction failed for '{ingredient_name}': no inventory row found "
                    f"while processing {reference_type} {reference_id} on {ref_ctx['attempted_day']}."
                ),
                meta={
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient_name,
                    "required_quantity": float(qty),
                    "available_quantity": 0.0,
                    "current_quantity_on_hand": 0.0,
                    "unit": unit,
                    **ref_ctx,
                },
            )
            return None

        to_unit = inventory_entry.unit or unit
        normalized_from = normalize_unit(unit)
        normalized_to = normalize_unit(to_unit)
        if normalized_from != normalized_to:
            qty = convert_unit(qty, unit, to_unit)

        available_qty = Decimal(str(inventory_entry.quantity_on_hand or 0))
        if available_qty < qty:
            shortfall = qty - available_qty
            await self._create_alert(
                message=(
                    f"Inventory deduction failed for '{ingredient_name}': tried to deduct "
                    f"{float(qty)} {to_unit} for {reference_type} {reference_id} on {ref_ctx['attempted_day']}, "
                    f"but only {float(available_qty)} {to_unit} is on hand."
                ),
                meta={
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient_name,
                    "required_quantity": float(qty),
                    "available_quantity": float(available_qty),
                    "current_quantity_on_hand": float(available_qty),
                    "shortfall_quantity": float(shortfall),
                    "unit": to_unit,
                    **ref_ctx,
                },
            )
            return None

        await self.inventory_repo.decrement_quantity(
            inventory_id=inventory_entry.inventory_id,
            amount=qty,
        )

        await self.inventory_usage_log_repo.create(
            {
                "inventory_id": inventory_entry.inventory_id,
                "ingredient_id": ingredient_id,
                "used_quantity": qty,
                "unit": to_unit,
                "usage_type": "sale",
                "reference_type": reference_type,
                "reference_id": reference_id,
                "used_date": datetime.utcnow(),
            }
        )

        return {
            "ingredient_id": ingredient_id,
            "quantity_deducted": float(qty),
            "unit": to_unit,
            "source": "sale",
        }

    async def _deduct_batch_usage(
        self,
        usage: Dict[str, Any],
        reference_type: str,
        reference_id: int,
    ) -> List[Dict[str, Any]]:
        batch_recipe_id = usage["batch_recipe_id"]
        qty = Decimal(str(usage["quantity"]))
        from_unit = usage.get("unit", "count")
        ref_ctx = await self._reference_context(reference_type, reference_id)
        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
        batch_name = batch_recipe.name if batch_recipe else f"Batch recipe {batch_recipe_id}"

        lots = await self.inventory_lot_repo.get_all_by_batch_recipe_id(batch_recipe_id)
        if not lots:
            await self._create_alert(
                message=f"No inventory lots found for batch recipe {batch_recipe_id}",
                meta={"batch_recipe_id": batch_recipe_id, "reference_id": reference_id},
            )
            return []

        inventory_ids = list({lot.inventory_id for lot in lots})
        inventories = await self.inventory_repo.get_all_by_ids(inventory_ids)
        if not inventories:
            await self._create_alert(
                message=f"No inventories found for batch recipe {batch_recipe_id}",
                meta={"batch_recipe_id": batch_recipe_id, "reference_id": reference_id},
            )
            return []

        to_unit = inventories[0].unit or from_unit
        if normalize_unit(from_unit) != normalize_unit(to_unit):
            qty = convert_unit(qty, from_unit, to_unit)

        total_available = sum(
            Decimal(str(inv.quantity_on_hand or 0)) for inv in inventories
        )
        if total_available < qty:
            shortfall = qty - total_available
            await self._create_alert(
                message=(
                    f"Inventory deduction failed for batch '{batch_name}': tried to deduct "
                    f"{float(qty)} {to_unit} for {reference_type} {reference_id} on {ref_ctx['attempted_day']}, "
                    f"but only {float(total_available)} {to_unit} is on hand."
                ),
                meta={
                    "batch_recipe_id": batch_recipe_id,
                    "batch_recipe_name": batch_name,
                    "required_quantity": float(qty),
                    "available_quantity": float(total_available),
                    "current_quantity_on_hand": float(total_available),
                    "shortfall_quantity": float(shortfall),
                    "unit": to_unit,
                    **ref_ctx,
                },
            )
            return []

        remaining = qty
        deducted_items: List[Dict[str, Any]] = []

        for inventory_entry in inventories:
            if remaining <= 0:
                break
            available = Decimal(str(inventory_entry.quantity_on_hand or 0))
            if available <= 0:
                continue

            deduct_qty = available if available <= remaining else remaining
            await self.inventory_repo.decrement_quantity(
                inventory_id=inventory_entry.inventory_id,
                amount=deduct_qty,
            )

            await self.inventory_usage_log_repo.create(
                {
                    "inventory_id": inventory_entry.inventory_id,
                    "ingredient_id": None,
                    "used_quantity": deduct_qty,
                    "unit": to_unit,
                    "usage_type": "sale",
                    "reference_type": reference_type,
                    "reference_id": reference_id,
                    "used_date": datetime.utcnow(),
                }
            )

            deducted_items.append(
                {
                    "batch_recipe_id": batch_recipe_id,
                    "inventory_id": inventory_entry.inventory_id,
                    "quantity_deducted": float(deduct_qty),
                    "unit": to_unit,
                    "source": "batch",
                }
            )

            remaining -= deduct_qty

        return deducted_items

    async def _create_alert(self, message: str, meta: Optional[Dict[str, Any]] = None) -> None:
        try:
            await self.alerts_service.create_alert(
                alert_type="Inventory:DeductionFailed",
                message=message,
                severity="urgent",
                employee_id=self.employee_id,
                role="system",
                meta=meta or {},
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("[InventoryDeduction] Failed to create alert: %s", exc, exc_info=True)
