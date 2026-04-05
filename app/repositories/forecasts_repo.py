# app/repositories/forecast_repo.py

from datetime import date, datetime
from typing import List

from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models.forecasts_orm import Forecast
from app.repositories.base_repository import BaseRepository


class ForecastRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Forecast, restaurant_id, pk_field="forecast_id")

    # In your ForecastRepository class
    async def get_next_forecast_version(self, menu_item_id: int) -> int:
        """
        Get next available forecast version for a menu item.
        """
        result = await self.db.execute(
            select(func.max(self.model.forecast_version))
            .filter(
                self.model.menu_item_id == menu_item_id,
                self.model.restaurant_id == self.restaurant_id,
            )
        )
        max_version = result.scalar()
        return (max_version or 0) + 1

    async def get_forecasts_ending_before(self, check_date: date) -> List[Forecast]:
        """
        Get all forecasts for this restaurant where forecast_period_end <= check_date
        """
        stmt = (
            select(Forecast)
            .where(
                Forecast.restaurant_id == self.restaurant_id,
                Forecast.forecast_period_end <= check_date
            )
        )
        result = await self.db.execute(stmt)
        forecasts = result.scalars().all()
        return forecasts
    async def get_latest_forecast_for_item(self, menu_item_id: int) -> Forecast | None:
        """
        Return the latest forecast for the given menu_item_id,
        ordered by forecast_period_end DESC, then created_at DESC.
        """
        stmt = (
            select(self.model)
            .where(
                self.model.menu_item_id == menu_item_id,
                self.model.restaurant_id == self.restaurant_id,
            )
            .order_by(
                desc(self.model.forecast_period_end),
                desc(self.model.created_at)
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        forecast = result.scalars().first()
        return forecast

    async def get_forecasts_covering_date(self, target_date: date) -> List[Forecast]:
        """
        Get all forecasts for this restaurant where the forecast period
        covers the target_date (i.e., start <= target_date <= end).
        """
        stmt = (
            select(self.model)
            .where(
                self.model.restaurant_id == self.restaurant_id,
                self.model.forecast_period_start <= target_date,
                self.model.forecast_period_end >= target_date,
            )
        )
        result = await self.db.execute(stmt)
        forecasts = result.scalars().all()
        return forecasts

    async def get_by_period_and_menu_item(self, menu_item_id: int, start_date: date, end_date: date) -> Forecast | None:
        """
        Return a forecast for the exact period and menu item if it exists.
        """
        stmt = (
            select(self.model)
            .where(
                self.model.menu_item_id == menu_item_id,
                self.model.restaurant_id == self.restaurant_id,
                self.model.forecast_period_start == start_date,
                self.model.forecast_period_end == end_date,
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_forecasts_created_between(
        self,
        start_datetime: datetime,
        end_datetime: datetime,
    ) -> List[Forecast]:
        stmt = (
            select(self.model)
            .where(
                self.model.restaurant_id == self.restaurant_id,
                self.model.created_at >= start_datetime,
                self.model.created_at <= end_datetime,
            )
            .order_by(desc(self.model.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()