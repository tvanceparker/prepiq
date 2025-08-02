# app/repositories/purchase_orders_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.purchase_orders_orm import PurchaseOrder
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from sqlalchemy.exc import IntegrityError


class PurchaseOrderRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, PurchaseOrder, restaurant_id, pk_field="order_id")
