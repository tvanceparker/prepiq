# app/repositories/stripe_terminal_readers_repo.py

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.repositories.base_repository import BaseRepository
from app.db.models.stripe_terminal_readers_orm import StripeTerminalReader
from datetime import datetime


class StripeTerminalReaderRepository(BaseRepository[StripeTerminalReader]):
    """Repository for Stripe Terminal reader operations."""
    
    model = StripeTerminalReader
    pk_field = "reader_id"

    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, self.model, restaurant_id, self.pk_field)

    async def get_by_stripe_id(self, stripe_reader_id: str) -> Optional[StripeTerminalReader]:
        """Get reader by Stripe's reader ID."""
        result = await self.db.execute(
            select(StripeTerminalReader).where(
                StripeTerminalReader.stripe_reader_id == stripe_reader_id,
                StripeTerminalReader.restaurant_id == self.restaurant_id
            )
        )
        return result.scalar_one_or_none()

    async def list_readers(self, status: Optional[str] = None) -> List[StripeTerminalReader]:
        """List all readers, optionally filtered by status."""
        query = select(StripeTerminalReader).where(
            StripeTerminalReader.restaurant_id == self.restaurant_id
        )
        if status:
            query = query.where(StripeTerminalReader.status == status)
        query = query.order_by(StripeTerminalReader.label)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_status(self, reader_id: int, status: str, ip_address: Optional[str] = None) -> bool:
        """Update reader status and last seen timestamp."""
        update_data = {
            "status": status,
            "last_seen_at": datetime.utcnow()
        }
        if ip_address:
            update_data["ip_address"] = ip_address
            
        stmt = (
            update(StripeTerminalReader)
            .where(
                StripeTerminalReader.reader_id == reader_id,
                StripeTerminalReader.restaurant_id == self.restaurant_id
            )
            .values(**update_data)
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def get_online_readers(self) -> List[StripeTerminalReader]:
        """Get all online readers for the restaurant."""
        return await self.list_readers(status="online")
