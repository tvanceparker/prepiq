# app/repositories/batch_recipe_forecast_breakdown_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.db.models.batch_recipe_forecast_breakdown_orm import (
    BatchRecipeForecastBreakdown,
)


class BatchRecipeForecastBreakdownRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(
            db,
            BatchRecipeForecastBreakdown,
            restaurant_id,
            pk_field="batch_breakdown_id",
        )
