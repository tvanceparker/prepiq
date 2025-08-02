# app/repositories/traffic_data_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.traffic_data_orm import TrafficData
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class TrafficDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init(db, TrafficData, restaurant_id, pk_field="traffic_id")
