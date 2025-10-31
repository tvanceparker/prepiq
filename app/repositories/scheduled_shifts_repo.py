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

    async def get_shifts_by_date_range(
        self, start_date: datetime.date, end_date: datetime.date
    ) -> List[ScheduledShift]:
        """Get all shifts within a date range for the restaurant."""
        from datetime import datetime as dt
        
        # Convert dates to datetime for comparison
        start_datetime = dt.combine(start_date, dt.min.time())
        end_datetime = dt.combine(end_date, dt.max.time())
        
        result = await self.db.execute(
            select(ScheduledShift)
            .filter(
                ScheduledShift.restaurant_id == self.restaurant_id,
                ScheduledShift.shift_start >= start_datetime,
                ScheduledShift.shift_start <= end_datetime,
            )
            .order_by(ScheduledShift.shift_start)
        )
        
        return result.scalars().all()