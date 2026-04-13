# app/repositories/batch_recipes_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.batch_recipes_orm import BatchRecipe
from app.repositories.base_repository import BaseRepository
from typing import List


class BatchRecipeRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, BatchRecipe, restaurant_id, pk_field="batch_recipe_id")

    async def get_active(self) -> List[BatchRecipe]:
        result = await self.db.execute(
            select(BatchRecipe).where(
                BatchRecipe.restaurant_id == self.restaurant_id,
                BatchRecipe.is_active.is_(True),
            )
        )
        return result.scalars().all()
