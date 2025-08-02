# app/repositories/supplier_preferences_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.future import select
from app.db.models.supplier_preferences_orm import SupplierPreference
from typing import Optional
from sqlalchemy.exc import IntegrityError


class SupplierPreferenceRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, SupplierPreference, restaurant_id)
