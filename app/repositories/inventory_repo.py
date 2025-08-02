# app/repositories/inventory_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.inventory_orm import Inventory
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy import update as sql_update
from decimal import Decimal


class InventoryRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Inventory, restaurant_id, pk_field="inventory_id")

    async def get_inventory_by_ingredient(
        self, ingredient_id: int
    ) -> Optional[Inventory]:
        """Get inventory by ingredient and restaurant ID."""
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.restaurant_id == self.restaurant_id,
                Inventory.ingredient_id == ingredient_id,
            )
        )
        return result.scalar_one_or_none()

    async def increment_quantity(
        self, inventory_id: int, amount: float
    ) -> Optional[Inventory]:
        """Increment the quantity_on_hand for a given inventory item."""
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.inventory_id == inventory_id,
                Inventory.restaurant_id == self.restaurant_id,
            )
        )
        inventory = result.scalar_one_or_none()

        if inventory:
            inventory.quantity_on_hand = (
                Decimal(str(inventory.quantity_on_hand or 0)) + amount
            )
            await self.db.flush()
            return inventory

        return None

    async def decrement_quantity(self, inventory_id: int, amount: Decimal) -> Inventory:
        """Decrement the quantity_on_hand for a given inventory item."""
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.inventory_id == inventory_id,
                Inventory.restaurant_id == self.restaurant_id,
            )
        )
        inventory = result.scalar_one_or_none()

        if not inventory:
            raise ValueError(f"Inventory with ID {inventory_id} not found.")

        if inventory.quantity_on_hand is None or inventory.quantity_on_hand < amount:
            raise ValueError(
                f"Not enough inventory to deduct.ID: {inventory_id} Available: {inventory.quantity_on_hand}, Requested: {amount}"
            )

        inventory.quantity_on_hand = Decimal(str(inventory.quantity_on_hand)) - amount
        await self.db.flush()
        return inventory

    async def get_batch_inventory(self, batch_recipe_id: int):
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.restaurant_id == self.restaurant_id,
                Inventory.batch_recipe_id == batch_recipe_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_all_by_ids(self, inventory_ids: List[int]):
        result = await self.db.execute(
            select(Inventory).where(Inventory.inventory_id.in_(inventory_ids))
        )
        return result.scalars().all()
