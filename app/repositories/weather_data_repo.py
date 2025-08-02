# app/repositories/weather_data_repo.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.future import select
from app.db.models.weather_datas_orm import WeatherData
from typing import List, Optional


class WeatherDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, WeatherData, restaurant_id, pk_field="weather_id")
