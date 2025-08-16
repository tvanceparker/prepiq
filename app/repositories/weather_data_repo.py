# app/repositories/weather_data_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from typing import List, Dict, Any
from datetime import date

from app.db.models.weather_data_orm import WeatherData


class WeatherDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, WeatherData, restaurant_id, pk_field="weather_id")

    async def upsert_for_restaurant_date(self, restaurant_id: int, weather_date: date, payload: Dict[str, Any]):
        existing = await self.get_one_by({"restaurant_id": restaurant_id, "weather_date": weather_date})
        if existing:
            await self.update(existing.weather_id, payload)
            return existing
        return await self.create({**payload, "restaurant_id": restaurant_id, "weather_date": weather_date})

    async def get_range(self, restaurant_id: int, start_date: date, end_date: date) -> List[WeatherData]:
        return await self.filter_between_dates("weather_date", start_date, end_date)
