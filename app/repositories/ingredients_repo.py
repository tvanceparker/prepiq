# app/repositories/ingredients_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.ingredients_orm import Ingredient
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class IngredientRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Ingredient, restaurant_id, pk_field="ingredient_id")
