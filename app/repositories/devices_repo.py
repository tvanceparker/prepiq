# app/repositories/devices_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.devices_orm import Device
from app.repositories.base_repository import BaseRepository


class DevicesRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Device, restaurant_id, pk_field="device_id")
