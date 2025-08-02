# app/repositories/ingredient_supplier_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.ingredient_supplier_orm import IngredientSupplier
from app.repositories.base_repository import BaseRepository
from typing import List, Optional


class IngredientSupplierRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(
            db, IngredientSupplier, restaurant_id, pk_field="ingredient_supplier_id"
        )

    async def get_by_ingredient_and_supplier_id(
        self, ingredient_id: int, supplier_id: int
    ) -> Optional[IngredientSupplier]:
        """Fetch using the classic combo of ingredient/supplier/restaurant."""
        result = await self.db.execute(
            select(IngredientSupplier).filter(
                IngredientSupplier.ingredient_id == ingredient_id,
                IngredientSupplier.supplier_id == supplier_id,
                IngredientSupplier.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_all_by_ingredient_id(
        self, ingredient_id: int, skip: int = 0, limit: int = 100
    ) -> List[IngredientSupplier]:
        """Fetch all supplier mappings for a specific ingredient."""
        result = await self.db.execute(
            select(IngredientSupplier)
            .filter(
                IngredientSupplier.ingredient_id == ingredient_id,
                IngredientSupplier.restaurant_id == self.restaurant_id,
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_ingredient_ids(
        self, ingredient_ids: List[int]
    ) -> List[IngredientSupplier]:
        """Bulk fetch supplier mappings for multiple ingredients."""
        result = await self.db.execute(
            select(IngredientSupplier).filter(
                IngredientSupplier.restaurant_id == self.restaurant_id,
                IngredientSupplier.ingredient_id.in_(ingredient_ids),
            )
        )
        return result.scalars().all()

    async def get_by_supplier_id(self, supplier_id: int) -> List[IngredientSupplier]:
        """Fetch all mappings by supplier."""
        result = await self.db.execute(
            select(IngredientSupplier).filter(
                IngredientSupplier.restaurant_id == self.restaurant_id,
                IngredientSupplier.supplier_id == supplier_id,
            )
        )
        return result.scalars().all()

    async def get_preferred_or_lowest_priority_supplier(
        self, ingredient_id: int
    ) -> Optional[IngredientSupplier]:
        """
        Fetch the preferred supplier for an ingredient,
        or fallback to the one with the lowest priority.
        """
        result = await self.db.execute(
            select(IngredientSupplier)
            .filter(
                IngredientSupplier.ingredient_id == ingredient_id,
                IngredientSupplier.restaurant_id == self.restaurant_id,
            )
            .order_by(
                IngredientSupplier.preferred.desc(),
                IngredientSupplier.supplier_priority.is_(None),  # NULLs last
                IngredientSupplier.supplier_priority.asc(),
            )
            .limit(1)
        )
        return result.scalars().first()
    
    async def get_price_per_unit(self, ingredient_supplier_id: int) -> Optional[float]:
        """
        Fetch the cost_per_unit by ingredient_supplier_id.
        """
        result = await self.db.execute(
            select(IngredientSupplier.cost_per_unit).filter(
                IngredientSupplier.ingredient_supplier_id == ingredient_supplier_id,
                IngredientSupplier.restaurant_id == self.restaurant_id,
            )
        )
        cost = result.scalar_one_or_none()
        if cost is not None:
            return float(cost)
        return None


