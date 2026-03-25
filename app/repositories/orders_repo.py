# app/repositories/orders_repo.py

from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.db.models.orders_orm import Order
from app.repositories.base_repository import BaseRepository
from typing import Optional, List


class OrdersRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Order, restaurant_id, pk_field="order_id")

    async def get_active_orders(self, include_completed: bool = False):
        """Return active orders (open, in_progress, ready); optionally include completed."""
        active_statuses = ['open', 'in_progress', 'ready']
        if include_completed:
            active_statuses.append('completed')

        stmt = select(Order).where(
            Order.restaurant_id == self.restaurant_id,
            Order.order_status.in_(active_statuses)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_external_id(self, external_id: str) -> Optional[Order]:
        if not external_id:
            return None

        stmt = select(Order).where(
            Order.restaurant_id == self.restaurant_id,
            Order.external_id == external_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_recent_external_import_orders(self, limit: int = 10) -> List[Order]:
        source_expr = func.json_unquote(func.json_extract(Order.order_metadata, '$.source'))
        stmt = (
            select(Order)
            .where(
                Order.restaurant_id == self.restaurant_id,
                source_expr == 'external_pos_import',
            )
            .order_by(Order.order_timestamp.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def mark_completed_orders_deducted_for_date(self, target_date: date):
        """Set inventory_deduction_state='succeeded' for completed orders on target_date."""
        start = datetime.combine(target_date, datetime.min.time())
        end = start + timedelta(days=1)
        stmt = (
            update(Order)
            .where(
                Order.restaurant_id == self.restaurant_id,
                Order.order_status == 'completed',
                Order.order_timestamp >= start,
                Order.order_timestamp < end,
                Order.inventory_deduction_state == 'pending',
            )
            .values(inventory_deduction_state='succeeded')
        )
        await self.db.execute(stmt)
