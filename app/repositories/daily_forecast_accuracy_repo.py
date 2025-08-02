# app/repositories/daily_forecast_accuracy_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,and_, func
from datetime import date
from app.db.models.daily_forecast_accuracy_orm import DailyForecastAccuracy
from sqlalchemy.orm import aliased
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class DailyForecastAccuracyRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(
            db, DailyForecastAccuracy, restaurant_id, pk_field="accuracy_id"
        )

    async def get_by_breakdown(self, breakdown_id: int):
        stmt = select(self.model).where(
            self.model.breakdown_id == breakdown_id,
            self.model.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_by_date(self, target_date: date):
        stmt = select(DailyForecastAccuracy).where(
            DailyForecastAccuracy.restaurant_id == self.restaurant_id,
            DailyForecastAccuracy.forecast_date == target_date
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_by_date_range(self, start_date: date, end_date: date) -> List[DailyForecastAccuracy]:
        stmt = select(self.model).where(
            self.model.restaurant_id == self.restaurant_id,
            self.model.forecast_date >= start_date,
            self.model.forecast_date <= end_date,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def exists_for_breakdown(self, breakdown_id: int) -> bool:
        stmt = select(DailyForecastAccuracy).where(DailyForecastAccuracy.breakdown_id == breakdown_id)
        result = await self.db.execute(stmt)
        return result.scalar() is not None
    

    async def get_latest_by_date_range(self, start_date: date, end_date: date) -> List[DailyForecastAccuracy]:
        A = aliased(self.model)

        subquery = (
            select(
                A.forecast_date,
                A.menu_item_id,
                func.max(A.breakdown_id).label("max_breakdown_id")
            )
            .where(
                A.restaurant_id == self.restaurant_id,
                A.forecast_date >= start_date,
                A.forecast_date <= end_date
            )
            .group_by(A.forecast_date, A.menu_item_id)
            .subquery()
        )

        stmt = (
            select(self.model)
            .join(subquery, and_(
                self.model.forecast_date == subquery.c.forecast_date,
                self.model.menu_item_id == subquery.c.menu_item_id,
                self.model.breakdown_id == subquery.c.max_breakdown_id,
            ))
            .where(self.model.restaurant_id == self.restaurant_id)
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()
