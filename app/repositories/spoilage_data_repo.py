# app/repositories/spoilage_data_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
from app.db.models.spoilage_data_orm import SpoilageData


class SpoilageDataRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, SpoilageData, restaurant_id, pk_field="spoilage_id")
