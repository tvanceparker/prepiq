# app/repositories/forecast_accuracy_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.forecast_accuracy_orm import ForecastAccuracy
from app.repositories.base_repository import BaseRepository
from datetime import date
from typing import Optional, List


class ForecastAccuracyRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, ForecastAccuracy, restaurant_id, pk_field="accuracy_id")

    async def get_by_forecast_id(self, forecast_id: int):
        stmt = select(self.model).where(
            self.model.forecast_id == forecast_id,
            self.model.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_date_range(self, start_date: date, end_date: date) -> List[ForecastAccuracy]:
        stmt = select(self.model).where(
            self.model.restaurant_id == self.restaurant_id,
            self.model.forecast_period_start >= start_date,
            self.model.forecast_period_end <= end_date,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_overlapping_date_range(self, start_date: date, end_date: date) -> List[ForecastAccuracy]:
        stmt = select(self.model).where(
            self.model.restaurant_id == self.restaurant_id,
            self.model.forecast_period_end >= start_date,   # ends after start
            self.model.forecast_period_start <= end_date    # starts before end
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
