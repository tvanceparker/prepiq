# app/repositories/restaurants_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.restaurants_orm import Restaurant
from app.repositories.base_repository import BaseRepository
from app.schemas.admin_dto import RestaurantCreate, RestaurantUpdate
from typing import Optional


class RestaurantRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Restaurant, restaurant_id, pk_field="restaurant_id")

    async def get_subscription_tier(self) -> str:
        stmt = select(Restaurant.subscription_tier).where(Restaurant.restaurant_id == self.restaurant_id)
        result = await self.db.execute(stmt)
        tier = result.scalar_one_or_none()
        return tier or "basic"
    

    async def get_settings(self):
        stmt = select(
            Restaurant.forecast_length.label("forecast_length"),
            Restaurant.timezone.label("timezone"),
            Restaurant.eod_run_when_closed.label("eod_run_when_closed"),
            Restaurant.eod_run_after_close_mins.label("eod_run_after_close_mins"),
            Restaurant.sales_channels.label("sales_channels"),
            Restaurant.latitude.label("latitude"),
            Restaurant.longitude.label("longitude"),
            Restaurant.settings.label("settings"),
            Restaurant.has_pos_display.label("has_pos_display"),
            Restaurant.has_kitchen_display.label("has_kitchen_display"),
            Restaurant.default_ui_layout.label("default_ui_layout"),
        ).where(Restaurant.restaurant_id == self.restaurant_id)

        result = await self.db.execute(stmt)
        return result.mappings().first()
    
    async def get_sales_channels(self):
        stmt = select(Restaurant.sales_channels).where(Restaurant.restaurant_id == self.restaurant_id)
        result = await self.db.execute(stmt)
        channels = result.scalar_one_or_none()
        return channels or ["in-house", "take-out"]
    
    #---------For permission------------------
    async def update_permissions(self, restaurant_id: int, permissions: list):
        """Update permissions for the restaurant"""
        restaurant = await self.db.execute(select(Restaurant).filter(Restaurant.restaurant_id == restaurant_id))
        restaurant = restaurant.scalar_one_or_none()
        if restaurant:
            restaurant.permissions = permissions
            await self.db.commit()
            return restaurant
        return None
    async def get_own_id(self):
        """Get restaurant by ID"""
        result = await self.db.execute(select(Restaurant).filter(Restaurant.restaurant_id == self.restaurant_id))
        return result.scalar_one_or_none()

    async def get_all_restaurants(self):
        """Get all restaurants"""
        result = await self.db.execute(select(Restaurant))
        return result.scalars().all()
