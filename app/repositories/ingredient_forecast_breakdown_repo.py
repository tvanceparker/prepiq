# app/repositories/ingredient_forecast_breakdown_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.db.models.ingredient_forecast_breakdown_orm import IngredientForecastBreakdown


class IngredientForecastBreakdownRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(
            db,
            IngredientForecastBreakdown,
            restaurant_id,
            pk_field="ingredient_breakdown_id",
        )
