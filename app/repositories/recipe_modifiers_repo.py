# app/repositories/recipe_modifiers_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.recipe_modifiers_orm import RecipeModifier
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from sqlalchemy.exc import IntegrityError


class RecipeModifierRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, RecipeModifier, restaurant_id, pk_field="modifier_id")

    async def get_by_recipe(self, recipe_id: int) -> List[RecipeModifier]:
        """Retrieve all modifiers for a given recipe ID."""
        result = await self.db.execute(
            select(RecipeModifier).filter(
                RecipeModifier.recipe_id == recipe_id,
                RecipeModifier.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()
