# app/repositories/menu_item_batch_usage_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.menu_item_batch_usage_orm import MenuItemBatchUsage
from app.schemas.menu_dto import (
    MenuItemBatchUsageCreate,
    MenuItemBatchUsageUpdate,
)
from typing import List, Optional


class MenuItemBatchUsageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_ids(
        self, menu_item_id: int, batch_recipe_id: int, restaurant_id: int
    ) -> Optional[MenuItemBatchUsage]:
        """Get a menu item batch usage by menu item ID, batch recipe ID, and restaurant ID."""
        result = await self.db.execute(
            select(MenuItemBatchUsage).filter(
                MenuItemBatchUsage.menu_item_id == menu_item_id,
                MenuItemBatchUsage.batch_recipe_id == batch_recipe_id,
                MenuItemBatchUsage.restaurant_id == restaurant_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_all_for_menu_item(
        self, menu_item_id: int, restaurant_id: int
    ) -> List[MenuItemBatchUsage]:
        """Get all menu item batch usages for a specific menu item and restaurant."""
        result = await self.db.execute(
            select(MenuItemBatchUsage).filter(
                MenuItemBatchUsage.menu_item_id == menu_item_id,
                MenuItemBatchUsage.restaurant_id == restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_all_for_batch_recipe(
        self, batch_recipe_id: int, restaurant_id: int
    ) -> List[MenuItemBatchUsage]:
        result = await self.db.execute(
            select(MenuItemBatchUsage).filter(
                MenuItemBatchUsage.batch_recipe_id == batch_recipe_id,
                MenuItemBatchUsage.restaurant_id == restaurant_id,
            )
        )
        return result.scalars().all()

    async def create(self, data: MenuItemBatchUsageCreate) -> MenuItemBatchUsage:
        """Create a new menu item batch usage."""
        db_obj = MenuItemBatchUsage(**data.dict())
        self.db.add(db_obj)
        try:
            await self.db.commit()  # Commit asynchronously
            await self.db.refresh(db_obj)  # Refresh asynchronously
            return db_obj
        except Exception as e:
            await self.db.rollback()  # Rollback asynchronously on error
            raise ValueError(f"Error creating menu item batch usage: {str(e)}")

    async def update(
        self,
        menu_item_id: int,
        batch_recipe_id: int,
        restaurant_id: int,
        update_data: MenuItemBatchUsageUpdate,
    ) -> Optional[MenuItemBatchUsage]:
        """Update an existing menu item batch usage."""
        result = await self.db.execute(
            select(MenuItemBatchUsage).filter(
                MenuItemBatchUsage.menu_item_id == menu_item_id,
                MenuItemBatchUsage.batch_recipe_id == batch_recipe_id,
                MenuItemBatchUsage.restaurant_id == restaurant_id,
            )
        )
        db_obj = result.scalar_one_or_none()

        if db_obj:
            for key, value in update_data.dict(exclude_unset=True).items():
                setattr(db_obj, key, value)

            await self.db.commit()  # Commit asynchronously
            await self.db.refresh(db_obj)  # Refresh asynchronously
            return db_obj
        return None

    async def delete(
        self, menu_item_id: int, batch_recipe_id: int, restaurant_id: int
    ) -> bool:
        """Delete a menu item batch usage."""
        result = await self.db.execute(
            select(MenuItemBatchUsage).filter(
                MenuItemBatchUsage.menu_item_id == menu_item_id,
                MenuItemBatchUsage.batch_recipe_id == batch_recipe_id,
                MenuItemBatchUsage.restaurant_id == restaurant_id,
            )
        )
        db_obj = result.scalar_one_or_none()

        if db_obj:
            await self.db.delete(db_obj)  # Delete asynchronously
            await self.db.commit()  # Commit asynchronously
            return True
        return False
