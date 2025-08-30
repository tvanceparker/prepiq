# app/repositories/payments_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.payments_orm import Payment
from app.repositories.base_repository import BaseRepository


class PaymentsRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Payment, restaurant_id, pk_field="payment_id")
