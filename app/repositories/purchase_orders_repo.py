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

    async def list_purchase_orders(
        self, status: Optional[str] = None, supplier_id: Optional[int] = None
    ) -> List[PurchaseOrder]:
        query = (
            select(PurchaseOrder)
            .filter(PurchaseOrder.restaurant_id == self.restaurant_id)
            .order_by(PurchaseOrder.order_date.desc())
        )

        if status:
            query = query.filter(PurchaseOrder.status == status)
        if supplier_id:
            query = query.filter(PurchaseOrder.supplier_id == supplier_id)

        result = await self.db.execute(query)
        return result.scalars().all()
