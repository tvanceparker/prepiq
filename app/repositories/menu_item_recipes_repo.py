# app/repositories/menu_item_recipes_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.db.models.menu_item_recipes_orm import MenuItemRecipe
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class MenuItemRecipeRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, MenuItemRecipe, restaurant_id)

    async def get_by_menu_item(self, menu_item_id: int):
        stmt = select(self.model).filter(
            self.model.menu_item_id == menu_item_id,
            self.model.restaurant_id == self.restaurant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_all_by_menu_item(self, menu_item_id: int) -> List[MenuItemRecipe]:
        result = await self.db.execute(
            select(MenuItemRecipe).filter_by(
                restaurant_id=self.restaurant_id, menu_item_id=menu_item_id
            )
        )
        return result.scalars().all()

    async def get_by_recipe(self, recipe_id: int) -> List[MenuItemRecipe]:
        """Get menu item recipes by recipe ID and restaurant ID."""
        result = await self.db.execute(
            select(MenuItemRecipe).filter(
                MenuItemRecipe.recipe_id == recipe_id,
                MenuItemRecipe.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_recipe_ids_for_menu_item(self, menu_item_id: int) -> List[int]:
        links = await self.get_by_menu_item(
            menu_item_id
        )  # This returns MenuItemRecipe objects
        return [link.recipe_id for link in links]

    async def get_menu_item_recipe(
        self, menu_item_id: int, recipe_id: int
    ) -> Optional[MenuItemRecipe]:
        """Get a menu item recipe by menu item ID and recipe ID."""
        result = await self.db.execute(
            select(MenuItemRecipe).filter(
                MenuItemRecipe.menu_item_id == menu_item_id,
                MenuItemRecipe.recipe_id == recipe_id,
                MenuItemRecipe.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, obj_data):
        # Accept dict or Pydantic model, convert dict to kwargs for constructor
        if isinstance(obj_data, dict):
            self.db.add(self.model(**obj_data))
        else:
            self.db.add(self.model(**obj_data.dict()))
        await self.db.flush()

    async def delete(self, menu_item_id: int, recipe_id: int):
        stmt = delete(self.model).where(
            self.model.menu_item_id == menu_item_id,
            self.model.recipe_id == recipe_id,
            self.model.restaurant_id == self.restaurant_id,
        )
        await self.db.execute(stmt)
