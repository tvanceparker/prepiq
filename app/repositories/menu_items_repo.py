# app/repositories/menu_items_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models.menu_items_orm import MenuItem
from app.repositories.base_repository import BaseRepository
from typing import List, Dict


class MenuItemRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, MenuItem, restaurant_id, pk_field="menu_item_id")

    async def get_by_ids(self, menu_item_ids: List[int]) -> List[MenuItem]:
        result = await self.db.execute(
            select(MenuItem).filter(
                MenuItem.menu_item_id.in_(menu_item_ids),
                MenuItem.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()
    
    async def get_prices_by_ids(self, menu_item_ids: List[int]) -> Dict[int, float]:
        """
        Return a dict mapping menu_item_id to price for given ids.
        """
        stmt = select(MenuItem.menu_item_id, MenuItem.price).where(
            MenuItem.menu_item_id.in_(menu_item_ids),
            MenuItem.restaurant_id == self.restaurant_id,
            MenuItem.is_active == 1,
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return {row.menu_item_id: float(row.price) for row in rows}

    async def get_by_name(self, name: str):
        normalized_name = name.strip().lower()
        return await self.db.scalar(
            select(MenuItem).where(
                func.lower(MenuItem.name) == normalized_name,
                MenuItem.restaurant_id == self.restaurant_id
            )
        )
    
    async def get_active_menu_items(self) -> List[MenuItem]:
        """
        Return all active menu items for the restaurant.
        """
        stmt = select(MenuItem).where(
            MenuItem.restaurant_id == self.restaurant_id,
            MenuItem.is_active == 1
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
