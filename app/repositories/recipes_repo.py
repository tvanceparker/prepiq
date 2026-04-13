# app/repositories/recipes_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.repositories.base_repository import BaseRepository
from app.db.models.recipes_orm import Recipe
from typing import List


class RecipeRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Recipe, restaurant_id, pk_field="recipe_id")

    async def get_active(self) -> List[Recipe]:
        result = await self.db.execute(
            select(Recipe).where(
                Recipe.restaurant_id == self.restaurant_id,
                Recipe.is_active.is_(True),
            )
        )
        return result.scalars().all()
