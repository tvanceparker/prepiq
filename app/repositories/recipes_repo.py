# app/repositories/recipes_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from app.repositories.base_repository import BaseRepository
from app.db.models.recipes_orm import Recipe
from app.schemas.menu_dto import RecipeCreate, RecipeUpdate
from typing import List, Optional


class RecipeRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Recipe, restaurant_id, pk_field="recipe_id")
