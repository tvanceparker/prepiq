# app/repositories/recipe_ingredients_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.repositories.base_repository import BaseRepository
from app.db.models.recipe_ingredients_orm import RecipeIngredient
from typing import List, Optional
from sqlalchemy.exc import IntegrityError


class RecipeIngredientRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(
            db, RecipeIngredient, restaurant_id, pk_field="recipe_ingredient_id"
        )

    async def get_by_recipe_id(self, recipe_id: int) -> List[RecipeIngredient]:
        stmt = select(RecipeIngredient).where(
            RecipeIngredient.recipe_id == recipe_id,
            RecipeIngredient.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_all_by_reference_id_and_type(
        self, ingredient_type: str, reference_id: int
    ) -> List[RecipeIngredient]:
        """Get all recipe ingredients by type ('batch') and reference_id (batch_recipe_id)."""
        result = await self.db.execute(
            select(RecipeIngredient).filter_by(
                restaurant_id=self.restaurant_id,
                ingredient_type=ingredient_type,
                reference_id=reference_id,
            )
        )
        return result.scalars().all()

    async def delete_by_recipe_id(self, recipe_id: int) -> int:
        """
        Delete all RecipeIngredient records for the given recipe_id and restaurant_id.

        Returns:
            Number of rows deleted.
        """
        stmt = (
            RecipeIngredient.__table__.delete()
            .where(
                RecipeIngredient.recipe_id == recipe_id,
                RecipeIngredient.restaurant_id == self.restaurant_id,
            )
        )
        result = await self.db.execute(stmt)
        # No commit here; let the service layer handle the transaction commit
        return result.rowcount  # number of rows deleted
