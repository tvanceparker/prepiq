# app/repositories/inventory_lot_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models.inventory_lot_orm import InventoryLot
from app.db.models.inventory_lot_orm import LotStatus
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from datetime import timedelta, date


class InventoryLotRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, InventoryLot, restaurant_id, pk_field="lot_id")

    async def get_inventory_lots_by_inventory_and_restaurant(
        self, inventory_id: int
    ) -> List[InventoryLot]:
        """Fetch all lots for a given inventory item and restaurant."""
        result = await self.db.execute(
            select(InventoryLot).filter(
                InventoryLot.inventory_id == inventory_id,
                InventoryLot.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_lots_by_ingredient_id(self, ingredient_id: int) -> List[InventoryLot]:
        """Fetch all lots for a given ingredient and restaurant."""
        result = await self.db.execute(
            select(InventoryLot).filter(
                InventoryLot.ingredient_id == ingredient_id,
                InventoryLot.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_by_batch_recipe_id(
        self, batch_recipe_id: int
    ) -> Optional[InventoryLot]:
        """Fetch the most recent inventory lot for a given batch recipe ID and restaurant."""
        result = await self.db.execute(
            select(InventoryLot)
            .filter(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.batch_recipe_id == batch_recipe_id,
            )
            .order_by(InventoryLot.delivery_date.desc())
        )
        return result.scalars().first()

    async def get_recent_by_inventory_id(
        self, inventory_id: int, max_days_old: int = 30
    ):
        threshold_date = date.today() - timedelta(days=max_days_old)
        print(
            f"Threshold date: {threshold_date}"
        )  # Debug print to check the threshold date

        result = await self.db.execute(
            select(InventoryLot)
            .filter(
                InventoryLot.inventory_id == inventory_id,
                InventoryLot.spoilage_expected_date >= threshold_date,
                InventoryLot.restaurant_id == self.restaurant_id,
            )
            .order_by(InventoryLot.delivery_date.desc())
        )

        # Convert the result into a list
        result_list = result.scalars().all()
        print(
            f"Query result: {result_list}"
        )  # Debug print to inspect the actual result

        return result_list

    async def get_batch_quantity_by_recipe(self, batch_recipe_id: int) -> float:
        result = await self.db.execute(
            select(func.sum(InventoryLot.quantity)).filter(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.batch_recipe_id == batch_recipe_id,
            )
        )
        total_quantity = result.scalar()
        return total_quantity or 0.0

    async def get_all_by_batch_recipe_id(
        self, batch_recipe_id: int
    ) -> List[InventoryLot]:
        """
        Fetch all inventory lots for a given batch recipe ID and restaurant,
        ordered by delivery_date ascending (FIFO).
        """
        result = await self.db.execute(
            select(InventoryLot)
            .filter(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.batch_recipe_id == batch_recipe_id,
            )
            .order_by(InventoryLot.delivery_date.asc(), InventoryLot.lot_id.asc())
        )
        return result.scalars().all()

    async def get_expired_available_lots(self, target_date: date) -> List[InventoryLot]:
        """Fetch lots that should be written off as spoilage on or before the target date."""
        result = await self.db.execute(
            select(InventoryLot)
            .filter(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.status == LotStatus.available,
                InventoryLot.spoilage_expected_date.isnot(None),
                InventoryLot.spoilage_expected_date <= target_date,
            )
            .order_by(InventoryLot.spoilage_expected_date.asc(), InventoryLot.lot_id.asc())
        )
        return result.scalars().all()
