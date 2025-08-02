# app/repositories/scheduled_shifts.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.future import select
from datetime import datetime
from typing import List, Optional
from app.db.models.scheduled_shifts_orm import ScheduledShift


class ScheduledShiftRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, ScheduledShift, restaurant_id, pk_field="shift_id")

    async def get_by_employee_id(self, employee_id: int) -> List[ScheduledShift]:
        # Query to retrieve all shifts for the given employee
        result = await self.db.execute(select(ScheduledShift).filter(ScheduledShift.employee_id == employee_id))
        
        # Return the list of shifts
        return result.scalars().all()