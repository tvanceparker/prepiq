# app/repositories/purchase_order_items_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.repositories.base_repository import BaseRepository


class PurchaseOrderItemRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, PurchaseOrderItem, restaurant_id, pk_field="order_item_id")
