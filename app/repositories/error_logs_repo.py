# app/repositories/error_logs_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.error_logs_orm import ErrorLog
from app.repositories.base_repository import BaseRepository


class ErrorLogRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, ErrorLog, restaurant_id, pk_field="error_id")
