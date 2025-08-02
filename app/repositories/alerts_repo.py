# app/repositories/alerts_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
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

