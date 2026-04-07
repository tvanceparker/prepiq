from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models.inventory_deduction_discrepancies_orm import InventoryDeductionDiscrepancy
from app.repositories.base_repository import BaseRepository


OPEN_DISCREPANCY_STATUSES = ["Active", "Acknowledged"]


class InventoryDeductionDiscrepancyRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, InventoryDeductionDiscrepancy, restaurant_id, pk_field="discrepancy_id")

    async def get_open(self, limit: int = 200) -> List[InventoryDeductionDiscrepancy]:
        stmt = (
            select(InventoryDeductionDiscrepancy)
            .where(
                InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
                InventoryDeductionDiscrepancy.status.in_(OPEN_DISCREPANCY_STATUSES),
            )
            .order_by(
                InventoryDeductionDiscrepancy.date_created.desc(),
                InventoryDeductionDiscrepancy.discrepancy_id.desc(),
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_open_by_reference_item(
        self,
        *,
        reference_type: Optional[str],
        reference_id: Optional[int],
        ingredient_id: Optional[int] = None,
        batch_recipe_id: Optional[int] = None,
    ) -> Optional[InventoryDeductionDiscrepancy]:
        stmt = select(InventoryDeductionDiscrepancy).where(
            InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
            InventoryDeductionDiscrepancy.status.in_(OPEN_DISCREPANCY_STATUSES),
            InventoryDeductionDiscrepancy.reference_type == reference_type,
            InventoryDeductionDiscrepancy.reference_id == reference_id,
        )

        if ingredient_id is not None:
            stmt = stmt.where(
                InventoryDeductionDiscrepancy.ingredient_id == ingredient_id,
                InventoryDeductionDiscrepancy.batch_recipe_id.is_(None),
            )
        elif batch_recipe_id is not None:
            stmt = stmt.where(
                InventoryDeductionDiscrepancy.batch_recipe_id == batch_recipe_id,
                InventoryDeductionDiscrepancy.ingredient_id.is_(None),
            )
        else:
            stmt = stmt.where(
                InventoryDeductionDiscrepancy.ingredient_id.is_(None),
                InventoryDeductionDiscrepancy.batch_recipe_id.is_(None),
            )

        stmt = stmt.order_by(
            InventoryDeductionDiscrepancy.date_created.desc(),
            InventoryDeductionDiscrepancy.discrepancy_id.desc(),
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_open_by_item(
        self,
        *,
        ingredient_id: Optional[int] = None,
        batch_recipe_id: Optional[int] = None,
    ) -> List[InventoryDeductionDiscrepancy]:
        stmt = select(InventoryDeductionDiscrepancy).where(
            InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
            InventoryDeductionDiscrepancy.status.in_(OPEN_DISCREPANCY_STATUSES),
        )

        if ingredient_id is not None:
            stmt = stmt.where(InventoryDeductionDiscrepancy.ingredient_id == ingredient_id)
        if batch_recipe_id is not None:
            stmt = stmt.where(InventoryDeductionDiscrepancy.batch_recipe_id == batch_recipe_id)

        stmt = stmt.order_by(
            InventoryDeductionDiscrepancy.date_created.desc(),
            InventoryDeductionDiscrepancy.discrepancy_id.desc(),
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_open_by_reference(
        self,
        *,
        reference_type: Optional[str],
        reference_id: Optional[int],
        limit: int = 200,
    ) -> List[InventoryDeductionDiscrepancy]:
        stmt = (
            select(InventoryDeductionDiscrepancy)
            .where(
                InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
                InventoryDeductionDiscrepancy.status.in_(OPEN_DISCREPANCY_STATUSES),
                InventoryDeductionDiscrepancy.reference_type == reference_type,
                InventoryDeductionDiscrepancy.reference_id == reference_id,
            )
            .order_by(
                InventoryDeductionDiscrepancy.date_created.desc(),
                InventoryDeductionDiscrepancy.discrepancy_id.desc(),
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_alert_id(self, alert_id: int) -> Optional[InventoryDeductionDiscrepancy]:
        stmt = select(InventoryDeductionDiscrepancy).where(
            InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
            InventoryDeductionDiscrepancy.alert_id == alert_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_history(
        self,
        *,
        start_date,
        end_date,
        ingredient_id: Optional[int] = None,
        limit: int = 500,
    ) -> List[InventoryDeductionDiscrepancy]:
        stmt = select(InventoryDeductionDiscrepancy).where(
            InventoryDeductionDiscrepancy.restaurant_id == self.restaurant_id,
            or_(
                and_(
                    InventoryDeductionDiscrepancy.date_created.is_not(None),
                    InventoryDeductionDiscrepancy.date_created >= start_date,
                    InventoryDeductionDiscrepancy.date_created <= end_date,
                ),
                and_(
                    InventoryDeductionDiscrepancy.date_resolved.is_not(None),
                    InventoryDeductionDiscrepancy.date_resolved >= start_date,
                    InventoryDeductionDiscrepancy.date_resolved <= end_date,
                ),
            ),
        )

        if ingredient_id is not None:
            stmt = stmt.where(InventoryDeductionDiscrepancy.ingredient_id == ingredient_id)

        stmt = stmt.order_by(
            InventoryDeductionDiscrepancy.date_created.desc(),
            InventoryDeductionDiscrepancy.discrepancy_id.desc(),
        ).limit(limit)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def mark_resolved_by_alert_id(self, alert_id: int) -> Optional[InventoryDeductionDiscrepancy]:
        discrepancy = await self.get_by_alert_id(alert_id)
        if not discrepancy:
            return None

        discrepancy.status = "Resolved"
        discrepancy.is_acknowledged = True
        discrepancy.date_resolved = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(discrepancy)
        return discrepancy

    async def mark_acknowledged_by_alert_id(self, alert_id: int) -> Optional[InventoryDeductionDiscrepancy]:
        discrepancy = await self.get_by_alert_id(alert_id)
        if not discrepancy:
            return None

        discrepancy.status = "Acknowledged"
        discrepancy.is_acknowledged = True
        await self.db.flush()
        await self.db.refresh(discrepancy)
        return discrepancy