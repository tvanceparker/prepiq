# app/repositories/supplier.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from app.db.models.supplier_orm import Supplier
from typing import List, Optional


class SupplierRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Supplier, restaurant_id, pk_field="supplier_id")

    async def get_by_ids(self, supplier_ids: List[int]) -> List[Supplier]:
        stmt = select(self.model).filter(
            self.model.supplier_id.in_(supplier_ids),
            self.model.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
