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
        self, ingredient_id: int, *, for_update: bool = False
    ) -> Optional[Inventory]:
        """Get inventory by ingredient and restaurant ID."""
        stmt = select(Inventory).where(Inventory.restaurant_id == self.restaurant_id,
                                       Inventory.ingredient_id == ingredient_id)
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, obj_id, *, for_update=False):
        stmt = select(Inventory).where(Inventory.inventory_id == obj_id,
                                       Inventory.restaurant_id == self.restaurant_id)
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def update(self, obj_id, update_data):
        inventory = await self.get_by_id(obj_id, for_update=True)
        if inventory is None:
            return None
        for field, value in self._to_dict(update_data).items():
            setattr(inventory, field, value)
        await self.db.flush()
        await self.db.refresh(inventory)
        return inventory

    async def increment_quantity(
        self, inventory_id: int, amount: float
    ) -> Optional[Inventory]:
        """Increment the quantity_on_hand for a given inventory item."""
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.inventory_id == inventory_id,
                Inventory.restaurant_id == self.restaurant_id,
            ).with_for_update().execution_options(populate_existing=True)
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
            ).with_for_update().execution_options(populate_existing=True)
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
        from app.db.models.inventory_lot_orm import InventoryLot
        result = await self.db.execute(select(Inventory).where(
            Inventory.restaurant_id == self.restaurant_id,
            Inventory.inventory_id.in_(select(InventoryLot.inventory_id).where(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.batch_recipe_id == batch_recipe_id)),
        ).order_by(Inventory.inventory_id).with_for_update().execution_options(populate_existing=True))
        return result.scalars().first()

    async def get_all_by_ids(self, inventory_ids: List[int]):
        result = await self.db.execute(
            select(Inventory).where(Inventory.inventory_id.in_(inventory_ids), Inventory.restaurant_id == self.restaurant_id)
        )
        return result.scalars().all()
