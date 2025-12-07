# app/repositories/inventory_usage_log_repo.py


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from datetime import date, timedelta
from decimal import Decimal
from app.db.models.inventory_usage_log_orm import InventoryUsageLog
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from collections import namedtuple


DailyUsage = namedtuple("DailyUsage", ["used_date", "usage_quantity"])


class InventoryUsageLogRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, InventoryUsageLog, restaurant_id, pk_field="usage_id")

    async def get_all_by_lot_id(self, lot_id: int) -> List[InventoryUsageLog]:
        result = await self.db.execute(
            select(InventoryUsageLog).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.lot_id == lot_id,
            )
        )
        rows = result.scalars().all()
        print(f"[DEBUG] Usage logs for lot_id={lot_id}: {rows}")
        return rows

    async def get_daily_usage(
        self, ingredient_id: int, trailing_days: int = 30
    ) -> List[DailyUsage]:
        """
        Return list of (usage_date, total_usage_quantity) over the last `trailing_days` days for the given ingredient.
        """
        start_date = date.today() - timedelta(days=trailing_days)

        result = await self.db.execute(
            select(
                InventoryUsageLog.used_date,
                func.sum(InventoryUsageLog.used_quantity).label("usage_quantity"),
            )
            .where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.ingredient_id == ingredient_id,
                InventoryUsageLog.used_date >= start_date,
            )
            .group_by(InventoryUsageLog.used_date)
            .order_by(InventoryUsageLog.used_date.desc())
        )

        rows = result.all()
        return [
            DailyUsage(row.used_date.date(), Decimal(row.usage_quantity))
            for row in rows
        ]

    async def get_by_lot_id_and_usage_types(
        self,
        lot_id: int,
        usage_types: List[str],
    ) -> List[InventoryUsageLog]:
        """
        Retrieve inventory usage logs filtered by lot_id and a list of usage_types.
        """
        result = await self.db.execute(
            select(InventoryUsageLog).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.lot_id == lot_id,
                InventoryUsageLog.usage_type.in_(usage_types),
            )
        )
        rows = result.scalars().all()
        return rows

    async def exists_for_reference(self, reference_type: str, reference_id: int) -> bool:
        result = await self.db.execute(
            select(func.count(InventoryUsageLog.usage_id)).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.reference_type == reference_type,
                InventoryUsageLog.reference_id == reference_id,
            )
        )
        count = result.scalar_one()
        return count > 0