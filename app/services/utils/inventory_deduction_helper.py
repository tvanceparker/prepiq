from __future__ import annotations

from app.utils.business_date import sales_day

from app.services.utils.recipe_usage import RecipeUsageExpander
from app.services.utils.inventory_consumption import InventoryConsumption

from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence

from app.core.logging import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_deduction_discrepancies_repo import InventoryDeductionDiscrepancyRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.alerts_repo import AlertRepository
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
        self.db = db
        self.consumption = InventoryConsumption(db, restaurant_id)
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.discrepancy_repo = InventoryDeductionDiscrepancyRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.alert_repo = AlertRepository(db, restaurant_id)
        self.alerts_service = AlertsService(db, restaurant_id, subscription_tier, employee_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)

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
                context["attempted_day"] = sales_day(sale).isoformat()

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
        business_date=None,
    ) -> Dict[str, Any]:
        """Deduct inventory for the provided menu items (typically a single order)."""
        if not menu_items:
            return {"deducted_items": [], "failures": [], "skipped": "no_items"}

        usage_summary = await self.build_usage_summary(menu_items)
        if not usage_summary:
            return {"deducted_items": [], "failures": [], "skipped": "no_usage"}

        return await self._apply_usage_summary(
            usage_summary, reference_type=reference_type, reference_id=reference_id, business_date=business_date
        )

    async def build_usage_summary(
        self, menu_items: Sequence[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        return await self._build_usage_summary(menu_items)

    async def deduct_usage_summary(
        self,
        usage_summary: Sequence[Dict[str, Any]],
        reference_type: str,
        reference_id: int,
    ) -> Dict[str, Any]:
        """Apply a precomputed usage summary (e.g., from EOD aggregation)."""
        if not usage_summary:
            return {"deducted_items": [], "failures": []}
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
                ingredient_leafs, batch_leafs = await self._expand_recipe_usage(
                    mir.recipe_id,
                    quantity,
                )
                for ingredient_id, payload in ingredient_leafs.items():
                    ingredient_totals.setdefault(ingredient_id, Decimal("0"))
                    ingredient_totals[ingredient_id] += payload["quantity"]
                    ingredient_units[ingredient_id] = payload["unit"]

                for batch_recipe_id, total_qty in batch_leafs.items():
                    batch_totals.setdefault(batch_recipe_id, Decimal("0"))
                    batch_totals[batch_recipe_id] += total_qty

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

    async def _expand_recipe_usage(self, recipe_id, multiplier, visited=None):
        raw, batches = await RecipeUsageExpander(
            self.recipe_ingredient_repo, self.ingredient_repo, self.batch_recipe_repo
        ).expand(recipe_id, multiplier, visited)
        ingredients = {}
        for ingredient_id, quantity in raw.items():
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            ingredients[ingredient_id] = {"quantity": quantity, "unit": ingredient.unit or "count"}
        return ingredients, batches

    async def _apply_usage_summary(
        self,
        usage_summary: Sequence[Dict[str, Any]],
        reference_type: str,
        reference_id: int,
        business_date=None,
    ) -> Dict[str, Any]:
        deducted_items: List[Dict[str, Any]] = []
        failures: List[Dict[str, Any]] = []

        business_day = business_date
        if reference_type == "eod_sales":
            business_day = datetime.strptime(str(reference_id), "%Y%m%d").date()
        elif reference_type == "sale":
            sale = await self.sales_repo.get_by_id(reference_id)
            if sale and sale.sale_timestamp:
                business_day = sales_day(sale)
        for usage in usage_summary:
            kind = "ingredient" if usage.get("ingredient_id") else "batch"
            item_id = usage.get("ingredient_id") or usage.get("batch_recipe_id")
            try:
                # A failed item rolls back its movements; other items can commit
                # and are independently idempotent when this reference retries.
                async with self.db.begin_nested():
                    results = await self.consumption.consume(
                        item_kind=kind, item_id=item_id,
                        quantity=Decimal(str(usage["quantity"])), unit=usage["unit"],
                        reference_type=reference_type, reference_id=reference_id,
                        business_date=business_day)
                deducted_items.extend(results)
                await self._resolve_reference_discrepancy(reference_type, reference_id, kind, item_id)
            except Exception as exc:
                failures.append({"usage": usage, "error": str(exc)})
                context = await self._reference_context(reference_type, reference_id)
                await self._record_deduction_discrepancy(
                    message=str(exc), item_kind=kind,
                    meta={**usage, **context, "required_quantity": float(usage["quantity"]),
                          "attempted_day": (business_day or datetime.utcnow().date()).isoformat()})
        return {"deducted_items": deducted_items, "failures": failures}

    @staticmethod
    def _json_metadata(value):
        """Alert JSON must remain serializable when quantities use Decimal."""
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: InventoryDeductionHelper._json_metadata(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [InventoryDeductionHelper._json_metadata(item) for item in value]
        return value

    async def _resolve_reference_discrepancy(self, reference_type, reference_id, kind, item_id):
        discrepancy = await self.discrepancy_repo.get_open_by_reference_item(
            reference_type=reference_type, reference_id=reference_id,
            ingredient_id=item_id if kind == 'ingredient' else None,
            batch_recipe_id=item_id if kind == 'batch' else None)
        if not discrepancy:
            return
        resolved = {'status': 'Resolved', 'is_acknowledged': True, 'date_resolved': datetime.utcnow()}
        await self.discrepancy_repo.update(discrepancy.discrepancy_id, resolved)
        if discrepancy.alert_id is not None:
            await self.alert_repo.update(discrepancy.alert_id, resolved)

    @staticmethod
    def _coerce_float(value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _coerce_optional_int(value: Any) -> Optional[int]:
        if value in (None, "", "null"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _coerce_optional_day(value: Any):
        if value in (None, "", "null"):
            return None
        if hasattr(value, "isoformat"):
            return value
        try:
            return datetime.fromisoformat(str(value)).date()
        except ValueError:
            return None

    async def _record_deduction_discrepancy(
        self,
        *,
        message: str,
        item_kind: str,
        meta: Optional[Dict[str, Any]] = None,
        severity: str = "urgent",
    ) -> None:
        discrepancy_meta = self._json_metadata(meta or {})
        ingredient_id = self._coerce_optional_int(discrepancy_meta.get("ingredient_id"))
        batch_recipe_id = self._coerce_optional_int(discrepancy_meta.get("batch_recipe_id"))
        required_quantity = self._coerce_float(discrepancy_meta.get("required_quantity"))
        available_quantity = self._coerce_float(discrepancy_meta.get("available_quantity"))
        current_quantity_raw = discrepancy_meta.get("current_quantity_on_hand")
        if current_quantity_raw is None:
            current_quantity_on_hand = available_quantity
        else:
            current_quantity_on_hand = self._coerce_float(current_quantity_raw)
        shortfall_quantity = discrepancy_meta.get("shortfall_quantity")
        if shortfall_quantity is None:
            shortfall_quantity = max(required_quantity - current_quantity_on_hand, 0.0)
        else:
            shortfall_quantity = self._coerce_float(shortfall_quantity)

        existing = await self.discrepancy_repo.get_open_by_reference_item(
            reference_type=discrepancy_meta.get("reference_type"),
            reference_id=self._coerce_optional_int(discrepancy_meta.get("reference_id")),
            ingredient_id=ingredient_id,
            batch_recipe_id=batch_recipe_id,
        )

        alert_id = getattr(existing, "alert_id", None)
        if alert_id is not None:
            linked_alert = await self.alert_repo.get_by_id(alert_id)
            if linked_alert:
                await self.alert_repo.update(
                    alert_id,
                    {
                        "message": message,
                        "meta": discrepancy_meta,
                        "severity": severity,
                        "status": "Active",
                        "is_acknowledged": False,
                        "date_resolved": None,
                    },
                )
            else:
                alert_id = None

        if alert_id is None:
            alert_obj = await self.alerts_service.create_alert(
                alert_type="Inventory:DeductionFailed",
                message=message,
                severity=severity,
                employee_id=self.employee_id,
                role="system",
                meta=discrepancy_meta,
            )
            alert_id = self._coerce_optional_int(alert_obj.get("alert_id"))

        payload = {
            "alert_id": alert_id,
            "message": message,
            "severity": severity,
            "status": "Active",
            "is_acknowledged": False,
            "date_resolved": None,
            "item_kind": item_kind,
            "ingredient_id": ingredient_id,
            "batch_recipe_id": batch_recipe_id,
            "item_name": discrepancy_meta.get("ingredient_name") or discrepancy_meta.get("batch_recipe_name"),
            "unit": discrepancy_meta.get("unit"),
            "required_quantity": required_quantity,
            "available_quantity": available_quantity,
            "current_quantity_on_hand": current_quantity_on_hand,
            "shortfall_quantity": shortfall_quantity,
            "reference_type": discrepancy_meta.get("reference_type"),
            "reference_id": self._coerce_optional_int(discrepancy_meta.get("reference_id")),
            "attempted_day": self._coerce_optional_day(discrepancy_meta.get("attempted_day")),
        }

        if existing:
            await self.discrepancy_repo.update(existing.discrepancy_id, payload)
        else:
            await self.discrepancy_repo.create(payload)

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
