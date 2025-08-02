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