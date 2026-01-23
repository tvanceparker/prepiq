# app/repositories/batch_recipe_ingredients_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.db.models.ingredients_orm import Ingredient
from sqlalchemy import select, delete
from app.db.models.batch_recipe_ingredients_orm import BatchRecipeIngredient
from app.repositories.base_repository import BaseRepository
from typing import Optional, List


class BatchRecipeIngredientRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, BatchRecipeIngredient, restaurant_id)

    async def get_by_batch_recipe_id(
        self, batch_recipe_id: int
    ) -> List[BatchRecipeIngredient]:
        stmt = select(self.model).filter(
            self.model.batch_recipe_id == batch_recipe_id,
            self.model.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_ids(
        self, batch_recipe_id: int, reference_id: int, ingredient_type: str = "ingredient"
    ) -> Optional[BatchRecipeIngredient]:
        stmt = select(BatchRecipeIngredient).where(
            BatchRecipeIngredient.batch_recipe_id == batch_recipe_id,
            BatchRecipeIngredient.reference_id == reference_id,
            BatchRecipeIngredient.ingredient_type == ingredient_type,
            BatchRecipeIngredient.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_for_batch(self, batch_recipe_id: int):
        stmt = (
            select(BatchRecipeIngredient)
            .options(joinedload(BatchRecipeIngredient.ingredient))  # Eager load
            .where(
                BatchRecipeIngredient.batch_recipe_id == batch_recipe_id,
                BatchRecipeIngredient.restaurant_id == self.restaurant_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update_by_ids(
        self, batch_recipe_id: int, reference_id: int, update_data: dict, ingredient_type: str = "ingredient"
    ) -> Optional[BatchRecipeIngredient]:
        obj = await self.get_by_ids(batch_recipe_id, reference_id, ingredient_type)
        if not obj:
            return None

        for field, value in update_data.items():
            setattr(obj, field, value)

        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete_by_ids(self, batch_recipe_id: int, reference_id: int, ingredient_type: str = "ingredient") -> bool:
        obj = await self.get_by_ids(batch_recipe_id, reference_id, ingredient_type)
        if not obj:
            return False

        await self.db.delete(obj)
        return True

    async def get_all_for_batch_ingredient(
        self, batch_recipe_id: int
    ) -> List[BatchRecipeIngredient]:
        stmt = select(BatchRecipeIngredient).where(
            BatchRecipeIngredient.batch_recipe_id == batch_recipe_id,
            BatchRecipeIngredient.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
