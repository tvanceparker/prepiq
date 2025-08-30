# app/repositories/orders_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.orders_orm import Order
from app.repositories.base_repository import BaseRepository


class OrdersRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Order, restaurant_id, pk_field="order_id")

    async def get_active_orders(self):
        """
        Get orders with active status ('open', 'in_progress').
        """
        stmt = select(Order).where(
            Order.restaurant_id == self.restaurant_id,
            Order.order_status.in_(['open', 'in_progress'])
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
