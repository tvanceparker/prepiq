# app/repositories/forecast_breakdown_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, tuple_
from sqlalchemy.orm import aliased
from app.db.models.forecast_breakdown_orm import ForecastBreakdown
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from datetime import date


class ForecastBreakdownRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, ForecastBreakdown, restaurant_id, pk_field="breakdown_id")

    async def get_by_date_and_restaurant(
        self, forecast_date: date
    ) -> List[ForecastBreakdown]:
        result = await self.db.execute(
            select(ForecastBreakdown).where(
                ForecastBreakdown.restaurant_id == self.restaurant_id,
                ForecastBreakdown.forecast_date == forecast_date,
            )
        )
        return result.scalars().all()
    
    async def get_by_date_range(self, start_date: date, end_date: date) -> List[ForecastBreakdown]:
        stmt = select(ForecastBreakdown).where(
            ForecastBreakdown.restaurant_id == self.restaurant_id,
            ForecastBreakdown.forecast_date >= start_date,
            ForecastBreakdown.forecast_date <= end_date
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


    async def get_by_forecast(self, forecast_id: int) -> List[ForecastBreakdown]:
        result = await self.db.execute(
            select(ForecastBreakdown).where(
                ForecastBreakdown.forecast_id == forecast_id,
                ForecastBreakdown.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_by_menu_item(self, menu_item_id: int) -> List[ForecastBreakdown]:
        result = await self.db.execute(
            select(ForecastBreakdown).where(
                ForecastBreakdown.menu_item_id == menu_item_id,
                ForecastBreakdown.restaurant_id == self.restaurant_id,
            )
        )
        #returns all forecasts for that day on that menu item
    async def get_forecasts_for_date(self, date):
        stmt = select(ForecastBreakdown).where(
            ForecastBreakdown.restaurant_id == self.restaurant_id,
            ForecastBreakdown.forecast_date == date
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    #Only returns one with highest forecast id per menu item
    async def get_forecasts_by_date(self, target_date: date):
        # Subquery: get the max forecast_id per menu_item_id for the given date + restaurant 
        subquery = (
            select(
                ForecastBreakdown.menu_item_id,
                func.max(ForecastBreakdown.forecast_id).label("max_forecast_id")
            )
            .where(
                ForecastBreakdown.restaurant_id == self.restaurant_id,
                ForecastBreakdown.forecast_date == target_date
            )
            .group_by(ForecastBreakdown.menu_item_id)
            .subquery()
        )

        fb_alias = aliased(ForecastBreakdown)

        # Main query: join on the latest forecast_id for each menu_item_id
        stmt = (
            select(fb_alias)
            .join(
                subquery,
                and_(
                    fb_alias.menu_item_id == subquery.c.menu_item_id,
                    fb_alias.forecast_id == subquery.c.max_forecast_id
                )
            )
            .where(
                fb_alias.restaurant_id == self.restaurant_id,
                fb_alias.forecast_date == target_date
            )
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()


    
    async def get_latest_by_date_range(self, start_date: date, end_date: date) -> List[ForecastBreakdown]:
        # Subquery: find latest forecast_id per (forecast_date, menu_item_id)
        subquery = (
            select(
                ForecastBreakdown.forecast_date,
                ForecastBreakdown.menu_item_id,
                func.max(ForecastBreakdown.forecast_id).label("max_forecast_id")
            )
            .where(
                ForecastBreakdown.restaurant_id == self.restaurant_id,
                ForecastBreakdown.forecast_date >= start_date,
                ForecastBreakdown.forecast_date <= end_date
            )
            .group_by(ForecastBreakdown.forecast_date, ForecastBreakdown.menu_item_id)
            .subquery()
        )

        fb_alias = aliased(ForecastBreakdown)

        # Join back to ForecastBreakdown to get full rows
        stmt = (
            select(fb_alias)
            .join(
                subquery,
                and_(
                    fb_alias.forecast_date == subquery.c.forecast_date,
                    fb_alias.menu_item_id == subquery.c.menu_item_id,
                    fb_alias.forecast_id == subquery.c.max_forecast_id
                )
            )
            .where(
                fb_alias.restaurant_id == self.restaurant_id,
                fb_alias.forecast_date >= start_date,
                fb_alias.forecast_date <= end_date
            )
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_by_forecast(self, forecast_id: int) -> int:
        """
        Bulk delete all breakdown rows for the given forecast_id. Returns number of rows deleted.
        """
        from sqlalchemy import delete

        stmt = delete(ForecastBreakdown).where(
            ForecastBreakdown.restaurant_id == self.restaurant_id,
            ForecastBreakdown.forecast_id == forecast_id,
        )
        result = await self.db.execute(stmt)
        # result.rowcount may not be reliably populated across dialects, but return it when available
        try:
            return result.rowcount or 0
        except Exception:
            return 0