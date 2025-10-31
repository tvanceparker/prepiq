# app/repositories/clock_events_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.clock_events_orm import ClockEvent
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class ClockEventRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, ClockEvent, restaurant_id, pk_field="clock_id")

    async def get_by_employee_id(self, employee_id: int) -> List[ClockEvent]:
        # Query to retrieve all clock events for the given employee
        result = await self.db.execute(select(ClockEvent).filter(ClockEvent.employee_id == employee_id))
        
        # Return the list of clock events
        return result.scalars().all()

    async def get_by_date_range(self, start_date, end_date) -> List[ClockEvent]:
        """Get all clock events within a date range for the restaurant."""
        result = await self.db.execute(
            select(ClockEvent)
            .filter(
                ClockEvent.restaurant_id == self.restaurant_id,
                ClockEvent.clock_in >= start_date,
                ClockEvent.clock_in <= end_date,
            )
            .order_by(ClockEvent.clock_in)
        )
        return result.scalars().all()

    async def get_clocked_in_employees(self, date_filter) -> List[ClockEvent]:
        """Get all employees currently clocked in (no clock_out) for a specific date."""
        from datetime import datetime, timedelta
        
        # Convert date to datetime range
        if isinstance(date_filter, datetime):
            start_datetime = date_filter.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start_datetime = datetime.combine(date_filter, datetime.min.time())
        
        end_datetime = start_datetime + timedelta(days=1)
        
        result = await self.db.execute(
            select(ClockEvent)
            .filter(
                ClockEvent.restaurant_id == self.restaurant_id,
                ClockEvent.clock_in >= start_datetime,
                ClockEvent.clock_in < end_datetime,
                ClockEvent.clock_out.is_(None),
            )
        )
        return result.scalars().all()
