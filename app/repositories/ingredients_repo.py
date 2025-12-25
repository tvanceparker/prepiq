# app/repositories/ingredients_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.ingredients_orm import Ingredient
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from sqlalchemy.future import select


class IngredientRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Ingredient, restaurant_id, pk_field="ingredient_id")

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Ingredient]:
        """Return active ingredients only."""
        result = await self.db.execute(
            select(Ingredient)
            .filter(
                Ingredient.restaurant_id == self.restaurant_id,
                Ingredient.is_active.is_(True),
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def soft_delete(self, ingredient_id: int) -> None:
        await self.update(ingredient_id, {"is_active": False})
