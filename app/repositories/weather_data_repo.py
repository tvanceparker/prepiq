# app/repositories/weather_data_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.mysql import insert as mysql_insert
from app.repositories.base_repository import BaseRepository
from typing import List, Dict, Any, Optional, Tuple
from datetime import date

from app.db.models.weather_data_orm import WeatherData


class WeatherDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, WeatherData, restaurant_id, pk_field="weather_id")

    async def get_bounds(self) -> Tuple[Optional[date], Optional[date]]:
        """Return (min_date, max_date) for this restaurant's weather data."""
        result = await self.db.execute(
            select(
                func.min(WeatherData.weather_date),
                func.max(WeatherData.weather_date),
            ).where(WeatherData.restaurant_id == self.restaurant_id)
        )
        return result.one()

    async def upsert_for_restaurant_date(self, restaurant_id: int, weather_date: date, payload: Dict[str, Any]):
        record = {**payload, "restaurant_id": restaurant_id, "weather_date": weather_date}

        stmt = mysql_insert(WeatherData).values(**record)
        updatable_fields = {
            key: stmt.inserted[key]
            for key in record.keys()
            if key not in {"restaurant_id", "weather_date"}
        }
        upsert_stmt = stmt.on_duplicate_key_update(**updatable_fields)
        await self.db.execute(upsert_stmt)
        await self.db.flush()

        return await self.get_one_by(
            {"restaurant_id": restaurant_id, "weather_date": weather_date}
        )

    async def get_range(self, restaurant_id: int, start_date: date, end_date: date) -> List[WeatherData]:
        return await self.filter_between_dates("weather_date", start_date, end_date)
