# core/services/inventory_service.py

from typing import Any, Dict, List, Optional, Union
from decimal import Decimal
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.supplier_repo import SupplierRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.lead_time_data_repo import LeadTimeDataRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.purchase_orders_repo import PurchaseOrderRepository
from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
from app.repositories.alerts_repo import AlertRepository
from app.repositories.inventory_deduction_discrepancies_repo import InventoryDeductionDiscrepancyRepository
from app.repositories.ingredient_forecast_breakdown_repo import IngredientForecastBreakdownRepository
from app.repositories.forecast_run_ledger_repo import ForecastRunLedgerRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.services.utils.unit_conversion import convert_unit, round_decimal
from app.services.utils.purchase_order_note_helper import (
    build_purchase_order_explanation_item,
    build_purchase_order_review_context,
    parse_purchase_order_notes,
    serialize_purchase_order_notes,
)
from app.services.utils.forecast_contract import build_forecast_contract

class InventoryService:
    UNSPECIFIED_SUPPLIER_NAME = "Unspecified supplier"

    def _classify_receipt_variance(
        self,
        quantity_ordered: Union[Decimal, float, int],
        quantity_received: Optional[Union[Decimal, float, int]],
    ) -> tuple[Optional[float], Optional[str]]:
        if quantity_received is None:
            return None, None

        ordered_value = float(quantity_ordered or 0)
        received_value = float(quantity_received)
        variance_value = received_value - ordered_value

        if abs(variance_value) < 1e-9:
            variance_status = "matched"
        elif variance_value < 0:
            variance_status = "short"
        else:
            variance_status = "over"

        return variance_value, variance_status

    async def _resolve_purchase_order_item_received_quantity(
        self,
        item,
        po_status: Optional[str] = None,
    ) -> Optional[float]:
        if getattr(item, "quantity_received", None) is not None:
            return float(item.quantity_received)

        if po_status == "delivered":
            existing_lot = await self.inventory_lot_repo.get_by_purchase_order_item_id(
                item.order_item_id
            )
            if existing_lot and getattr(existing_lot, "total_received", None) is not None:
                return float(existing_lot.total_received)

        return None

    async def _serialize_purchase_order_item(self, item, po_status: Optional[str] = None) -> dict:
        ingredient = await self.ingredient_repo.get_by_id(item.ingredient_id)
        quantity_received = await self._resolve_purchase_order_item_received_quantity(item, po_status)
        variance_quantity, variance_status = self._classify_receipt_variance(
            item.quantity_ordered,
            quantity_received,
        )

        return {
            "order_item_id": item.order_item_id,
            "order_id": item.order_id,
            "ingredient_id": item.ingredient_id,
            "ingredient_name": ingredient.name if ingredient else "Unknown",
            "ingredient_supplier_id": item.ingredient_supplier_id,
            "quantity_ordered": float(item.quantity_ordered),
            "quantity_received": quantity_received,
            "variance_quantity": variance_quantity,
            "variance_status": variance_status,
            "unit": item.unit,
            "unit_price": float(item.unit_price),
            "total_item_price": float(item.total_item_price),
        }

    def _build_received_quantity_map(
        self,
        items: List[Any],
        received_items: Optional[List[dict]] = None,
    ) -> Dict[int, float]:
        available_item_ids = {item.order_item_id for item in items}
        received_quantity_map: Dict[int, float] = {}

        for received_item in received_items or []:
            order_item_id = received_item["order_item_id"]
            if order_item_id not in available_item_ids:
                raise ValueError(
                    f"Purchase order item {order_item_id} does not belong to this purchase order."
                )

            quantity_received = float(received_item["quantity_received"])
            if quantity_received <= 0:
                raise ValueError(
                    f"Received quantity for purchase order item {order_item_id} must be greater than 0."
                )

            received_quantity_map[order_item_id] = quantity_received

        return received_quantity_map

    # --- Purchase Orders ---
    async def create_purchase_order(
        self,
        supplier_id: Optional[int],
        expected_delivery_date,
        items: list,
        notes: str = None,
        *,
        review_context: Optional[dict] = None,
        system_note: Optional[str] = None,
    ) -> dict:
        """
        Create a new purchase order with items.
        """
        import datetime
        async with self.db.begin():
            order_date = datetime.date.today()
            po_data = {
                "restaurant_id": self.restaurant_id,
                "supplier_id": supplier_id,
                "order_date": order_date,
                "expected_delivery_date": expected_delivery_date,
                "status": "cart",
                "total_order_price": 0.0,
                "notes": serialize_purchase_order_notes(
                    user_note=notes,
                    system_note=system_note,
                    review_context=review_context,
                ),
            }
            po = await self.purchase_order_repo.create(po_data)
            total = 0.0
            item_objs = []
            for item in items:
                item_data = {
                    "restaurant_id": self.restaurant_id,
                    "order_id": po.order_id,
                    "ingredient_id": item["ingredient_id"],
                    "ingredient_supplier_id": item.get("ingredient_supplier_id"),
                    "quantity_ordered": item["quantity_ordered"],
                    "unit": item["unit"],
                    "unit_price": item["unit_price"],
                    "total_item_price": float(item["quantity_ordered"]) * float(item["unit_price"]),
                }
                total += item_data["total_item_price"]
                item_obj = await self.purchase_order_item_repo.create(item_data)
                item_objs.append(item_obj)
            await self.purchase_order_repo.update(po.order_id, {"total_order_price": total})
        return {"order_id": po.order_id, "total_order_price": total, "status": "cart"}

    async def get_purchase_orders(self, status: str = None, supplier_id: int = None) -> list:
        """
        List purchase orders, optionally filter by status or supplier.
        """
        pos = await self.purchase_order_repo.list_purchase_orders(
            status=status,
            supplier_id=supplier_id,
        )
        result = []
        for po in pos:
            supplier = await self.supplier_repo.get_by_id(po.supplier_id) if po.supplier_id else None
            items = await self.purchase_order_item_repo.get_by_field("order_id", po.order_id)
            parsed_notes = parse_purchase_order_notes(getattr(po, "notes", None))
            item_dtos = []
            for item in items:
                item_dtos.append(await self._serialize_purchase_order_item(item, po.status))
            expected_delivery_stale = bool(
                po.expected_delivery_date
                and po.status in {"cart", "pending"}
                and po.expected_delivery_date < date.today()
            )
            result.append({
                "order_id": po.order_id,
                "restaurant_id": po.restaurant_id,
                "supplier_id": po.supplier_id,
                "supplier_name": supplier.name if supplier else self.UNSPECIFIED_SUPPLIER_NAME,
                "order_date": po.order_date,
                "expected_delivery_date": po.expected_delivery_date,
                "actual_delivery_date": po.actual_delivery_date,
                "status": po.status,
                "total_order_price": float(po.total_order_price),
                "items": item_dtos,
                "notes": parsed_notes["user_note"],
                "expected_delivery_stale": expected_delivery_stale,
                "expected_delivery_status_message": (
                    "Expected delivery date is in the past. Review before submitting or receiving this order."
                    if expected_delivery_stale
                    else None
                ),
                "review_context": parsed_notes["review_context"],
            })
        return result

    async def get_purchase_order_detail(self, order_id: int) -> dict:
        """
        Get a single purchase order with items.
        """
        po = await self.purchase_order_repo.get_by_id(order_id)
        if not po:
            return None
        supplier = await self.supplier_repo.get_by_id(po.supplier_id) if po.supplier_id else None
        items = await self.purchase_order_item_repo.get_by_field("order_id", po.order_id)
        parsed_notes = parse_purchase_order_notes(getattr(po, "notes", None))
        item_dtos = []
        for item in items:
            item_dtos.append(await self._serialize_purchase_order_item(item, po.status))
        expected_delivery_stale = bool(
            po.expected_delivery_date
            and po.status in {"cart", "pending"}
            and po.expected_delivery_date < date.today()
        )
        return {
            "order_id": po.order_id,
            "restaurant_id": po.restaurant_id,
            "supplier_id": po.supplier_id,
            "supplier_name": supplier.name if supplier else self.UNSPECIFIED_SUPPLIER_NAME,
            "order_date": po.order_date,
            "expected_delivery_date": po.expected_delivery_date,
            "actual_delivery_date": po.actual_delivery_date,
            "status": po.status,
            "total_order_price": float(po.total_order_price),
            "items": item_dtos,
            "notes": parsed_notes["user_note"],
            "expected_delivery_stale": expected_delivery_stale,
            "expected_delivery_status_message": (
                "Expected delivery date is in the past. Review before submitting or receiving this order."
                if expected_delivery_stale
                else None
            ),
            "review_context": parsed_notes["review_context"],
        }

    async def update_purchase_order_status(self, order_id: int, status: str) -> dict:
        """
        Update the status of a purchase order (cart, pending, delivered, etc).
        """
        if status == "delivered":
            return await self.receive_purchase_order(order_id)

        purchase_order = await self.purchase_order_repo.get_by_id(order_id)
        if not purchase_order:
            raise ValueError(f"Purchase order {order_id} not found.")

        update_payload: Dict[str, Any] = {"status": status}
        expected_delivery_refreshed = False

        if status == "pending":
            refreshed_expected_delivery = await self._calculate_expected_delivery_for_order(order_id)
            if refreshed_expected_delivery and (
                purchase_order.expected_delivery_date is None
                or purchase_order.expected_delivery_date < date.today()
            ):
                update_payload["expected_delivery_date"] = refreshed_expected_delivery
                expected_delivery_refreshed = True

        await self.purchase_order_repo.update(order_id, update_payload)
        return {
            "order_id": order_id,
            "status": status,
            "expected_delivery_date": update_payload.get(
                "expected_delivery_date",
                purchase_order.expected_delivery_date,
            ),
            "expected_delivery_refreshed": expected_delivery_refreshed,
        }

    async def _calculate_expected_delivery_for_order(self, order_id: int) -> Optional[date]:
        items = await self.purchase_order_item_repo.get_by_field("order_id", order_id)
        if not items:
            return None

        max_lead_time = 0
        for item in items:
            if not getattr(item, "ingredient_supplier_id", None):
                continue
            ingredient_supplier = await self.ingredient_supplier_repo.get_by_id(
                item.ingredient_supplier_id
            )
            if not ingredient_supplier:
                continue
            max_lead_time = max(max_lead_time, int(ingredient_supplier.lead_time_days or 0))

        return date.today() + timedelta(days=max_lead_time)

    async def receive_purchase_order(
        self,
        order_id: int,
        actual_delivery_date: Optional[date] = None,
        received_items: Optional[List[dict]] = None,
    ) -> dict:
        """
        Receive a purchase order into inventory.

        A receipt creates inventory lots first, then rolls the received quantity
        into the aggregate inventory row and stamps the PO as delivered.
        """
        purchase_order = await self.purchase_order_repo.get_by_id(order_id)
        if not purchase_order:
            raise ValueError(f"Purchase order {order_id} not found.")

        if (
            purchase_order.actual_delivery_date
            and actual_delivery_date
            and purchase_order.actual_delivery_date != actual_delivery_date
        ):
            raise ValueError(
                f"Purchase order {order_id} was already received on "
                f"{purchase_order.actual_delivery_date.isoformat()}; delivery date cannot be changed."
            )

        items = await self.purchase_order_item_repo.get_by_field("order_id", order_id)
        if not items:
            raise ValueError(f"Purchase order {order_id} has no items to receive.")

        received_quantity_map = self._build_received_quantity_map(items, received_items)

        delivery_date = actual_delivery_date or purchase_order.actual_delivery_date or date.today()
        if self.db.in_transaction():
            return await self._finalize_purchase_order_receipt(
                order_id=order_id,
                items=items,
                delivery_date=delivery_date,
                purchase_order=purchase_order,
                received_quantity_map=received_quantity_map,
            )

        async with self.db.begin():
            return await self._finalize_purchase_order_receipt(
                order_id=order_id,
                items=items,
                delivery_date=delivery_date,
                purchase_order=purchase_order,
                received_quantity_map=received_quantity_map,
            )

    async def _finalize_purchase_order_receipt(
        self,
        order_id: int,
        items: list,
        delivery_date: date,
        purchase_order,
        received_quantity_map: Optional[Dict[int, float]] = None,
    ) -> dict:
        received_items = []
        newly_received_count = 0
        already_received_count = 0
        received_quantity_map = received_quantity_map or {}

        for item in items:
            quantity_ordered = float(item.quantity_ordered)
            requested_received_quantity = received_quantity_map.get(
                item.order_item_id,
                quantity_ordered,
            )
            existing_lot = await self.inventory_lot_repo.get_by_purchase_order_item_id(
                item.order_item_id
            )
            if existing_lot:
                already_received_count += 1
                existing_received_quantity = float(
                    getattr(item, "quantity_received", None)
                    or getattr(existing_lot, "total_received", None)
                    or 0
                )
                if getattr(item, "quantity_received", None) is None and getattr(
                    existing_lot,
                    "total_received",
                    None,
                ) is not None:
                    await self.purchase_order_item_repo.update(
                        item.order_item_id,
                        {"quantity_received": existing_lot.total_received},
                    )
                variance_quantity, variance_status = self._classify_receipt_variance(
                    quantity_ordered,
                    existing_received_quantity,
                )
                received_items.append(
                    {
                        "order_item_id": item.order_item_id,
                        "ingredient_id": item.ingredient_id,
                        "lot_id": existing_lot.lot_id,
                        "quantity_ordered": quantity_ordered,
                        "quantity_received": existing_received_quantity,
                        "variance_quantity": variance_quantity or 0.0,
                        "variance_status": variance_status or "matched",
                        "unit": item.unit,
                        "receipt_status": "already_received",
                    }
                )
                continue

            if not item.ingredient_supplier_id:
                raise ValueError(
                    f"Purchase order item {item.order_item_id} is missing ingredient_supplier_id required for receipt."
                )

            receipt = await self._create_inventory_receipt(
                ingredient_supplier_id=item.ingredient_supplier_id,
                total_received=requested_received_quantity,
                delivery_date=delivery_date,
                receipt_source="purchase_order",
                purchase_order_id=order_id,
                purchase_order_item_id=item.order_item_id,
            )
            await self.purchase_order_item_repo.update(
                item.order_item_id,
                {"quantity_received": Decimal(str(requested_received_quantity))},
            )
            newly_received_count += 1
            variance_quantity, variance_status = self._classify_receipt_variance(
                quantity_ordered,
                requested_received_quantity,
            )
            received_items.append(
                {
                    "order_item_id": item.order_item_id,
                    "ingredient_id": item.ingredient_id,
                    "lot_id": receipt["lot_id"],
                    "quantity_ordered": quantity_ordered,
                    "quantity_received": requested_received_quantity,
                    "variance_quantity": variance_quantity or 0.0,
                    "variance_status": variance_status or "matched",
                    "unit": item.unit,
                    "receipt_status": "received",
                }
            )

        if (
            purchase_order.status != "delivered"
            or purchase_order.actual_delivery_date != delivery_date
        ):
            await self.purchase_order_repo.update(
                order_id,
                {"status": "delivered", "actual_delivery_date": delivery_date},
            )

        receipt_mode = "received"
        if newly_received_count == 0 and already_received_count > 0:
            receipt_mode = "already_received"
        elif newly_received_count > 0 and already_received_count > 0:
            receipt_mode = "resumed"

        return {
            "order_id": order_id,
            "status": "delivered",
            "actual_delivery_date": delivery_date,
            "receipt_mode": receipt_mode,
            "requested_item_count": len(items),
            "newly_received_item_count": newly_received_count,
            "already_received_item_count": already_received_count,
            "received_items": received_items,
        }

    async def add_item_to_purchase_order(self, order_id: int, item: dict) -> dict:
        """
        Add an item to an existing purchase order.
        """
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository

        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)
        item_data = {
            "restaurant_id": self.restaurant_id,
            "order_id": order_id,
            "ingredient_id": item["ingredient_id"],
            "ingredient_supplier_id": item.get("ingredient_supplier_id"),
            "quantity_ordered": item["quantity_ordered"],
            "unit": item["unit"],
            "unit_price": item["unit_price"],
            "total_item_price": float(item["quantity_ordered"]) * float(item["unit_price"]),
        }
        obj = await poi_repo.create(item_data)
        items = await poi_repo.get_by_field("order_id", order_id)
        new_total = sum(float(it.total_item_price) for it in items)
        await po_repo.update(order_id, {"total_order_price": new_total})
        return {"order_item_id": obj.order_item_id, "order_total_price": new_total}

    async def remove_item_from_purchase_order(self, order_id: int, order_item_id: int) -> dict:
        """
        Remove an item from a purchase order.
        """
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository

        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)

        await poi_repo.delete(order_item_id)

        # Recalculate order total after removal
        items = await poi_repo.get_by_field("order_id", order_id)
        new_total = sum(float(it.total_item_price) for it in items)
        await po_repo.update(order_id, {"total_order_price": new_total})

        return {"order_item_id": order_item_id, "removed": True, "order_total_price": new_total}

    async def update_purchase_order_item(self, order_id: int, order_item_id: int, updates: dict) -> dict:
        """
        Update fields on a purchase order item and recalculate order total.
        """
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository

        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)

        item = await poi_repo.get_by_id(order_item_id)
        if not item or item.order_id != order_id:
            return None

        # Prepare update payload
        update_data = {}
        if "quantity_ordered" in updates and updates["quantity_ordered"] is not None:
            update_data["quantity_ordered"] = updates["quantity_ordered"]
        if "unit_price" in updates and updates["unit_price"] is not None:
            update_data["unit_price"] = updates["unit_price"]
        if "unit" in updates and updates["unit"] is not None:
            update_data["unit"] = updates["unit"]
        if "ingredient_supplier_id" in updates and updates["ingredient_supplier_id"] is not None:
            update_data["ingredient_supplier_id"] = updates["ingredient_supplier_id"]

        # Always recompute line total using latest quantity/price
        qty = update_data.get("quantity_ordered", item.quantity_ordered)
        price = update_data.get("unit_price", item.unit_price)
        update_data["total_item_price"] = float(qty) * float(price)

        updated_item = await poi_repo.update(order_item_id, update_data)
        if not updated_item:
            return None

        # Recalculate purchase order total
        items = await poi_repo.get_by_field("order_id", order_id)
        new_total = sum(float(it.total_item_price) for it in items)
        await po_repo.update(order_id, {"total_order_price": new_total})

        return {
            "order_item_id": updated_item.order_item_id,
            "order_id": updated_item.order_id,
            "ingredient_id": updated_item.ingredient_id,
            "ingredient_supplier_id": updated_item.ingredient_supplier_id,
            "quantity_ordered": float(updated_item.quantity_ordered),
            "unit": updated_item.unit,
            "unit_price": float(updated_item.unit_price),
            "total_item_price": float(updated_item.total_item_price),
            "order_total_price": new_total,
        }

    async def generate_purchase_order_suggestions(
        self, 
        horizon_days: int = 7, 
        use_cached_forecast: bool = True
    ) -> dict:
        """
        Generate PO suggestions based on forecast data.
        
        Args:
            horizon_days: Number of days to forecast for ordering
            use_cached_forecast: If True, use cached forecast from last EOD run.
                                If False, run fresh forecast (slower but more accurate).
        
        Returns:
            dict with 'suggestions' grouped by supplier, 'last_eod_run_date', and 'forecast_source'
        """
        import math
        from decimal import Decimal
        from app.repositories.restaurants_repo import RestaurantRepository
        from app.services.reorder_forecast_engine import ReorderForecastEngine
        from app.services.forecasting_engine import ForecastingEngine
        from app.core.logging import logger

        restaurant_repo = RestaurantRepository(self.db, self.restaurant_id)
        reorder_engine = ReorderForecastEngine(self.db, self.restaurant_id, self.subscription_tier)

        restaurant = await restaurant_repo.get_by_id(self.restaurant_id)
        last_eod_run_date = getattr(restaurant, 'last_eod_run_date', None)
        resolved_cached_run_date = await self._resolve_cached_forecast_run_date(last_eod_run_date)

        ingredient_forecast: Dict[int, Dict[str, Any]] = {}
        recent_eod_metadata = await self._get_forecast_batch_metadata(resolved_cached_run_date)
        forecast_state = self._build_forecast_state(
            forecast_source="cached" if use_cached_forecast else "fresh",
            forecast_source_type="eod" if use_cached_forecast else "on_demand",
            forecast_run_date=resolved_cached_run_date if use_cached_forecast else None,
            forecast_generated_at=None,
            forecast_reused=use_cached_forecast,
            forecast_stale=False,
            forecast_status="ready",
            forecast_status_message=(
                "Using the latest finalized EOD forecast for reorder suggestions."
                if use_cached_forecast
                else "Using a fresh on-demand forecast preview for reorder suggestions."
            ),
            **(recent_eod_metadata if use_cached_forecast else {"forecast_confidence_score": None, "forecast_version": None}),
        )

        async def load_recent_eod_forecast() -> tuple[Dict[int, Dict[str, Any]], Optional[Any], Optional[date]]:
            effective_run_date = await self._resolve_cached_forecast_run_date(last_eod_run_date)
            if effective_run_date is None:
                return {}, None, None

            ledger = await self._get_last_eod_ledger(effective_run_date)
            if not ledger or not getattr(ledger, "finalized", False):
                return {}, ledger, effective_run_date
            cached_forecast = await self._load_cached_ingredient_forecast(
                horizon_days=horizon_days,
                ledger_finished_at=getattr(ledger, "finished_at", None),
            )
            return cached_forecast, ledger, effective_run_date

        if use_cached_forecast:
            cached_forecast, ledger, effective_run_date = await load_recent_eod_forecast()
            ingredient_forecast = cached_forecast
            forecast_state["forecast_generated_at"] = self._serialize_forecast_timestamp(
                getattr(ledger, "finished_at", None) or effective_run_date
            )
            forecast_state["forecast_stale"] = self._is_forecast_stale(
                preferred_run_date=last_eod_run_date,
                authoritative_run_date=effective_run_date,
            )

            if ingredient_forecast:
                if forecast_state["forecast_stale"]:
                    forecast_state["forecast_status"] = "stale"
                    forecast_state["forecast_status_message"] = (
                        f"Using the most recent finalized EOD forecast from {effective_run_date.isoformat()}. "
                        "A newer EOD cycle still needs to finalize before this forecast becomes current."
                    )
                else:
                    forecast_state["forecast_status"] = "ready"
                    forecast_state["forecast_status_message"] = (
                        "Using the latest finalized EOD forecast for reorder suggestions."
                    )
            else:
                forecast_state["forecast_status"] = "failed"
                forecast_state["forecast_status_message"] = (
                    "The latest finalized EOD forecast did not include reusable ingredient breakdowns."
                    if effective_run_date is not None and ledger and getattr(ledger, "finalized", False)
                    else "No finalized EOD forecast was available to reuse."
                )
        else:
            forecasting_engine = ForecastingEngine(
                self.db, self.restaurant_id, self.subscription_tier
            )
            try:
                await forecasting_engine.initialize()
                ingredient_forecast = await forecasting_engine.run_forecasting_pipeline(
                    horizon_days=horizon_days,
                    reorder_horizon_days=horizon_days,
                )
                forecast_state["forecast_generated_at"] = self._serialize_forecast_timestamp(
                    datetime.utcnow()
                )
                forecast_state["forecast_reused"] = False
                forecast_state.update(await self._get_forecast_batch_metadata(date.today()))
                forecast_state["forecast_status_message"] = (
                    "Using a fresh on-demand forecast preview for reorder suggestions."
                )

                if not ingredient_forecast:
                    cached_forecast, ledger, effective_run_date = await load_recent_eod_forecast()
                    if cached_forecast:
                        cached_forecast_stale = self._is_forecast_stale(
                            preferred_run_date=last_eod_run_date,
                            authoritative_run_date=effective_run_date,
                        )
                        ingredient_forecast = cached_forecast
                        forecast_state.update(
                            self._build_forecast_state(
                                forecast_source="cached",
                                forecast_source_type="eod",
                                forecast_generated_at=self._serialize_forecast_timestamp(
                                    getattr(ledger, "finished_at", None) or effective_run_date
                                ),
                                forecast_reused=True,
                                forecast_stale=cached_forecast_stale,
                                forecast_status="degraded",
                                forecast_status_message=(
                                    "Fresh forecast returned no usable output. Using the latest finalized EOD forecast instead."
                                    if not cached_forecast_stale
                                    else (
                                        f"Fresh forecast returned no usable output. Using the most recent finalized EOD forecast from {effective_run_date.isoformat()} until the newer cycle finalizes."
                                    )
                                ),
                                **recent_eod_metadata,
                            )
                        )
                    else:
                        forecast_state["forecast_status"] = "failed"
                        forecast_state["forecast_status_message"] = (
                            "Fresh forecast produced no usable output and no finalized EOD forecast was available."
                        )
            except Exception as exc:
                logger.exception("[PO_SUGGEST] Fresh forecast failed: %s", exc)
                cached_forecast, ledger, effective_run_date = await load_recent_eod_forecast()
                if cached_forecast:
                    cached_forecast_stale = self._is_forecast_stale(
                        preferred_run_date=last_eod_run_date,
                        authoritative_run_date=effective_run_date,
                    )
                    ingredient_forecast = cached_forecast
                    forecast_state.update(
                        self._build_forecast_state(
                            forecast_source="cached",
                            forecast_source_type="eod",
                            forecast_generated_at=self._serialize_forecast_timestamp(
                                getattr(ledger, "finished_at", None) or effective_run_date
                            ),
                            forecast_reused=True,
                            forecast_stale=cached_forecast_stale,
                            forecast_status="degraded",
                            forecast_status_message=(
                                "Fresh forecast failed. Using the latest finalized EOD forecast instead."
                                if not cached_forecast_stale
                                else (
                                    f"Fresh forecast failed. Using the most recent finalized EOD forecast from {effective_run_date.isoformat()} until the newer cycle finalizes."
                                )
                            ),
                            **recent_eod_metadata,
                        )
                    )
                else:
                    forecast_state["forecast_status"] = "failed"
                    forecast_state["forecast_status_message"] = (
                        "Fresh forecast failed and no finalized EOD forecast was available."
                    )

        if not ingredient_forecast:
            return {
                "suggestions": [],
                "all_items": [],
                "last_eod_run_date": str(resolved_cached_run_date) if resolved_cached_run_date else None,
                "horizon_days": horizon_days,
                **forecast_state,
            }
        
        # Generate suggestions from forecast
        suggestions_by_supplier = {}
        all_suggestions = []
        
        for ingredient_id in ingredient_forecast.keys():
            suppliers = await self.ingredient_supplier_repo.get_all_by_ingredient_id(ingredient_id)
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            ingredient_name = ingredient.name if ingredient else f"Ingredient {ingredient_id}"

            supplier = None
            ingredient_supplier_id = None
            supplier_id = None
            supplier_name = self.UNSPECIFIED_SUPPLIER_NAME
            supplier_unit = ingredient_forecast[ingredient_id].get("unit", "unit")
            lead_time = 0
            min_order_quantity = Decimal("0.00")
            pack_size = 1
            quantity_per_pack_item = Decimal("1.00")
            supplier_selection = {
                "reason_code": "unspecified_supplier",
                "preferred_supplier_available": False,
                "selected_supplier_priority": None,
                "selected_supplier_preferred": False,
                "pricing_available": False,
            }

            if suppliers:
                supplier_selection = await reorder_engine.choose_supplier_option(suppliers)
                if not supplier_selection:
                    continue

                supplier = supplier_selection["supplier"]
                ingredient_supplier_id = supplier.ingredient_supplier_id
                supplier_id = supplier.supplier_id
                lead_time = supplier.lead_time_days or 0
                supplier_unit = supplier.unit or supplier_unit
                min_order_quantity = Decimal(str(supplier.min_order_quantity or 0)).quantize(
                    Decimal("0.01")
                )
                pack_size = supplier.pack_size or 1
                quantity_per_pack_item = Decimal(str(supplier.quantity_per_pack_item or 1)).quantize(
                    Decimal("0.01")
                )

                supplier_obj = await self.supplier_repo.get_by_id(supplier_id)
                supplier_name = supplier_obj.name if supplier_obj else f"Supplier {supplier_id}"
            else:
                logger.info(
                    "[PO_SUGGEST] No suppliers configured for ingredient=%s; using unspecified supplier fallback",
                    ingredient_id,
                )

            inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
            if inventory:
                if inventory.shelf_life_days is not None:
                    shelf_life = inventory.shelf_life_days
                    shelf_life_source = "inventory"
                elif supplier and supplier.shelf_life_days is not None:
                    shelf_life = supplier.shelf_life_days
                    shelf_life_source = "supplier"
                elif not suppliers:
                    shelf_life = horizon_days
                    shelf_life_source = "forecast_horizon"
                else:
                    shelf_life = 0
                    shelf_life_source = "missing_assumed_zero"
                inventory_unit = inventory.unit
                current_stock = Decimal(str(inventory.quantity_on_hand or 0)).quantize(
                    Decimal("0.01")
                )
                inventory_source = "inventory_summary"
            else:
                shelf_life = supplier.shelf_life_days if supplier and supplier.shelf_life_days is not None else horizon_days
                inventory_unit = supplier_unit
                current_stock = Decimal("0.00")
                shelf_life_source = (
                    "supplier"
                    if supplier and supplier.shelf_life_days is not None
                    else "forecast_horizon"
                )
                inventory_source = "missing_assumed_zero"

            reorder_days = lead_time + shelf_life
            if reorder_days <= 0:
                continue
            
            today = date.today()
            lead_window = [today + timedelta(days=i) for i in range(lead_time)]
            shelf_window = [today + timedelta(days=i) for i in range(lead_time, reorder_days)]
            
            daily_forecast = ingredient_forecast[ingredient_id].get("daily_breakdown", [])
            unit = ingredient_forecast[ingredient_id].get("unit", "?")

            lead_demand = sum(qty for day, qty in daily_forecast if day in lead_window)
            shelf_demand = sum(qty for day, qty in daily_forecast if day in shelf_window)
            total_demand = lead_demand + shelf_demand

            decision = await reorder_engine.build_reorder_decision(
                ingredient_id=ingredient_id,
                lead_demand=Decimal(str(lead_demand)),
                shelf_demand=Decimal(str(shelf_demand)),
                total_demand=Decimal(str(total_demand)),
                unit=unit,
                lead_time=lead_time,
                current_stock=current_stock,
                current_unit=inventory_unit or supplier_unit,
                moq=min_order_quantity,
                manage_alerts=True,
            )

            if not decision["should_reorder"]:
                continue

            # Convert units
            unit_conversion_fallback = False
            try:
                converted_qty = Decimal(
                    str(
                        convert_unit(
                            float(decision["final_quantity"]),
                            from_unit=inventory_unit,
                            to_unit=supplier_unit,
                        )
                    )
                ).quantize(Decimal("0.01"))
            except Exception as e:
                logger.warning(f"[PO_SUGGEST] Unit conversion failed ingredient={ingredient_id} error={e}")
                converted_qty = decision["final_quantity"]
                unit_conversion_fallback = True

            # Round up to pack sizes
            quantity_per_pack = (
                Decimal(str(pack_size or 1)) * quantity_per_pack_item
            ).quantize(Decimal("0.01"))
            if quantity_per_pack <= 0:
                continue

            packs_to_order = math.ceil(float(converted_qty / quantity_per_pack))
            total_quantity_ordered = (quantity_per_pack * Decimal(packs_to_order)).quantize(
                Decimal("0.01")
            )

            # Get ingredient and supplier names
            explanation = reorder_engine.build_explanation_payload(
                decision=decision,
                supplier_selection=supplier_selection,
                supplier_name=supplier_name,
                inventory_unit=inventory_unit,
                supplier_unit=supplier_unit,
                converted_quantity_needed=converted_qty,
                pack_size=pack_size,
                quantity_per_pack_item=quantity_per_pack_item,
                packs_to_order=packs_to_order,
                total_quantity_ordered=total_quantity_ordered,
                assumption_flags={
                    "inventory_source": inventory_source,
                    "lead_time_source": (
                        "supplier"
                        if supplier and supplier.lead_time_days is not None
                        else ("no_supplier_assumed_zero" if not suppliers else "missing_assumed_zero")
                    ),
                    "moq_source": (
                        "supplier"
                        if supplier and supplier.min_order_quantity is not None
                        else ("no_supplier_assumed_zero" if not suppliers else "missing_assumed_zero")
                    ),
                    "shelf_life_source": shelf_life_source,
                    "unit_conversion_fallback": unit_conversion_fallback,
                    "pricing_missing": supplier is None or supplier.cost_per_unit is None,
                },
            )

            suggestion = {
                "ingredient_id": ingredient_id,
                "ingredient_name": ingredient_name,
                "ingredient_supplier_id": ingredient_supplier_id,
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "current_stock": float(decision["current_stock"]),
                "raw_quantity_needed": float(converted_qty),
                "quantity_to_order": float(total_quantity_ordered),
                "packs_to_order": packs_to_order,
                "pack_size": pack_size,
                "quantity_per_pack_item": float(quantity_per_pack_item),
                "unit": supplier_unit,
                "unit_price": float(supplier.cost_per_unit or 0) if supplier else 0.0,
                "line_total": float(total_quantity_ordered) * (float(supplier.cost_per_unit or 0) if supplier else 0.0),
                "lead_time_days": lead_time,
                "min_order_quantity": float(min_order_quantity),
                "lead_demand": float(lead_demand),
                "shelf_demand": float(shelf_demand),
                "explanation": explanation,
            }
            
            all_suggestions.append(suggestion)
            
            # Group by supplier
            if supplier_id not in suggestions_by_supplier:
                suggestions_by_supplier[supplier_id] = {
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "items": [],
                    "total_cost": 0,
                }
            
            item_cost = float(total_quantity_ordered) * (float(supplier.cost_per_unit or 0) if supplier else 0.0)
            suggestions_by_supplier[supplier_id]["items"].append(suggestion)
            suggestions_by_supplier[supplier_id]["total_cost"] += item_cost
        
        return {
            "suggestions": list(suggestions_by_supplier.values()),
            "all_items": all_suggestions,
            "last_eod_run_date": str(resolved_cached_run_date) if resolved_cached_run_date else None,
            "horizon_days": horizon_days,
            **forecast_state,
        }

    async def get_ingredient_suppliers(self, ingredient_id: int) -> list:
        """
        Get all suppliers for a specific ingredient with pricing and pack details.
        """
        from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
        from app.repositories.ingredients_repo import IngredientRepository
        
        ingredient_supplier_repo = IngredientSupplierRepository(self.db, self.restaurant_id)
        ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
        
        ingredient = await ingredient_repo.get_by_id(ingredient_id)
        if not ingredient:
            return []
        
        suppliers = await ingredient_supplier_repo.get_all_by_ingredient_id(ingredient_id)
        
        result = []
        for s in suppliers:
            supplier_obj = await self.supplier_repo.get_by_id(s.supplier_id)
            supplier_name = supplier_obj.name if supplier_obj else f"Supplier {s.supplier_id}"
            
            result.append({
                "ingredient_supplier_id": s.ingredient_supplier_id,
                "supplier_id": s.supplier_id,
                "supplier_name": supplier_name,
                "ingredient_id": ingredient_id,
                "ingredient_name": ingredient.name,
                "unit": s.unit,
                "unit_price": float(s.cost_per_unit or 0),
                "pack_size": s.pack_size or 1,
                "pack_unit": s.unit,  # Use the supplier unit as pack unit
                "quantity_per_pack_item": float(s.quantity_per_pack_item or 1),
                "min_order_quantity": s.min_order_quantity or 0,
                "lead_time_days": s.lead_time_days or 0,
                "is_preferred": s.preferred or False,
                "supplier_priority": s.supplier_priority or 0,
            })
        
        return result

    async def get_ingredients_with_stock_levels(self) -> list:
        """
        Get all ingredients with current stock levels and reorder status.
        """
        from app.repositories.ingredients_repo import IngredientRepository
        from app.repositories.inventory_repo import InventoryRepository
        from app.services.inventory_stats_service import InventoryStatsService
        
        ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
        inventory_repo = InventoryRepository(self.db, self.restaurant_id)
        stats_service = InventoryStatsService(self.db, self.restaurant_id, self.subscription_tier)
        
        ingredients = await ingredient_repo.get_all()
        result = []
        
        for ing in ingredients:
            inventory = await inventory_repo.get_inventory_by_ingredient(ing.ingredient_id)
            
            current_stock = float(inventory.quantity_on_hand) if inventory else 0
            unit = inventory.unit if inventory else "unit"
            
            # Get reorder point
            try:
                reorder_point = await stats_service.get_reorder_point(ing.ingredient_id)
                reorder_point = float(reorder_point) if reorder_point else 0
            except:
                reorder_point = 0
            
            # Determine status
            if current_stock <= 0:
                status = "critical"
            elif reorder_point > 0 and current_stock <= reorder_point:
                status = "low"
            elif reorder_point > 0 and current_stock <= reorder_point * 1.5:
                status = "warning"
            else:
                status = "ok"
            
            # Count suppliers
            suppliers = await self.ingredient_supplier_repo.get_all_by_ingredient_id(ing.ingredient_id)
            
            result.append({
                "ingredient_id": ing.ingredient_id,
                "ingredient_name": ing.name,
                "current_stock": current_stock,
                "unit": unit,
                "reorder_point": reorder_point,
                "status": status,
                "supplier_count": len(suppliers),
                "abc_class": ing.abc_class or "C",
            })
        
        # Sort by status priority (critical first) then by name
        status_order = {"critical": 0, "low": 1, "warning": 2, "ok": 3}
        result.sort(key=lambda x: (status_order.get(x["status"], 4), x["ingredient_name"]))
        
        return result

    async def create_purchase_orders_from_suggestions(
        self, 
        suggestions: list, 
        notes: str = None
    ) -> list:
        """
        Create purchase orders from generated suggestions.
        Groups items by supplier and creates one PO per supplier with status='cart'.
        
        Args:
            suggestions: List of suggestion items (can be flat list or grouped by supplier)
            notes: Optional notes to add to all created POs
        
        Returns:
            List of created order IDs
        """
        from collections import defaultdict
        from datetime import date, timedelta
        
        # Handle both flat list and grouped format
        items_by_supplier = defaultdict(list)
        supplier_identity: dict[str, dict[str, Any]] = {}

        def resolve_group_key(item: dict) -> str:
            supplier_id = item.get("supplier_id")
            if supplier_id is None:
                return "unspecified"
            return f"supplier:{supplier_id}"
        
        for item in suggestions:
            # If it's a grouped supplier object with 'items' array
            if "items" in item and isinstance(item["items"], list):
                for sub_item in item["items"]:
                    group_key = resolve_group_key(sub_item)
                    items_by_supplier[group_key].append(sub_item)
                    supplier_identity[group_key] = {
                        "supplier_id": sub_item.get("supplier_id"),
                        "supplier_name": sub_item.get("supplier_name") or self.UNSPECIFIED_SUPPLIER_NAME,
                    }
            else:
                # Flat item
                group_key = resolve_group_key(item)
                items_by_supplier[group_key].append(item)
                supplier_identity[group_key] = {
                    "supplier_id": item.get("supplier_id"),
                    "supplier_name": item.get("supplier_name") or self.UNSPECIFIED_SUPPLIER_NAME,
                }
        
        created_orders = []
        
        for group_key, items in items_by_supplier.items():
            if not items:
                continue
            supplier_id = supplier_identity.get(group_key, {}).get("supplier_id")
            
            # Calculate expected delivery date based on max lead time
            max_lead_time = max(item.get("lead_time_days", 0) for item in items)
            expected_delivery = date.today() + timedelta(days=max_lead_time) if max_lead_time > 0 else None
            
            # Prepare items for create_purchase_order
            po_items = []
            for item in items:
                po_items.append({
                    "ingredient_id": item["ingredient_id"],
                    "ingredient_supplier_id": item.get("ingredient_supplier_id"),
                    "quantity_ordered": item.get("quantity_to_order", item.get("packs_to_order", 1)),
                    "unit": item.get("unit", "unit"),
                    "unit_price": item.get("unit_price", 0),
                })

            review_context = build_purchase_order_review_context(
                source_type="suggestion",
                explanation_items=[build_purchase_order_explanation_item(item) for item in items],
            )
            
            # Create the PO
            result = await self.create_purchase_order(
                supplier_id=supplier_id,
                expected_delivery_date=expected_delivery,
                items=po_items,
                notes=notes,
                review_context=review_context,
            )
            
            created_orders.append(result)
        
        return created_orders

    def __init__(self, db: AsyncSession, restaurant_id: int,subscription_tier:str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.supplier_repo = SupplierRepository(db, restaurant_id)
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.lead_time_data_repo = LeadTimeDataRepository(db, restaurant_id)
        self.inventory_usage_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db,restaurant_id)
        self.purchase_order_repo = PurchaseOrderRepository(db, restaurant_id)
        self.purchase_order_item_repo = PurchaseOrderItemRepository(db, restaurant_id)
        self.alert_repo = AlertRepository(db, restaurant_id)
        self.discrepancy_repo = InventoryDeductionDiscrepancyRepository(db, restaurant_id)
        self.ingredient_forecast_breakdown_repo = IngredientForecastBreakdownRepository(db, restaurant_id)
        self.forecast_run_ledger_repo = ForecastRunLedgerRepository(db, restaurant_id)
        self.forecast_repo = ForecastRepository(db, restaurant_id)

        print(f"Inventory Service: restaurant {self.restaurant_id}")

    @staticmethod
    def _serialize_forecast_timestamp(value: Optional[Union[datetime, date]]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return datetime.combine(value, datetime.min.time()).isoformat()

    @staticmethod
    def _is_forecast_stale(
        *,
        preferred_run_date: Optional[date],
        authoritative_run_date: Optional[date],
    ) -> bool:
        return (
            preferred_run_date is not None
            and authoritative_run_date is not None
            and authoritative_run_date < preferred_run_date
        )

    @staticmethod
    def _build_forecast_state(
        *,
        forecast_source: str,
        forecast_source_type: str,
        forecast_run_date: Optional[date] = None,
        forecast_generated_at: Optional[str],
        forecast_reused: bool,
        forecast_stale: bool,
        forecast_status: str,
        forecast_status_message: Optional[str],
        forecast_confidence_score: Optional[float] = None,
        forecast_version: Optional[int] = None,
    ) -> Dict[str, Any]:
        return build_forecast_contract(
            forecast_source=forecast_source,
            forecast_source_type=forecast_source_type,
            forecast_run_date=forecast_run_date,
            forecast_generated_at=forecast_generated_at,
            forecast_reused=forecast_reused,
            forecast_stale=forecast_stale,
            forecast_status=forecast_status,
            forecast_status_message=forecast_status_message,
            forecast_confidence_score=forecast_confidence_score,
            forecast_version=forecast_version,
        )

    async def _get_forecast_batch_metadata(self, run_date: Optional[date]) -> Dict[str, Optional[float | int]]:
        if run_date is None:
            return {
                "forecast_confidence_score": None,
                "forecast_version": None,
            }

        start_dt = datetime.combine(run_date, datetime.min.time())
        end_dt = datetime.combine(run_date, datetime.max.time())
        forecasts = await self.forecast_repo.get_forecasts_created_between(start_dt, end_dt)
        if not forecasts:
            return {
                "forecast_confidence_score": None,
                "forecast_version": None,
            }

        confidence_scores = [
            float(forecast.confidence_score)
            for forecast in forecasts
            if getattr(forecast, "confidence_score", None) is not None
        ]
        version_candidates = [
            int(forecast.forecast_version)
            for forecast in forecasts
            if getattr(forecast, "forecast_version", None) is not None
        ]

        return {
            "forecast_confidence_score": round(sum(confidence_scores) / len(confidence_scores), 2)
            if confidence_scores
            else None,
            "forecast_version": max(version_candidates) if version_candidates else None,
        }

    async def _get_last_eod_ledger(self, run_date: Optional[date]):
        if run_date is None:
            return None
        return await self.forecast_run_ledger_repo.get_one_by({"run_date": run_date})

    async def _resolve_cached_forecast_run_date(self, preferred_run_date: Optional[date]) -> Optional[date]:
        if preferred_run_date is not None:
            ledger = await self._get_last_eod_ledger(preferred_run_date)
            if ledger and getattr(ledger, "finalized", False):
                return preferred_run_date

        latest_finalized = await self.forecast_run_ledger_repo.get_latest_finalized()
        if latest_finalized and getattr(latest_finalized, "finalized", False):
            return getattr(latest_finalized, "run_date", None)

        return preferred_run_date

    async def _load_cached_ingredient_forecast(
        self,
        *,
        horizon_days: int,
        ledger_finished_at: Optional[datetime],
    ) -> Dict[int, Dict[str, Any]]:
        today = date.today()
        end_date = today + timedelta(days=horizon_days)
        breakdowns = await self.ingredient_forecast_breakdown_repo.get_latest_by_date_range_before(
            today,
            end_date,
            created_at_cutoff=ledger_finished_at,
            forecast_run_date=resolved_cached_run_date,
        )

        if not breakdowns:
            return {}

        ingredient_forecast: Dict[int, Dict[str, Any]] = {}
        inventory_units: Dict[int, str] = {}
        ingredient_units: Dict[int, str] = {}

        for breakdown in breakdowns:
            ingredient_id = breakdown.ingredient_id
            if ingredient_id not in inventory_units and ingredient_id not in ingredient_units:
                inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
                if inventory and getattr(inventory, "unit", None):
                    inventory_units[ingredient_id] = inventory.unit
                else:
                    ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
                    ingredient_units[ingredient_id] = getattr(ingredient, "unit", "unit")

            unit = inventory_units.get(ingredient_id) or ingredient_units.get(ingredient_id) or "unit"
            ingredient_forecast.setdefault(
                ingredient_id,
                {
                    "daily_breakdown": [],
                    "unit": unit,
                    "forecast_run_date": resolved_cached_run_date,
                },
            )
            ingredient_forecast[ingredient_id]["daily_breakdown"].append(
                (breakdown.forecast_date, float(breakdown.quantity or 0))
            )

        for forecast in ingredient_forecast.values():
            forecast["daily_breakdown"].sort(key=lambda item: item[0])

        return ingredient_forecast

    @staticmethod
    def _coerce_optional_int(value) -> Optional[int]:
        if value in (None, "", "null"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _coerce_float(value) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _coerce_optional_day(value) -> Optional[str]:
        if value in (None, "", "null"):
            return None
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)

    async def _resolve_item_name(
        self,
        *,
        item_kind: str,
        ingredient_id: Optional[int],
        batch_recipe_id: Optional[int],
        current_name: Optional[str],
        ingredient_cache: dict,
        batch_cache: dict,
    ) -> Optional[str]:
        if current_name:
            return current_name
            forecast_run_date=resolved_cached_run_date,

        if item_kind == "ingredient" and ingredient_id is not None:
            ingredient = ingredient_cache.get(ingredient_id)
            if ingredient is None:
                ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
                ingredient_cache[ingredient_id] = ingredient
            return getattr(ingredient, "name", None)

        if item_kind == "batch" and batch_recipe_id is not None:
            batch_recipe = batch_cache.get(batch_recipe_id)
            if batch_recipe is None:
                batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
                batch_cache[batch_recipe_id] = batch_recipe
            return getattr(batch_recipe, "name", None)

        return current_name

    async def _serialize_discrepancy_record(
        self,
        discrepancy,
        ingredient_cache: dict,
        batch_cache: dict,
    ) -> dict:
        item_kind = getattr(discrepancy, "item_kind", "unknown") or "unknown"
        ingredient_id = getattr(discrepancy, "ingredient_id", None)
        batch_recipe_id = getattr(discrepancy, "batch_recipe_id", None)
        item_name = await self._resolve_item_name(
            item_kind=item_kind,
            ingredient_id=ingredient_id,
            batch_recipe_id=batch_recipe_id,
            current_name=getattr(discrepancy, "item_name", None),
            ingredient_cache=ingredient_cache,
            batch_cache=batch_cache,
        )

        return {
            "alert_id": getattr(discrepancy, "alert_id", None) or 0,
            "alert_type": "Inventory:DeductionFailed",
            "message": getattr(discrepancy, "message", "Inventory deduction discrepancy"),
            "severity": str(getattr(discrepancy, "severity", "urgent")),
            "status": getattr(discrepancy, "status", "Active"),
            "is_acknowledged": bool(getattr(discrepancy, "is_acknowledged", False)),
            "date_created": getattr(discrepancy, "date_created", None).isoformat()
            if getattr(discrepancy, "date_created", None)
            else "",
            "item_kind": item_kind,
            "ingredient_id": ingredient_id,
            "batch_recipe_id": batch_recipe_id,
            "item_name": item_name,
            "unit": getattr(discrepancy, "unit", None),
            "required_quantity": self._coerce_float(getattr(discrepancy, "required_quantity", 0)),
            "available_quantity": self._coerce_float(getattr(discrepancy, "available_quantity", 0)),
            "current_quantity_on_hand": self._coerce_float(getattr(discrepancy, "current_quantity_on_hand", 0)),
            "shortfall_quantity": self._coerce_float(getattr(discrepancy, "shortfall_quantity", 0)),
            "reference_type": getattr(discrepancy, "reference_type", None),
            "reference_id": getattr(discrepancy, "reference_id", None),
            "attempted_day": self._coerce_optional_day(getattr(discrepancy, "attempted_day", None)),
        }

    async def _serialize_legacy_discrepancy_alert(
        self,
        alert,
        ingredient_cache: dict,
        batch_cache: dict,
    ) -> dict:
        meta = getattr(alert, "meta", None) or {}
        ingredient_id = self._coerce_optional_int(meta.get("ingredient_id"))
        batch_recipe_id = self._coerce_optional_int(meta.get("batch_recipe_id"))
        required_quantity = self._coerce_float(meta.get("required_quantity"))
        available_quantity = self._coerce_float(meta.get("available_quantity"))
        current_quantity_raw = meta.get("current_quantity_on_hand")
        if current_quantity_raw is None:
            current_quantity_on_hand = available_quantity
        else:
            current_quantity_on_hand = self._coerce_float(current_quantity_raw)
        shortfall_quantity = meta.get("shortfall_quantity")
        if shortfall_quantity is None:
            baseline_available = available_quantity
            if baseline_available <= 0 and current_quantity_on_hand > 0:
                baseline_available = current_quantity_on_hand
            shortfall_quantity = round(max(required_quantity - baseline_available, 0.0), 2)
        else:
            shortfall_quantity = self._coerce_float(shortfall_quantity)
        item_kind = "unknown"
        item_name = None

        if ingredient_id is not None:
            item_kind = "ingredient"
            ingredient = ingredient_cache.get(ingredient_id)
            if ingredient is None:
                ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
                ingredient_cache[ingredient_id] = ingredient
            item_name = getattr(ingredient, "name", None) or meta.get("ingredient_name")
        elif batch_recipe_id is not None:
            item_kind = "batch"
            batch_recipe = batch_cache.get(batch_recipe_id)
            if batch_recipe is None:
                batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
                batch_cache[batch_recipe_id] = batch_recipe
            item_name = getattr(batch_recipe, "name", None) or meta.get("batch_recipe_name")

        return {
            "alert_id": alert.alert_id,
            "alert_type": alert.alert_type,
            "message": alert.message,
            "severity": str(
                alert.severity.value if hasattr(alert.severity, "value") else alert.severity
            ),
            "status": alert.status,
            "is_acknowledged": bool(getattr(alert, "is_acknowledged", False)),
            "date_created": alert.date_created.isoformat() if getattr(alert, "date_created", None) else "",
            "item_kind": item_kind,
            "ingredient_id": ingredient_id,
            "batch_recipe_id": batch_recipe_id,
            "item_name": item_name,
            "unit": meta.get("unit"),
            "required_quantity": required_quantity,
            "available_quantity": available_quantity,
            "current_quantity_on_hand": current_quantity_on_hand,
            "shortfall_quantity": shortfall_quantity,
            "reference_type": meta.get("reference_type"),
            "reference_id": self._coerce_optional_int(meta.get("reference_id")),
            "attempted_day": meta.get("attempted_day"),
        }

    async def get_inventory_deduction_discrepancies(self) -> list:
        ingredient_cache = {}
        batch_cache = {}
        discrepancies = []
        tracked_discrepancy_records = await self.discrepancy_repo.get_open()
        tracked_alert_ids = set()

        for discrepancy in tracked_discrepancy_records:
            discrepancies.append(
                await self._serialize_discrepancy_record(
                    discrepancy,
                    ingredient_cache=ingredient_cache,
                    batch_cache=batch_cache,
                )
            )
            if getattr(discrepancy, "alert_id", None):
                tracked_alert_ids.add(discrepancy.alert_id)

        alerts = await self.alert_repo.get_open_inventory_deduction_alerts()
        for alert in alerts:
            if alert.alert_id in tracked_alert_ids:
                continue
            discrepancies.append(
                await self._serialize_legacy_discrepancy_alert(
                    alert,
                    ingredient_cache=ingredient_cache,
                    batch_cache=batch_cache,
                )
            )

        discrepancies.sort(
            key=lambda item: (item.get("date_created") or "", item.get("alert_id") or 0),
            reverse=True,
        )

        return discrepancies

    async def get_inventory_discrepancy_history(
        self,
        *,
        start_date: date,
        end_date: date,
        ingredient_id: Optional[int] = None,
    ) -> list:
        if self.subscription_tier not in ["pro", "master"]:
            raise Exception("Discrepancy history is only available for Pro and Master tiers.")

        ingredient_cache = {}
        batch_cache = {}
        history_rows = await self.discrepancy_repo.get_history(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time()),
            ingredient_id=ingredient_id,
        )

        history = []
        for discrepancy in history_rows:
            item_kind = getattr(discrepancy, "item_kind", "unknown") or "unknown"
            item_name = await self._resolve_item_name(
                item_kind=item_kind,
                ingredient_id=getattr(discrepancy, "ingredient_id", None),
                batch_recipe_id=getattr(discrepancy, "batch_recipe_id", None),
                current_name=getattr(discrepancy, "item_name", None),
                ingredient_cache=ingredient_cache,
                batch_cache=batch_cache,
            )

            date_created = getattr(discrepancy, "date_created", None)
            date_resolved = getattr(discrepancy, "date_resolved", None)
            status = getattr(discrepancy, "status", "Active")
            event_type = "deduction_blocked"
            if status == "Resolved":
                event_type = "discrepancy_resolved"
            elif getattr(discrepancy, "is_acknowledged", False):
                event_type = "discrepancy_acknowledged"

            history.append(
                {
                    "discrepancy_id": discrepancy.discrepancy_id,
                    "alert_id": getattr(discrepancy, "alert_id", None),
                    "event_type": event_type,
                    "status": status,
                    "is_acknowledged": bool(getattr(discrepancy, "is_acknowledged", False)),
                    "severity": str(getattr(discrepancy, "severity", "urgent")),
                    "item_kind": item_kind,
                    "ingredient_id": getattr(discrepancy, "ingredient_id", None),
                    "batch_recipe_id": getattr(discrepancy, "batch_recipe_id", None),
                    "item_name": item_name,
                    "unit": getattr(discrepancy, "unit", None),
                    "message": getattr(discrepancy, "message", "Inventory discrepancy"),
                    "required_quantity": self._coerce_float(getattr(discrepancy, "required_quantity", 0)),
                    "available_quantity": self._coerce_float(getattr(discrepancy, "available_quantity", 0)),
                    "current_quantity_on_hand": self._coerce_float(getattr(discrepancy, "current_quantity_on_hand", 0)),
                    "shortfall_quantity": self._coerce_float(getattr(discrepancy, "shortfall_quantity", 0)),
                    "reference_type": getattr(discrepancy, "reference_type", None),
                    "reference_id": getattr(discrepancy, "reference_id", None),
                    "attempted_day": self._coerce_optional_day(getattr(discrepancy, "attempted_day", None)),
                    "date_created": date_created.isoformat() if date_created else "",
                    "date_resolved": date_resolved.isoformat() if date_resolved else None,
                    "last_updated": (date_resolved or date_created).isoformat() if (date_resolved or date_created) else "",
                }
            )

        history.sort(
            key=lambda item: (item.get("last_updated") or "", item.get("discrepancy_id") or 0),
            reverse=True,
        )
        return history

    async def _resolve_satisfied_deduction_alerts(
        self,
        *,
        ingredient_id: Optional[int] = None,
        batch_recipe_id: Optional[int] = None,
        current_quantity_on_hand: Decimal,
    ) -> int:
        if ingredient_id is None and batch_recipe_id is None:
            return 0

        current_qty = float(current_quantity_on_hand)
        resolved_count = 0
        tracked_alert_ids = set()

        discrepancies = await self.discrepancy_repo.get_open_by_item(
            ingredient_id=ingredient_id,
            batch_recipe_id=batch_recipe_id,
        )
        for discrepancy in discrepancies:
            required_quantity = self._coerce_float(getattr(discrepancy, "required_quantity", 0))
            if current_qty < required_quantity:
                continue

            updated_discrepancy = await self.discrepancy_repo.update(
                discrepancy.discrepancy_id,
                {
                    "status": "Resolved",
                    "is_acknowledged": True,
                    "date_resolved": datetime.utcnow(),
                    "current_quantity_on_hand": current_qty,
                    "available_quantity": current_qty,
                    "shortfall_quantity": 0.0,
                },
            )
            if not updated_discrepancy:
                continue

            alert_id = getattr(discrepancy, "alert_id", None)
            if alert_id:
                tracked_alert_ids.add(alert_id)
                alert = await self.alert_repo.get_by_id(alert_id)
                if alert and getattr(alert, "status", None) in ["Active", "Acknowledged"]:
                    updated_alert = await self.alert_repo.update(
                        alert_id,
                        {"status": "Resolved", "date_resolved": datetime.utcnow()},
                    )
                    if updated_alert:
                        resolved_count += 1
            else:
                resolved_count += 1

        alerts = await self.alert_repo.get_open_inventory_deduction_alerts()

        for alert in alerts:
            if alert.alert_id in tracked_alert_ids:
                continue

            meta = getattr(alert, "meta", None) or {}
            alert_ingredient_id = self._coerce_optional_int(meta.get("ingredient_id"))
            alert_batch_recipe_id = self._coerce_optional_int(meta.get("batch_recipe_id"))

            if ingredient_id is not None and alert_ingredient_id != ingredient_id:
                continue
            if batch_recipe_id is not None and alert_batch_recipe_id != batch_recipe_id:
                continue

            required_quantity = self._coerce_float(meta.get("required_quantity"))
            if current_qty < required_quantity:
                continue

            updated = await self.alert_repo.update(
                alert.alert_id,
                {"status": "Resolved", "date_resolved": datetime.utcnow()},
            )
            if updated:
                resolved_count += 1

        return resolved_count

    async def get_ingredient_names(self) -> list:
        """
        Returns a list of all ingredient names and IDs for autocomplete/search.
        """
        ingredients = await self.ingredient_repo.get_all()
        return [
            {"ingredient_id": ing.ingredient_id, "ingredient_name": getattr(ing, "ingredient_name", getattr(ing, "name", "Unknown"))}
            for ing in ingredients
        ]

    async def get_stock_movements(self, start_date: date, end_date: date, ingredient_id: int = None) -> list:
        """
        Returns a chronological list of all stock movements (inbound and outbound) for the given date range and ingredient.
        Includes: 
        - Receipts (lots/deliveries) - inventory IN
        - Usage (sales, waste, spoilage, adjustments) - inventory OUT
        - Batch Production - ingredients OUT, batch recipe product IN
        Only available for Pro/Master tiers.
        """
        if self.subscription_tier not in ["pro", "master"]:
            raise Exception("Stock Movements are only available for Pro and Master tiers.")

        # Get all ingredients and batch recipes for name lookup
        ingredients = await self.ingredient_repo.get_all()
        ingredient_map = {ing.ingredient_id: ing.name for ing in ingredients}
        
        batch_recipes = await self.batch_recipe_repo.get_all()
        batch_recipe_map = {br.batch_recipe_id: br.name for br in batch_recipes}
        supplier_name_cache = {}
        ingredient_supplier_cache = {}

        all_movements = []

        # 1. INVENTORY IN: Lots (deliveries/purchases)
        from sqlalchemy import and_
        from app.db.models.inventory_lot_orm import InventoryLot
        
        lot_query = select(InventoryLot).where(
            and_(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.delivery_date >= start_date,
                InventoryLot.delivery_date <= end_date
            )
        )
        
        if ingredient_id:
            lot_query = lot_query.where(InventoryLot.ingredient_id == ingredient_id)
            
        lot_result = await self.db.execute(lot_query)
        lots = lot_result.scalars().all()
        
        for lot in lots:
            # Determine if this is a batch recipe lot or regular ingredient lot
            is_batch = lot.batch_recipe_id is not None
            item_name = batch_recipe_map.get(lot.batch_recipe_id, "Unknown Batch") if is_batch else ingredient_map.get(lot.ingredient_id, "Unknown")
            receipt_source = getattr(lot, "receipt_source", None)
            purchase_order_id = getattr(lot, "purchase_order_id", None)
            purchase_order_item_id = getattr(lot, "purchase_order_item_id", None)
            
            # Get supplier name if available
            supplier_name = None
            if lot.ingredient_supplier_id:
                supplier = ingredient_supplier_cache.get(lot.ingredient_supplier_id)
                if supplier is None:
                    supplier = await self.ingredient_supplier_repo.get_by_id(lot.ingredient_supplier_id)
                    ingredient_supplier_cache[lot.ingredient_supplier_id] = supplier
                if supplier:
                    supplier_obj = supplier_name_cache.get(supplier.supplier_id)
                    if supplier_obj is None:
                        supplier_obj = await self.supplier_repo.get_by_id(supplier.supplier_id)
                        supplier_name_cache[supplier.supplier_id] = supplier_obj
                    supplier_name = supplier_obj.name if supplier_obj else None

            if is_batch:
                movement_type = "Batch Production"
                movement_notes = f"Batch: {item_name}"
                source_or_destination = "Production"
            elif purchase_order_id:
                movement_type = "Purchase Receipt"
                movement_notes = f"Received via PO #{purchase_order_id}"
                if purchase_order_item_id:
                    movement_notes += f" item #{purchase_order_item_id}"
                source_or_destination = supplier_name if supplier_name else f"PO #{purchase_order_id}"
            else:
                movement_type = "Manual Receipt"
                movement_notes = "Manual lot receipt"
                source_or_destination = supplier_name if supplier_name else "Manual Entry"
            
            all_movements.append({
                "date": lot.delivery_date.isoformat(),
                "type": movement_type,
                "ingredient_id": lot.ingredient_id if lot.ingredient_id else lot.batch_recipe_id,
                "ingredient_name": item_name,
                "quantity": float(lot.total_received if lot.total_received else lot.quantity),
                "unit": lot.unit,
                "source_or_destination": source_or_destination,
                "lot_id": lot.lot_id,
                "receipt_source": receipt_source,
                "purchase_order_id": purchase_order_id,
                "purchase_order_item_id": purchase_order_item_id,
                "notes": movement_notes,
            })

        # 2. INVENTORY OUT: Usage Logs (sales, waste, batch production input, etc.)
        from app.db.models.inventory_usage_log_orm import InventoryUsageLog
        
        usage_query = select(InventoryUsageLog).where(
            and_(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                func.date(InventoryUsageLog.used_date) >= start_date,
                func.date(InventoryUsageLog.used_date) <= end_date
            )
        )
        
        if ingredient_id:
            usage_query = usage_query.where(InventoryUsageLog.ingredient_id == ingredient_id)
            
        usage_result = await self.db.execute(usage_query)
        usage_logs = usage_result.scalars().all()
        
        for log in usage_logs:
            # Determine movement type and quantity sign
            usage_type = log.usage_type.value if hasattr(log.usage_type, 'value') else str(log.usage_type)
            
            # batch_output creates inventory (positive), everything else reduces inventory (negative)
            if usage_type == "batch_output":
                quantity = float(log.used_quantity)
                movement_type = "Batch Production"
                source_dest = "Production"
            elif usage_type == "batch_production":
                # This is an ingredient being consumed to make a batch
                quantity = float(log.used_quantity) * -1
                movement_type = "Batch Production (Ingredient Used)"
                source_dest = f"Batch #{log.reference_id}" if log.reference_id else "Production"
            elif usage_type == "sale":
                quantity = float(log.used_quantity) * -1
                movement_type = "Sale"
                source_dest = f"Order #{log.reference_id}" if log.reference_id else "POS"
            elif usage_type == "waste":
                quantity = float(log.used_quantity) * -1
                movement_type = "Waste"
                source_dest = "Waste Log"
            elif usage_type == "spoilage":
                quantity = float(log.used_quantity) * -1
                movement_type = "Spoilage"
                source_dest = "Expired"
            elif usage_type == "manual_adjustment":
                # Could be positive or negative - assume the sign in used_quantity is correct
                quantity = float(log.used_quantity)
                movement_type = "Manual Adjustment"
                source_dest = "Manual Entry"
            else:
                # Default for unknown types
                quantity = float(log.used_quantity) * -1
                movement_type = usage_type.replace("_", " ").title()
                source_dest = None
            
            all_movements.append({
                "date": log.used_date.isoformat(),
                "type": movement_type,
                "ingredient_id": log.ingredient_id,
                "ingredient_name": ingredient_map.get(log.ingredient_id, "Unknown"),
                "quantity": quantity,
                "unit": log.unit,
                "source_or_destination": source_dest,
                "lot_id": log.lot_id,
                "notes": log.notes,
            })

        # Sort by ingredient_id (for grouping) and then by date
        all_movements.sort(key=lambda x: (
            x["ingredient_id"] if x["ingredient_id"] is not None else -1, 
            x["date"]
        ))

        # Calculate running balance per ingredient
        # First, get starting balance for each ingredient before start_date
        starting_balances = {}
        
        if ingredient_id:
            # If filtering by specific ingredient, get its current inventory
            inventory = await self.inventory_repo.get_by_field("ingredient_id", ingredient_id)
            if inventory:
                inv_item = inventory[0] if isinstance(inventory, list) else inventory
                # Calculate what the balance was at start_date by working backwards from current
                current_balance = float(inv_item.quantity_on_hand) if inv_item.quantity_on_hand else 0.0
                
                # Get movements after end_date to work backwards
                future_query = select(InventoryUsageLog).where(
                    and_(
                        InventoryUsageLog.restaurant_id == self.restaurant_id,
                        InventoryUsageLog.ingredient_id == ingredient_id,
                        func.date(InventoryUsageLog.used_date) > end_date
                    )
                )
                future_result = await self.db.execute(future_query)
                future_logs = future_result.scalars().all()
                
                # Add back future usage to get balance at end_date
                for log in future_logs:
                    usage_type = log.usage_type.value if hasattr(log.usage_type, 'value') else str(log.usage_type)
                    if usage_type == "batch_output":
                        current_balance -= float(log.used_quantity)
                    else:
                        current_balance += float(log.used_quantity)
                
                starting_balances[ingredient_id] = current_balance - sum(m["quantity"] for m in all_movements if m["ingredient_id"] == ingredient_id)

        # Apply running balance to movements
        running_balances = starting_balances.copy()
        
        for move in all_movements:
            ing_id = move["ingredient_id"]
            if ing_id not in running_balances:
                running_balances[ing_id] = 0.0
            
            running_balances[ing_id] += move["quantity"]
            move["running_balance"] = round(running_balances[ing_id], 2)

        # Filter out any movement with invalid ingredient_id
        all_movements = [m for m in all_movements if m["ingredient_id"] is not None]
        
        return all_movements
    async def get_lot_info(self, lot_id: int) -> dict:
        # Get lot details
        lot = await self.inventory_lot_repo.get_by_id(lot_id)
        if not lot:
            return {}

        # Get supplier info
        supplier = None
        if lot.ingredient_supplier_id:
            supplier = await self.ingredient_supplier_repo.get_by_id(lot.ingredient_supplier_id)
        
        sup_name = await self.supplier_repo.get_by_id(supplier.supplier_id)
        supplier_name = sup_name.name

        # Combine data
        return {
            "lot_id": lot.lot_id,
            "delivery_date": lot.delivery_date,
            "spoilage_expected_date": lot.spoilage_expected_date,
            "received_quantity": lot.quantity,
            "status": lot.status,
            "supplier": {
                "supplier_name": supplier_name,
                "ingredient_supplier_id": supplier.ingredient_supplier_id if supplier else None,
                "cost_per_unit": supplier.cost_per_unit if supplier else None,
                "total_packs": int(supplier.pack_size * float(lot.quantity)) if supplier else None,
                "pack_description": f"{supplier.pack_size} packs of {supplier.quantity_per_pack_item} {supplier.unit}" if supplier else None,
            } if supplier else None,
                }

    async def get_used_usage_logs(self, lot_id: int) -> list[dict]:
        used_types = ['sale', 'manual_adjustment', 'batch_production', 'batch_fallback']
        logs = await self.inventory_usage_log_repo.get_by_lot_id_and_usage_types(lot_id, used_types)

        return [
            {
                "usage_id": log.usage_id,
                "used_quantity": float(log.used_quantity),
                "unit": log.unit,
                "used_date": log.used_date.isoformat(),
                "usage_type": log.usage_type,
                "reference_type": log.reference_type,
                "reference_id": log.reference_id,
                "notes": log.notes,
            }
            for log in logs
        ]

    async def get_wasted_usage_logs(self, lot_id: int) -> list[dict]:
        wasted_types = ['waste', 'spoilage']
        logs = await self.inventory_usage_log_repo.get_by_lot_id_and_usage_types(lot_id, wasted_types)

        return [
            {
                "usage_id": log.usage_id,
                "used_quantity": float(log.used_quantity),
                "unit": log.unit,
                "used_date": log.used_date.isoformat(),
                "usage_type": log.usage_type,
                "reference_type": log.reference_type,
                "reference_id": log.reference_id,
                "notes": log.notes,
            }
            for log in logs
        ]
    
    async def create_ingredient_supplier(self, supplier_id: int, create_data: dict) -> dict:
        try:
            # Inject supplier_id into the data
            create_data["supplier_id"] = supplier_id

            async with self.db.begin():
                created_ingredient_supplier = await self.ingredient_supplier_repo.create(create_data)
                if not created_ingredient_supplier:
                    return {"success": False, "message": "Failed to create ingredient-supplier relationship"}

            return {
                "success": True,
                "message": "Ingredient-supplier relationship created successfully",
                "data": created_ingredient_supplier,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}

    async def create_supplier(self, create_data: dict) -> dict:
        try:
            async with self.db.begin():
                created_supplier = await self.supplier_repo.create(create_data)
                if not created_supplier:
                    return {"success": False, "message": "Failed to create supplier"}

            return {
                "success": True,
                "message": "Supplier created successfully",
                "data": created_supplier,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}

    async def update_ingredient_supplier(
        self, ingredient_supplier_id: int, update_data: dict
    ) -> dict:
        try:
            async with self.db.begin():
                updated_ing_sup = await self.ingredient_supplier_repo.update(
                    ingredient_supplier_id, update_data
                )
                if not updated_ing_sup:
                    return {
                        "success": False,
                        "message": "Ingredient-Supplier relationship not found",
                    }

            return {
                "success": True,
                "message": "Ingredient-supplier info updated successfully",
            }
            await self.db.rollback()
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def update_supplier(self, supplier_id: int, update_data: dict) -> dict:
        try:
            async with self.db.begin():
                updated_supplier = await self.supplier_repo.update(
                    supplier_id, update_data
                )
                if not updated_supplier:
                    return {"success": False, "message": "Supplier not found"}

            return {"success": True, "message": "Supplier updated successfully"}
            await self.db.rollback()
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def view_supplier_info(self) -> List[dict]:
        """
        View suppliers, the ingredients they supply, and packaging/pricing info.
        """
        suppliers = await self.supplier_repo.get_all()
        ingredient_supplier_rows = (
            await self.ingredient_supplier_repo.get_all()
        )
        ingredient_map = {
            ing.ingredient_id: ing for ing in await self.ingredient_repo.get_all()
        }

        supplier_info = []

        for supplier in suppliers:
            supplier_ingredients = [
                row
                for row in ingredient_supplier_rows
                if row.supplier_id == supplier.supplier_id
            ]

            ingredient_details = []
            for rel in supplier_ingredients:
                ingredient = ingredient_map.get(rel.ingredient_id)
                if not ingredient:
                    continue

                ingredient_details.append(
                    {
                        "ingredient_supplier_id": rel.ingredient_supplier_id,
                        "ingredient_id": rel.ingredient_id,
                        "ingredient_name": ingredient.name,
                        "unit": rel.unit or ingredient.unit,
                        "cost_per_unit": float(rel.cost_per_unit),
                        "lead_time_days": rel.lead_time_days,
                        "spoilage_rate": float(rel.spoilage_rate or 0.0),
                        "shelf_life_days": rel.shelf_life_days,
                        "preferred": bool(rel.preferred),
                        "min_order_quantity": rel.min_order_quantity,
                        "supplier_priority": rel.supplier_priority,
                        "pack_size": rel.pack_size,
                        "quantity_per_pack_item": float(
                            rel.quantity_per_pack_item or 1.0
                        ),
                    }
                )

            supplier_info.append(
                {
                    "supplier_id": supplier.supplier_id,
                    "name": supplier.name,
                    "type": supplier.type,
                    "region": supplier.region,
                    "contact_info": supplier.contact_info,
                    "rating": float(supplier.rating or 0),
                    "website": supplier.website,
                    "is_active": bool(supplier.is_active),
                    "supplier_feedback": supplier.supplier_feedback,
                    "contract_status": supplier.contract_status,
                    "contract_start_date": str(supplier.contract_start_date),
                    "contract_end_date": str(supplier.contract_end_date),
                    "ingredients": ingredient_details,
                }
            )

        return supplier_info

    async def get_inventory_adjustment_log(self) -> List[dict]:
        """
        Returns a log of all inventory adjustments, including ingredient names,
        ordered by most recent first.
        """
        try:
            usage_logs = await self.inventory_usage_log_repo.get_all()
            log_data = []

            for log in sorted(usage_logs, key=lambda x: x.used_date, reverse=True):
                ingredient = await self.ingredient_repo.get_by_id(log.ingredient_id)

                log_data.append(
                    {
                        "usage_id": log.usage_id,
                        "inventory_id": log.inventory_id,
                        "lot_id": log.lot_id,
                        "ingredient_id": log.ingredient_id,
                        "ingredient_name": ingredient.name if ingredient else "Unknown",
                        "used_quantity": float(log.used_quantity),
                        "unit": log.unit,
                        "used_date": log.used_date.isoformat(),
                        "usage_type": log.usage_type,
                        "reference_type": log.reference_type,
                        "reference_id": log.reference_id,
                        "notes": log.notes,
                    }
                )

            return log_data

        except Exception as e:
            print(f"[ERROR] Failed to get adjustment log: {e}")
            raise

    async def handle_inventory_adjustment(
        self,
        inventory_id: int,
        lot_id: int,
        adjustment_quantity: float,
        usage_type: str,
        reference_id: int = None,
        notes: str = "",
    ) -> dict:
        """
        Logs an inventory adjustment and updates inventory quantity_on_hand.
        Lot quantities remain untouched.
        """
        try:
            async with self.db.begin():
                # Step 1: Fetch inventory item
                inventory_item = await self.inventory_repo.get_by_id(inventory_id)
                if not inventory_item:
                    raise Exception(
                        f"Inventory item not found for inventory_id={inventory_id}"
                    )

                # Step 2: Validate lot existence
                lot = await self.inventory_lot_repo.get_by_id(lot_id)
                if not lot:
                    raise Exception(f"Lot not found for lot_id={lot_id}")

                # Step 3: Compute current remaining across lots (convert to inventory unit)
                available_lots, lot_remaining_map, total_remaining = await self._get_inventory_remaining_snapshot(
                    inventory_id=inventory_id,
                    inventory_unit=inventory_item.unit,
                )

                selected_lot_remaining = lot_remaining_map.get(lot_id, Decimal("0"))

                # Step 4: Determine if this is an addition or subtraction
                subtract_types = [
                    "waste",
                    "spoilage",
                    "sale",
                    "batch_production",
                    "batch_output",
                    "manual_adjustment",
                ]
                add_types = ["manual_addition"]

                requested_qty = Decimal(str(adjustment_quantity))

                if usage_type in subtract_types:
                    if selected_lot_remaining < requested_qty:
                        raise Exception("Not enough quantity in the selected lot to subtract.")
                    if total_remaining < requested_qty:
                        raise Exception(
                            "Not enough inventory to subtract the adjustment quantity."
                        )
                    new_quantity = total_remaining - requested_qty

                elif usage_type in add_types:
                    new_quantity = total_remaining + requested_qty

                else:
                    raise Exception(f"Unsupported usage_type: {usage_type}")

                # Step 5: Update inventory quantity_on_hand with reconciled total
                # BaseRepository.update expects (obj_id, update_data)
                await self.inventory_repo.update(
                    inventory_id, {"quantity_on_hand": float(new_quantity)}
                )

                # Step 6: Log the adjustment
                usage_log_entry = {
                    "restaurant_id": self.restaurant_id,
                    "inventory_id": inventory_id,
                    "lot_id": lot_id,
                    "ingredient_id": inventory_item.ingredient_id,
                    "used_quantity": requested_qty,
                    "unit": inventory_item.unit,
                    "usage_type": usage_type,
                    "reference_type": "lot",
                    "reference_id": reference_id,
                    "notes": notes,
                }

                await self.inventory_usage_log_repo.create(usage_log_entry)

                resolved_deduction_alerts = await self._resolve_satisfied_deduction_alerts(
                    ingredient_id=inventory_item.ingredient_id,
                    batch_recipe_id=getattr(lot, "batch_recipe_id", None),
                    current_quantity_on_hand=new_quantity,
                )

            return {
                "success": True,
                "message": f"Inventory {'added to' if usage_type in add_types else 'adjusted by'} {adjustment_quantity} {inventory_item.unit}.",
                "adjusted_quantity": float(requested_qty),
                "previous_quantity_on_hand": float(total_remaining),
                "current_quantity_on_hand": float(new_quantity),
                "resolved_deduction_alerts": resolved_deduction_alerts,
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to log inventory adjustment: {str(e)}",
            }

    async def set_inventory_current_stock(
        self,
        inventory_id: int,
        counted_quantity: Decimal,
        lot_id: Optional[int] = None,
        reason: Optional[str] = None,
        notes: str = "",
    ) -> dict:
        """
        Reconcile inventory to the operator's counted on-hand quantity.

        Positive deltas are added to a chosen lot. Negative deltas are removed
        FIFO across available lots.
        """
        try:
            counted_qty = Decimal(str(counted_quantity))
            if counted_qty < 0:
                raise Exception("Counted quantity cannot be negative.")

            async with self.db.begin():
                inventory_item = await self.inventory_repo.get_by_id(inventory_id)
                if not inventory_item:
                    raise Exception(f"Inventory item not found for inventory_id={inventory_id}")

                available_lots, lot_remaining_map, total_remaining = await self._get_inventory_remaining_snapshot(
                    inventory_id=inventory_id,
                    inventory_unit=inventory_item.unit,
                )

                if not available_lots:
                    raise Exception("No available lots found for this inventory item.")

                delta = counted_qty - total_remaining
                log_ingredient_id = getattr(inventory_item, "ingredient_id", None) or getattr(available_lots[0], "ingredient_id", None)
                if not log_ingredient_id:
                    raise Exception("This inventory item cannot be reconciled because it is missing an ingredient reference.")

                reconciliation_notes = self._build_count_reconciliation_note(
                    previous_quantity=total_remaining,
                    counted_quantity=counted_qty,
                    unit=inventory_item.unit,
                    reason=reason,
                    notes=notes,
                )

                if delta > 0:
                    destination_lot = self._select_reconciliation_lot(
                        available_lots=available_lots,
                        lot_id=lot_id,
                    )
                    await self.inventory_usage_log_repo.create({
                        "restaurant_id": self.restaurant_id,
                        "inventory_id": inventory_id,
                        "lot_id": destination_lot.lot_id,
                        "ingredient_id": log_ingredient_id,
                        "used_quantity": delta,
                        "unit": inventory_item.unit,
                        "usage_type": "manual_addition",
                        "reference_type": "other",
                        "reference_id": None,
                        "notes": reconciliation_notes,
                    })
                elif delta < 0:
                    remaining_to_remove = abs(delta)
                    for lot in available_lots:
                        lot_remaining = lot_remaining_map.get(lot.lot_id, Decimal("0"))
                        if lot_remaining <= 0:
                            continue

                        quantity_to_remove = min(lot_remaining, remaining_to_remove)
                        if quantity_to_remove <= 0:
                            continue

                        await self.inventory_usage_log_repo.create({
                            "restaurant_id": self.restaurant_id,
                            "inventory_id": inventory_id,
                            "lot_id": lot.lot_id,
                            "ingredient_id": log_ingredient_id,
                            "used_quantity": quantity_to_remove,
                            "unit": inventory_item.unit,
                            "usage_type": "manual_adjustment",
                            "reference_type": "other",
                            "reference_id": None,
                            "notes": reconciliation_notes,
                        })
                        remaining_to_remove -= quantity_to_remove
                        if remaining_to_remove <= 0:
                            break

                    if remaining_to_remove > 0:
                        raise Exception("Counted stock exceeds the inventory available to reconcile.")

                await self.inventory_repo.update(
                    inventory_id,
                    {"quantity_on_hand": float(counted_qty)},
                )

                resolved_deduction_alerts = await self._resolve_satisfied_deduction_alerts(
                    ingredient_id=getattr(inventory_item, "ingredient_id", None),
                    current_quantity_on_hand=counted_qty,
                )

            if delta == 0:
                message = f"Inventory already matched the counted stock of {float(counted_qty)} {inventory_item.unit}."
            else:
                direction = "added" if delta > 0 else "removed"
                message = f"Inventory reconciled to {float(counted_qty)} {inventory_item.unit}; system {direction} {float(abs(delta))} {inventory_item.unit}."

            return {
                "success": True,
                "message": message,
                "adjusted_quantity": float(abs(delta)),
                "previous_quantity_on_hand": float(total_remaining),
                "current_quantity_on_hand": float(counted_qty),
                "resolved_deduction_alerts": resolved_deduction_alerts,
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to reconcile inventory count: {str(e)}",
            }

    async def _get_inventory_remaining_snapshot(self, inventory_id: int, inventory_unit: str):
        lots = await self.inventory_lot_repo.get_inventory_lots_by_inventory_and_restaurant(
            inventory_id
        )
        available_lots = self._sort_lots_fifo(
            [lot for lot in lots if self._lot_is_available(lot)]
        )

        lot_remaining_map = {}
        total_remaining = Decimal("0")

        for lot in available_lots:
            remaining = await self._compute_lot_remaining(lot)
            try:
                remaining_in_inventory_unit = Decimal(
                    str(convert_unit(remaining, lot.unit, inventory_unit))
                )
            except Exception:
                remaining_in_inventory_unit = Decimal(str(remaining))

            lot_remaining_map[lot.lot_id] = remaining_in_inventory_unit
            total_remaining += remaining_in_inventory_unit

        return available_lots, lot_remaining_map, total_remaining

    def _lot_is_available(self, lot) -> bool:
        return getattr(getattr(lot, "status", None), "value", getattr(lot, "status", None)) == "available"

    def _sort_lots_fifo(self, lots):
        return sorted(lots, key=lambda lot: (lot.delivery_date, lot.lot_id))

    def _select_reconciliation_lot(self, available_lots, lot_id: Optional[int] = None):
        if lot_id is None:
            return available_lots[0]

        for lot in available_lots:
            if lot.lot_id == lot_id:
                return lot

        raise Exception(f"Lot not found for lot_id={lot_id}")

    def _build_count_reconciliation_note(
        self,
        previous_quantity: Decimal,
        counted_quantity: Decimal,
        unit: str,
        reason: Optional[str],
        notes: str,
    ) -> str:
        note_parts = [
            f"Count reconciliation: recorded {float(previous_quantity)} {unit}, counted {float(counted_quantity)} {unit}."
        ]
        if reason:
            note_parts.append(f"Reason: {reason}.")
        if notes:
            note_parts.append(notes.strip())
        return " ".join(part for part in note_parts if part)

    async def _compute_lot_remaining(self, lot) -> Decimal:
        """Compute remaining quantity for a lot using usage logs (no status filtering)."""
        usage_logs = await self.inventory_usage_log_repo.get_all_by_lot_id(lot.lot_id)
        used_quantity = wasted_quantity = added_quantity = Decimal("0.00")

        for log in usage_logs:
            qty = Decimal(log.used_quantity or 0)
            if log.usage_type in {"sale", "batch_production", "batch_output"}:
                used_quantity += qty
            elif log.usage_type in {"waste", "spoilage", "manual_adjustment"}:
                wasted_quantity += qty
            elif log.usage_type == "manual_addition":
                added_quantity += qty

        lot_qty = Decimal(lot.quantity or 0)
        return lot_qty - used_quantity - wasted_quantity + added_quantity

    async def view_inventory(self) -> List[dict]:
        inventory_items = await self.inventory_repo.get_all()
        inventory_view = []

        for item in inventory_items:
            try:
                # For each inventory item, we'll check lots and usage logs
                ingredient = None
                batch_recipe = None
                lots = await self.inventory_lot_repo.get_recent_by_inventory_id(
                    inventory_id=item.inventory_id, max_days_old=30
                )

                # Ingredient or Batch Recipe handling
                if item.ingredient_id:
                    ingredient = await self.ingredient_repo.get_by_id(item.ingredient_id)
                    if not ingredient:
                        continue
                else:
                    batch_recipe_id = next((lot.batch_recipe_id for lot in lots if lot.batch_recipe_id), None)
                    if batch_recipe_id:
                        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
                        if not batch_recipe:
                            continue
                    else:
                        continue

                # Initialize total quantity (on hand)
                total_quantity = item.quantity_on_hand or Decimal("0.00")
                lot_breakdown = await self.get_lot_breakdown(lots)

                if ingredient:
                    inventory_view.append({
                        "inventory_id": item.inventory_id,
                        "ingredient_id": item.ingredient_id,
                        "category": ingredient.category,
                        "ingredient_name": ingredient.name,
                        "unit": item.unit,
                        "quantity_on_hand": round_decimal(total_quantity),
                        "packaging_breakdown": lot_breakdown,
                    })
                elif batch_recipe:
                    inventory_view.append({
                        "inventory_id": item.inventory_id,
                        "batch_recipe_id": batch_recipe.batch_recipe_id,
                        "ingredient_name": batch_recipe.name,
                        "category": "Batch",
                        "unit": item.unit,
                        "quantity_on_hand": round_decimal(total_quantity),
                        "packaging_breakdown": lot_breakdown,
                    })

            except Exception as e:
                print(f"[ERROR] Inventory processing failed for ID={item.inventory_id}: {e}")
                continue

        return inventory_view

    async def get_lot_breakdown(self, lots) -> List[dict]:
        lot_breakdown = []
        print(f"Lots passed in: {lots}")
        print("Statuses in lots:")
        for lot in lots:
            print(f"lot_id={lot.lot_id}, status='{lot.status}'")
        # Filter lots with 'available' status
        available_lots = [lot for lot in lots if lot.status.value == "available"]
        
        for lot in sorted(available_lots, key=lambda x: x.delivery_date, reverse=True):
            # lot.quantity is stored in the inventory unit (already converted on intake)
            lot_qty = Decimal(lot.quantity or 0)
            used_quantity = wasted_quantity = added_quantity = Decimal("0.00")

            # Fetch usage logs for each lot
            usage_logs = await self.inventory_usage_log_repo.get_all_by_lot_id(lot.lot_id)
            for log in usage_logs:
                qty = Decimal(log.used_quantity or 0)
                if log.usage_type in {"sale", "batch_production", "batch_output"}:
                    used_quantity += qty
                elif log.usage_type in {"waste", "spoilage", "manual_adjustment"}:
                    wasted_quantity += qty
                elif log.usage_type == "manual_addition":
                    added_quantity += qty

            # Calculate remaining quantity for the lot
            remaining_quantity = lot_qty - used_quantity - wasted_quantity + added_quantity
            ingredient = None
            if lot.ingredient_id:
                ingredient = await self.ingredient_repo.get_by_id(lot.ingredient_id)
            packaging_info = await self._get_packaging_info(lot, ingredient, remaining_quantity)

            # Add lot data to the breakdown list
            lot_breakdown.append({
                "delivery_date": lot.delivery_date.isoformat(),
                "quantity": round_decimal(lot_qty),
                "used_quantity": round_decimal(used_quantity),
                "wasted_quantity": round_decimal(wasted_quantity),
                "added_quantity": round_decimal(added_quantity),
                "remaining_quantity": round_decimal(remaining_quantity),
                "lot_id": lot.lot_id,
                "unit": lot.unit,
                **packaging_info,
            })
        print(f'lot breakdown: {lot_breakdown}')
        return lot_breakdown

    async def view_inventory_details(self, inventory_id: int) -> dict:
        """Returns detailed lot and usage breakdown for a specific inventory item."""
        inventory_item = await self.inventory_repo.get_by_id(inventory_id)
        if not inventory_item:
            return {"error": "Inventory item not found"}

        lots = await self.inventory_lot_repo.get_recent_by_inventory_id(inventory_id=inventory_id, max_days_old=30)
        lot_breakdown = await self.get_lot_breakdown(lots)
        import json
        print(json.dumps({
            "inventory_id": inventory_item.inventory_id,
            "ingredient_id": inventory_item.ingredient_id,
            "unit": inventory_item.unit,
            "quantity_on_hand": round_decimal(inventory_item.quantity_on_hand),
            "packaging_breakdown": lot_breakdown,
        }, indent=2, default=str))
        
        return {
            "inventory_id": inventory_item.inventory_id,
            "ingredient_id": inventory_item.ingredient_id,
            "unit": inventory_item.unit,
            "quantity_on_hand": round_decimal(inventory_item.quantity_on_hand),
            "packaging_breakdown": lot_breakdown,
        }
    
    async def _get_packaging_info(self, lot, ingredient, remaining_quantity):
        print(f"Lot: {lot}")
        print(f"Ingredient:{ingredient}")
        print(f"Remaining: {remaining_quantity}")
        supplier_packaging = None
        if lot.ingredient_supplier_id:
            supplier_packaging = await self.ingredient_supplier_repo.get_by_id(lot.ingredient_supplier_id)

        if supplier_packaging:
            pack_size = supplier_packaging.pack_size or 1
            quantity_per_pack = supplier_packaging.quantity_per_pack_item or Decimal("1.00")
            total_units_per_pack = Decimal(pack_size) * quantity_per_pack

            if ingredient and ingredient.unit == "count" and supplier_packaging.unit != "count":
                avg_weight_per_unit = ingredient.average_weight_per_unit or 1
                grams_per_unit = avg_weight_per_unit * remaining_quantity
                converted_remaining = grams_per_unit / 1000 if supplier_packaging.unit == "kg" else grams_per_unit
            else:
                try:
                    converted_remaining = convert_unit(
                        quantity=remaining_quantity,
                        from_unit=lot.unit,
                        to_unit=supplier_packaging.unit,
                    )
                except ValueError:
                    converted_remaining = remaining_quantity

            approx_packages_remaining = (
                converted_remaining / total_units_per_pack if total_units_per_pack > 0 else None
            )
            packages_received_total = (lot.total_received or 1) * pack_size

            return {
                "ingredient_supplier_id": supplier_packaging.ingredient_supplier_id,
                "supplier_unit": supplier_packaging.unit,
                "pack_size": pack_size,
                "quantity_per_pack_item": float(quantity_per_pack),
                "packages_received_total": int(packages_received_total),
                "approx_packages_remaining": round_decimal(approx_packages_remaining) if approx_packages_remaining is not None else None,
            }

        return {
            "ingredient_supplier_id": lot.ingredient_supplier_id,
            "supplier_unit": lot.unit,
            "pack_size": None,
            "quantity_per_pack_item": None,
            "packages_received_total": None,
            "approx_packages_remaining": None,
        }

    async def view_ingredient_suppliers(self) -> List[dict]:
        """
        View all ingredients and their supplier packaging/options using repos.
        Returns a list of ingredients, each with all its supplier options and details.
        """

        ingredients = await self.ingredient_repo.get_all()
        ingredient_supplier_view = []

        for ingredient in ingredients:
            ingredient_suppliers = (
                await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                    ingredient.ingredient_id
                )
            )

            supplier_data = []
            for ing_sup in ingredient_suppliers:
                supplier = await self.supplier_repo.get_by_id(ing_sup.supplier_id)
                if not supplier:
                    continue

                supplier_data.append(
                    {
                        "supplier_id": supplier.supplier_id,
                        "supplier_name": supplier.name,
                        "unit": ing_sup.unit,
                        "pack_size": ing_sup.pack_size,
                        "quantity_per_pack_item": float(
                            ing_sup.quantity_per_pack_item or 1.0
                        ),
                        "cost_per_unit": float(ing_sup.cost_per_unit or 0),
                        "lead_time_days": ing_sup.lead_time_days,
                        "shelf_life_days": ing_sup.shelf_life_days,
                        "spoilage_rate": float(ing_sup.spoilage_rate or 0),
                        "preferred": bool(ing_sup.preferred),
                        "min_order_quantity": ing_sup.min_order_quantity,
                        "supplier_priority": ing_sup.supplier_priority,
                        "ingredient_supplier_id": ing_sup.ingredient_supplier_id,
                    }
                )

            ingredient_supplier_view.append(
                {
                    "ingredient_id": ingredient.ingredient_id,
                    "ingredient_name": ingredient.name,
                    "unit": ingredient.unit,
                    "suppliers": supplier_data,
                }
            )

        return ingredient_supplier_view

    async def _create_inventory_receipt(
        self,
        ingredient_supplier_id: int,
        total_received: Union[float, int],
        delivery_date: date,
        receipt_source: str = "manual_receipt",
        purchase_order_id: Optional[int] = None,
        purchase_order_item_id: Optional[int] = None,
    ) -> dict:
        """
        Add a new inventory lot and update inventory accordingly.
        """
        ingredient_supplier = await self.ingredient_supplier_repo.get_by_id(
            ingredient_supplier_id,
        )
        if not ingredient_supplier:
            raise ValueError(
                f"IngredientSupplier ID {ingredient_supplier_id} not found."
            )

        ingredient_id = ingredient_supplier.ingredient_id
        supplier_unit = ingredient_supplier.unit
        pack_size = ingredient_supplier.pack_size or 1
        quantity_per_pack_item = (
            ingredient_supplier.quantity_per_pack_item or Decimal("1.00")
        )
        shelf_life_days = ingredient_supplier.shelf_life_days or 0
        spoilage_expected_date = delivery_date + timedelta(days=shelf_life_days)

        inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)

        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        if not ingredient:
            raise ValueError(f"Ingredient ID {ingredient_id} not found.")

        inventory_unit = inventory.unit if inventory else ingredient.unit
        average_weight_per_unit = ingredient.average_weight_per_unit

        if not inventory:
            inventory_data = {
                "restaurant_id": self.restaurant_id,
                "ingredient_id": ingredient_id,
                "unit": inventory_unit,
                "quantity_on_hand": Decimal("0.00"),
                "min_stock_level": Decimal("0.00"),
                "last_delivery_date": delivery_date,
                "spoilage_expected_date": spoilage_expected_date,
            }
            inventory = await self.inventory_repo.create(inventory_data)

        raw_total_quantity = (
            Decimal(total_received) * Decimal(pack_size) * quantity_per_pack_item
        )

        if inventory_unit == "count" and supplier_unit != "count":
            quantity_in_grams = convert_unit(raw_total_quantity, supplier_unit, "g")

            if not average_weight_per_unit:
                raise ValueError(
                    "average_weight_per_unit is required to convert to count."
                )

            converted_total_quantity = quantity_in_grams / average_weight_per_unit

        elif supplier_unit != inventory_unit:
            converted_total_quantity = convert_unit(
                raw_total_quantity, supplier_unit, inventory_unit
            )

        else:
            converted_total_quantity = raw_total_quantity

        lot_payload = {
            "inventory_id": inventory.inventory_id,
            "ingredient_id": ingredient_id,
            "restaurant_id": self.restaurant_id,
            "receipt_source": receipt_source,
            "purchase_order_id": purchase_order_id,
            "purchase_order_item_id": purchase_order_item_id,
            "delivery_date": delivery_date,
            "spoilage_expected_date": spoilage_expected_date,
            "quantity": Decimal(converted_total_quantity),
            "unit": inventory_unit,
            "total_received": Decimal(total_received),
            "ingredient_supplier_id": ingredient_supplier_id,
        }

        lot = await self.inventory_lot_repo.create(lot_payload)

        updated_quantity = (
            Decimal(inventory.quantity_on_hand) or Decimal("0.00")
        ) + Decimal(converted_total_quantity)

        update_data = {
            "quantity_on_hand": updated_quantity,
            "last_delivery_date": delivery_date,
            "spoilage_expected_date": spoilage_expected_date,
        }

        await self.inventory_repo.update(inventory.inventory_id, update_data)

        return {
            "lot_id": lot.lot_id,
            "inventory_id": inventory.inventory_id,
            "ingredient_id": ingredient_id,
            "received_quantity": Decimal(converted_total_quantity),
            "unit": inventory_unit,
        }

    async def add_inventory_from_lots(
        self,
        ingredient_supplier_id: int,
        total_received: Union[float, int],
        delivery_date: date,
    ):
        """
        Add a new inventory lot and update inventory accordingly.
        """
        async with self.db.begin():
            return await self._create_inventory_receipt(
                ingredient_supplier_id=ingredient_supplier_id,
                total_received=total_received,
                delivery_date=delivery_date,
                receipt_source="manual_receipt",
            )
