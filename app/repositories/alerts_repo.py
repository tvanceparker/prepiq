# app/repositories/alerts_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime
from app.db.models.alerts_orm import Alert
from app.repositories.base_repository import BaseRepository
from typing import List, Optional, Union


class AlertRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Alert, restaurant_id, pk_field="alert_id")


    async def get_by_status(
        self, status: Union[str, List[str]], skip: int = 0, limit: int = 10
    ) -> List[Alert]:
        if isinstance(status, str):
            statuses = [status]
        else:
            statuses = status
        
        stmt = (
            select(Alert)
            .where(
                Alert.restaurant_id == self.restaurant_id,
                Alert.status.in_(statuses)
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_open_inventory_deduction_alerts(self, limit: int = 200) -> List[Alert]:
        stmt = (
            select(Alert)
            .where(
                Alert.restaurant_id == self.restaurant_id,
                Alert.alert_type == "Inventory:DeductionFailed",
                Alert.status.in_(["Active", "Acknowledged"]),
            )
            .order_by(Alert.date_created.desc(), Alert.alert_id.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def alert_already_exists(self, alert_type: str, meta_sale_id: int) -> bool:
        stmt = (
            select(Alert.alert_id)
            .filter(
                Alert.restaurant_id == self.restaurant_id,
                Alert.alert_type == alert_type,
                Alert.status.in_(["Active", "Resolved","Acknowledged"]),
                func.json_unquote(func.json_extract(Alert.meta, '$.sale_id')) == str(meta_sale_id)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None
    
    async def resolve(self, alert_id: int) -> bool:
        alert = await self.get_by_id(alert_id)
        if not alert:
            return False

        alert.status = "Resolved"
        await self.db.flush()
        await self.db.refresh(alert)
        return True

    async def count_by_status(self, status: str) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(self.model).where(
                self.model.restaurant_id == self.restaurant_id,
                self.model.status == status
            )
        )
        return result.scalar_one()

    async def get_open_low_stock_alert(self, ingredient_id: int) -> Optional[Alert]:
        stmt = (
            select(Alert)
            .where(
                Alert.restaurant_id == self.restaurant_id,
                Alert.alert_type == "LowStock",
                Alert.status.in_(["Active", "Acknowledged"]),
                func.json_unquote(func.json_extract(Alert.meta, '$.ingredient_id')) == str(ingredient_id),
            )
            .order_by(Alert.date_created.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def resolve_open_low_stock_alerts(self, ingredient_id: int) -> int:
        stmt = select(Alert).where(
            Alert.restaurant_id == self.restaurant_id,
            Alert.alert_type == "LowStock",
            Alert.status.in_(["Active", "Acknowledged"]),
            func.json_unquote(func.json_extract(Alert.meta, '$.ingredient_id')) == str(ingredient_id),
        )
        result = await self.db.execute(stmt)
        alerts = result.scalars().all()
        for alert in alerts:
            alert.status = "Resolved"
            alert.date_resolved = datetime.utcnow()
        await self.db.flush()
        return len(alerts)

