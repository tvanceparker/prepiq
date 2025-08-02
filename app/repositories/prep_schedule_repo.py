# app/repositories/prep_schedule_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.prep_schedule_orm import PrepSchedule
from app.repositories.base_repository import BaseRepository
from sqlalchemy.future import select
from datetime import date
from typing import List


class PrepScheduleRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, PrepSchedule, restaurant_id, pk_field="prep_id")

    async def get_scheduled_by_date(self, date: date) -> List[PrepSchedule]:
        """
        Fetch all prep schedules scheduled for the given date and restaurant.
        """
        result = await self.db.execute(
            select(PrepSchedule)
            .filter(
                PrepSchedule.restaurant_id == self.restaurant_id,
                PrepSchedule.prep_date == date,
            )
            .order_by(PrepSchedule.prep_id.asc())
        )
        return result.scalars().all()

    async def get_by_recipe_and_date(
        self, batch_recipe_id: int, date: date
    ) -> List[PrepSchedule]:
        """
        Fetch prep schedules filtered by batch_recipe_id and prep_date for the restaurant.
        """
        result = await self.db.execute(
            select(PrepSchedule)
            .filter(
                PrepSchedule.restaurant_id == self.restaurant_id,
                PrepSchedule.batch_recipe_id == batch_recipe_id,
                PrepSchedule.prep_date == date,
            )
            .order_by(PrepSchedule.prep_id.asc())
        )
        return result.scalars().all()
