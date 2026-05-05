from typing import Any, Dict, List, Optional, DefaultDict
from collections import defaultdict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.orders_repo import OrdersRepository
from app.repositories.order_items_repo import OrderItemsRepository
from app.repositories.order_item_modifiers_repo import OrderItemModifiersRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.schemas.order_dto import OrderCreate, OrderUpdate
from app.utils.logger_helpers import log_method
from app.sockets.connection_manager import manager
from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper
from app.core.logging import logger
from app.services.utils.subscription_tiers import (
    is_full_service_tier,
    normalize_subscription_tier,
)


class OrderService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.order_repo = OrdersRepository(db, restaurant_id)
        self.order_item_repo = OrderItemsRepository(db, restaurant_id)
        self.mod_repo = OrderItemModifiersRepository(db, restaurant_id)
        self.menu_repo = MenuItemRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.inventory_helper = InventoryDeductionHelper(
            db=db,
            restaurant_id=restaurant_id,
            subscription_tier=subscription_tier,
            employee_id=employee_id,
        )

    # Internal status mapping between DB values and frontend canonical values
    def _to_frontend_status(self, db_status: str) -> str:
        mapping = {
            "open": "pending",
            "in_progress": "preparing",
            "completed": "completed",
            "cancelled": "cancelled",
            "ready": "ready",
        }
        return mapping.get(db_status, db_status)

    def _to_db_status(self, frontend_status: str) -> str:
        mapping = {
            "pending": "open",
            "confirmed": "in_progress",
            "preparing": "in_progress",
            "ready": "ready",
            "completed": "completed",
            "cancelled": "cancelled",
        }
        return mapping.get(frontend_status, frontend_status)

    async def _build_items_with_modifiers(self, order_id: int, items) -> List[Dict[str, Any]]:
        """Return order items with attached modifiers."""
        mods = await self.mod_repo.list_for_order(order_id)
        mods_by_item: DefaultDict[int, List[Dict[str, Any]]] = defaultdict(list)
        for mod in mods:
            mods_by_item[mod.order_item_id].append(
                {
                    "mod_type": mod.mod_type,
                    "reference_id": mod.reference_id,
                    "quantity": float(mod.quantity or 0),
                    "note": mod.note,
                }
            )

        items_dto: List[Dict[str, Any]] = []
        for it in items:
            items_dto.append(
                {
                    "order_item_id": it.order_item_id,
                    "order_id": it.order_id,
                    "menu_item_id": it.menu_item_id,
                    "quantity": float(it.quantity),
                    "unit_price": float(it.unit_price),
                    "instructions": it.instructions,
                    "modifiers": mods_by_item.get(it.order_item_id, []),
                    "created_at": None,
                    "updated_at": None,
                }
            )
        return items_dto

    @log_method("[Order] Create Order")
    async def create_order(self, order: OrderCreate):
        """
        Transactionally create order, order_items, and modifiers, snapshotting minimal item data.
        Returns the created order primary key.
        """
        async with self.db.begin():
            order_data = {
                "external_id": order.external_id,
                "restaurant_id": self.restaurant_id,
                "employee_id": self.employee_id,
                "order_status": "open",
                "sales_channel": order.sales_channel,
                "subtotal": order.subtotal,
                "tax": order.tax,
                "discount": order.discount,
                "total": order.total,
            }
            created = await self.order_repo.create(order_data)
            order_id = getattr(created, self.order_repo.pk_field)

            # create items and modifiers
            for it in order.items:
                item_snapshot = {
                    "menu_item_id": it.menu_item_id,
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "line_total": it.unit_price * it.quantity,
                    "instructions": it.instructions,
                    # simple recipe snapshot placeholder
                    "recipe_snapshot": {"menu_item_id": it.menu_item_id},
                }
                created_item = await self.order_item_repo.create({**item_snapshot, "order_id": order_id})
                item_id = getattr(created_item, self.order_item_repo.pk_field)

                for mod in it.modifiers or []:
                    mod_data = {
                        "order_item_id": item_id,
                        "mod_type": mod.mod_type,
                        "reference_id": mod.reference_id,
                        "quantity": mod.quantity,
                        "note": mod.note,
                    }
                    await self.mod_repo.create(mod_data)

        # broadcast to kitchen room
        room = f"kitchen_{self.restaurant_id}"
        payload = {"type": "new_order", "order_id": order_id}
        await manager.send_message(room, payload)

        return {"order_id": order_id, "status": "created", "message": "Order created"}
    async def get_order_by_id(self, order_id: int):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            return None
        # include items for order detail
        items = await self.order_item_repo.get_by_order_id(order_id)
        items_dto = await self._build_items_with_modifiers(order_id, items)
        created_iso = order.order_timestamp.isoformat() if getattr(order, "order_timestamp", None) else None
        return {
            "order_id": order.order_id,
            "external_id": order.external_id,
            "sales_channel": order.sales_channel,
            "status": self._to_frontend_status(order.order_status),
            "order_status": order.order_status,
            "items": items_dto,
            "subtotal": float(order.subtotal or 0),
            "tax": float(order.tax or 0),
            "discount": float(order.discount or 0),
            "total": float(order.total or 0),
            "created_at": created_iso,
            "updated_at": created_iso,
            "completed_at": None,
            "inventory_deduction_state": getattr(order, "inventory_deduction_state", "pending"),
        }

    @log_method("Update Order Status")
    async def update_order_status(self, order_id: int, new_status: str):
        """
        Update the status of an order (e.g., 'open', 'in_progress', 'completed', 'cancelled').
        """
        db_status = self._to_db_status(new_status)
        await self.order_repo.update(order_id, {"order_status": db_status})
        return {
            "order_id": order_id,
            "status": new_status,
            "message": f"Order {order_id} status updated to {new_status}",
        }

    @log_method("Update Order")
    async def update_order(self, order_id: int, update: OrderUpdate):
        """Edit core order fields and optionally replace items/modifiers."""
        existing = await self.order_repo.get_by_id(order_id)
        if not existing:
            raise ValueError(f"Order {order_id} not found")

        async with self.db.begin():
            update_fields = {}

            if update.status:
                update_fields["order_status"] = self._to_db_status(update.status)

            for field in ["external_id", "sales_channel", "subtotal", "tax", "discount", "total"]:
                value = getattr(update, field, None)
                if value is not None:
                    update_fields[field] = value

            if update_fields:
                await self.order_repo.update(order_id, update_fields)

            if update.items is not None:
                # full replacement of items/modifiers for simplicity
                await self.mod_repo.delete_by_order_id(order_id)
                await self.order_item_repo.delete_by_order_id(order_id)

                for it in update.items:
                    item_snapshot = {
                        "menu_item_id": it.menu_item_id,
                        "quantity": it.quantity,
                        "unit_price": it.unit_price,
                        "line_total": it.unit_price * it.quantity,
                        "instructions": it.instructions,
                        "recipe_snapshot": {"menu_item_id": it.menu_item_id},
                        "order_id": order_id,
                    }
                    created_item = await self.order_item_repo.create(item_snapshot)
                    item_id = getattr(created_item, self.order_item_repo.pk_field)

                    for mod in it.modifiers or []:
                        mod_data = {
                            "order_item_id": item_id,
                            "mod_type": mod.mod_type,
                            "reference_id": mod.reference_id,
                            "quantity": mod.quantity,
                            "note": mod.note,
                        }
                        await self.mod_repo.create(mod_data)

        # broadcast update to kitchen
        room = f"kitchen_{self.restaurant_id}"
        payload = {"type": "order_updated", "order_id": order_id}
        await manager.send_message(room, payload)

        return {
            "order_id": order_id,
            "status": update.status or self._to_frontend_status(existing.order_status),
            "message": "Order updated",
        }

    @log_method("Get Active Orders")
    async def get_active_orders(self, include_completed: bool = False):
        """
        Get active orders. Default: open/pending, in_progress/preparing, ready. Optional include_completed.
        """
        orders = await self.order_repo.get_active_orders(include_completed=include_completed)
        results = []
        for o in orders:
            items = await self.order_item_repo.get_by_order_id(o.order_id)
            items_dto = await self._build_items_with_modifiers(o.order_id, items)
            created_iso = o.order_timestamp.isoformat() if getattr(o, "order_timestamp", None) else None
            results.append(
                {
                    "order_id": o.order_id,
                    "external_id": o.external_id,
                    "sales_channel": o.sales_channel,
                    "status": self._to_frontend_status(o.order_status),
                    "order_status": o.order_status,
                    "items": items_dto,
                    "subtotal": float(o.subtotal or 0),
                    "tax": float(o.tax or 0),
                    "discount": float(o.discount or 0),
                    "total": float(o.total or 0),
                    "created_at": created_iso,
                    "updated_at": created_iso,
                    "completed_at": None,
                    "inventory_deduction_state": getattr(o, "inventory_deduction_state", "pending"),
                }
            )
        return results

    @log_method("Complete Order")
    async def complete_order(self, order_id: int):
        """
        Mark order as completed and insert sales records.
        """
        # Get the order
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")

        # Get order items
        items = await self.order_item_repo.get_by_order_id(order_id)

        # Insert sales for each item
        for item in items:
            sale_data = {
                "restaurant_id": self.restaurant_id,
                "sale_timestamp": datetime.utcnow(),
                "menu_item_id": item.menu_item_id,
                "quantity_sold": item.quantity,
                "sales_channel": order.sales_channel,
            }
            await self.sales_repo.create(sale_data)

        if await self._should_use_real_time_deduction():
            menu_items_payload = [
                {"menu_item_id": item.menu_item_id, "quantity": float(item.quantity)}
                for item in items
            ]
            helper_result: Optional[Dict[str, Any]] = None
            try:
                helper_result = await self.inventory_helper.deduct_for_menu_items(
                    menu_items=menu_items_payload,
                    reference_id=order_id,
                    reference_type="sale",
                )
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.error("[Order] Real-time deduction failed order=%s error=%s", order_id, exc, exc_info=True)
                helper_result = {"failures": [{"error": str(exc)}]}
            await self.record_inventory_deduction_state(order_id, helper_result, fallback_state="failed")
        else:
            await self.record_inventory_deduction_state(order_id, None, fallback_state="pending")

        # Update order status
        await self.update_order_status(order_id, 'completed')
        return {"order_id": order_id, "status": "completed", "message": f"Order {order_id} completed"}
    @log_method("Cancel Order")
    async def cancel_order(self, order_id: int):
        """
        Mark order as cancelled.
        """
        await self.update_order_status(order_id, 'cancelled')
        return {"order_id": order_id, "status": "cancelled", "message": f"Order {order_id} cancelled"}

    @log_method("Get Sales Channels")
    async def get_sales_channels(self):
        """
        Get the list of available sales channels for the restaurant.
        """
        return await self.restaurant_repo.get_sales_channels()

    @log_method("[Order] Get Menu Items")
    async def get_menu_items(self):
        """
        Get active menu items for the restaurant, tiered by subscription.
        Basic: Simple items without recipes.
        Full tier: Placeholder for future complex ingredient/recipe linkages.
        """
        menu_items = await self.menu_repo.get_all()
        active_items = [item for item in menu_items if item.is_active]
        
        normalized_tier = normalize_subscription_tier(self.subscription_tier)

        if normalized_tier == "basic":
            # Basic tier: Simple menu items
            return [
                {
                    "menu_item_id": item.menu_item_id,
                    "name": item.name,
                    "price": float(item.price),
                    "category": item.category,
                    "tier": "basic",
                }
                for item in active_items
            ]
        elif normalized_tier == "full":
            # Full tier: Placeholder for future - will include recipes, ingredients, modifiers
            # For now, return basic data with tier flag
            return [
                {
                    "menu_item_id": item.menu_item_id,
                    "name": item.name,
                    "price": float(item.price),
                    "category": item.category,
                    "tier": normalized_tier,
                    # TODO: Add recipes, ingredients, available modifiers for full tier
                }
                for item in active_items
            ]
        else:
            # Fallback to basic
            return [
                {
                    "menu_item_id": item.menu_item_id,
                    "name": item.name,
                    "price": float(item.price),
                    "category": item.category,
                    "tier": "basic",
                }
                for item in active_items
            ]

    async def _should_use_real_time_deduction(self) -> bool:
        if not is_full_service_tier(self.subscription_tier):
            return False
        return await self.inventory_helper.is_real_time_enabled()

    def _derive_deduction_state(self, helper_result: Dict[str, Any]) -> str:
        if not helper_result:
            return "failed"
        if helper_result.get("failures"):
            return "failed"
        if helper_result.get("skipped"):
            return "skipped"
        return "succeeded"

    async def record_inventory_deduction_state(
        self,
        order_id: int,
        helper_result: Optional[Dict[str, Any]],
        fallback_state: str = "pending",
    ) -> str:
        state = fallback_state
        if helper_result is not None:
            state = self._derive_deduction_state(helper_result)
        await self.order_repo.update(order_id, {"inventory_deduction_state": state})
        return state
