# app/repositories/lead_time_data_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.lead_time_data_orm import LeadTimeData
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class LeadTimeDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, LeadTimeData, restaurant_id, pk_field="lead_time_id")
