from typing import List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.orders_repo import OrdersRepository
from app.repositories.order_items_repo import OrderItemsRepository
from app.repositories.order_item_modifiers_repo import OrderItemModifiersRepository
from app.repositories.payments_repo import PaymentsRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.schemas.order_dto import OrderCreate
from app.utils.logger_helpers import log_method
from app.sockets.connection_manager import manager


class OrderService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.order_repo = OrdersRepository(db, restaurant_id)
        self.order_item_repo = OrderItemsRepository(db, restaurant_id)
        self.mod_repo = OrderItemModifiersRepository(db, restaurant_id)
        self.payment_repo = PaymentsRepository(db, restaurant_id)
        self.menu_repo = MenuItemRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)

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

        return order_id

    @log_method("Update Order Status")
    async def update_order_status(self, order_id: int, new_status: str):
        """
        Update the status of an order (e.g., 'open', 'in_progress', 'completed', 'cancelled').
        """
        await self.order_repo.update(order_id, {"order_status": new_status})

    @log_method("Get Active Orders")
    async def get_active_orders(self):
        """
        Get orders that are currently active (status: 'open', 'in_progress').
        """
        return await self.order_repo.get_active_orders()

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

        # Update order status
        await self.update_order_status(order_id, 'completed')

    @log_method("Cancel Order")
    async def cancel_order(self, order_id: int):
        """
        Mark order as cancelled.
        """
        await self.update_order_status(order_id, 'cancelled')

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
        Pro/Master: Placeholder for future complex ingredient/recipe linkages.
        """
        menu_items = await self.menu_repo.get_all()
        active_items = [item for item in menu_items if item.is_active]
        
        if self.subscription_tier == "basic":
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
        elif self.subscription_tier in ["pro", "master"]:
            # Pro/Master: Placeholder for future - will include recipes, ingredients, modifiers
            # For now, return basic data with tier flag
            return [
                {
                    "menu_item_id": item.menu_item_id,
                    "name": item.name,
                    "price": float(item.price),
                    "category": item.category,
                    "tier": self.subscription_tier,
                    # TODO: Add recipes, ingredients, available modifiers for pro/master
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
