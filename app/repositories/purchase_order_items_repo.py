# app/repositories/purchase_order_items_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.repositories.base_repository import BaseRepository


class PurchaseOrderItemRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, PurchaseOrderItem, restaurant_id, pk_field="order_item_id")

    async def get_confirmed_inbound(self, ingredient_id):
        from sqlalchemy import select
        from app.db.models.purchase_orders_orm import PurchaseOrder
        rows = (await self.db.execute(select(PurchaseOrderItem, PurchaseOrder.expected_delivery_date)
            .join(PurchaseOrder, PurchaseOrder.order_id == PurchaseOrderItem.order_id)
            .where(PurchaseOrderItem.restaurant_id == self.restaurant_id,
                   PurchaseOrder.restaurant_id == self.restaurant_id,
                   PurchaseOrderItem.ingredient_id == ingredient_id,
                   PurchaseOrder.status == "pending"))).all()
        return [{"order_item_id": item.order_item_id, "delivery_date": eta,
                 "quantity": max(item.quantity_ordered - (item.quantity_received or 0), 0),
                 "unit": item.unit} for item, eta in rows]
