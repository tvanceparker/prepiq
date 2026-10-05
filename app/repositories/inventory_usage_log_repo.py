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
from app.services.utils.unit_conversion import convert_unit
from app.db.models.ingredients_orm import Ingredient


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
        self, ingredient_id: int, trailing_days: int = 30, as_of_date: Optional[date] = None
    ) -> List[DailyUsage]:
        """
        Return list of (usage_date, total_usage_quantity) over the last `trailing_days` days for the given ingredient.
        """
        end_date = as_of_date or date.today()
        start_date = end_date - timedelta(days=max(trailing_days - 1, 0))
        usage_day = func.coalesce(InventoryUsageLog.business_date, func.date(InventoryUsageLog.used_date))
        result = await self.db.execute(
            select(usage_day.label("usage_date"), InventoryUsageLog.unit, func.sum(InventoryUsageLog.used_quantity).label("usage_quantity"))
            .where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.ingredient_id == ingredient_id,
                usage_day >= start_date,
                usage_day <= end_date,
                InventoryUsageLog.usage_type.in_(["sale", "batch_production"]),
            )
            .group_by(usage_day, InventoryUsageLog.unit).order_by(usage_day)
        )
        ingredient_unit = (await self.db.execute(select(Ingredient.unit).where(
            Ingredient.restaurant_id == self.restaurant_id, Ingredient.ingredient_id == ingredient_id))).scalar_one_or_none()
        totals = {}
        for row in result.all():
            day = date.fromisoformat(row.usage_date) if isinstance(row.usage_date, str) else row.usage_date
            quantity = convert_unit(Decimal(row.usage_quantity), row.unit, ingredient_unit)
            totals[day] = totals.get(day, Decimal("0")) + quantity
        return [DailyUsage(day, quantity) for day, quantity in sorted(totals.items())]

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

    async def has_usage_type_for_lot(self, lot_id: int, usage_type: str) -> bool:
        result = await self.db.execute(
            select(func.count(InventoryUsageLog.usage_id)).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.lot_id == lot_id,
                InventoryUsageLog.usage_type == usage_type,
            )
        )
        count = result.scalar_one()
        return count > 0

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

    async def count_for_reference(self, reference_type: str, reference_id: int) -> int:
        result = await self.db.execute(
            select(func.count(InventoryUsageLog.usage_id)).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.reference_type == reference_type,
                InventoryUsageLog.reference_id == reference_id,
            )
        )
        return int(result.scalar_one() or 0)