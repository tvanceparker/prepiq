# app/repositories/activity_logs_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.activity_logs_orm import ActivityLog
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class ActivityLogRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int, employee_id: int = None):
        super().__init__(db, ActivityLog, restaurant_id, pk_field="activity_id")
        if employee_id:
            self.employee_id = employee_id

    async def create(self, obj_data: dict):
        obj_dict = self._to_dict(obj_data)
        obj_dict["restaurant_id"] = self.restaurant_id
        obj_dict["employee_id"] = self.employee_id
        obj_dict.pop("created_at", None)

        obj = self.model(**obj_dict)
        self.db.add(obj)

        await self.db.flush()
        await self.db.refresh(obj)
        return obj
