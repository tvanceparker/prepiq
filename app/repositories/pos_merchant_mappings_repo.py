# app/repositories/pos_merchant_mappings_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.models.pos_merchant_mappings_orm import POSMerchantMapping
from app.repositories.base_repository import BaseRepository
from typing import Optional


class POSMerchantMappingsRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int = None):
        self.db = db
        self.restaurant_id = restaurant_id
        # Note: merchant mappings might be queried without restaurant_id context (e.g., in webhooks)
        # So we make restaurant_id optional
        if restaurant_id:
            super().__init__(db, POSMerchantMapping, restaurant_id, pk_field="mapping_id")

    async def get_by_merchant_id(
        self,
        merchant_id: str,
        pos_provider: str
    ) -> Optional[POSMerchantMapping]:
        """Get mapping for a specific merchant ID (used for webhook routing)"""
        stmt = select(POSMerchantMapping).where(
            and_(
                POSMerchantMapping.merchant_id == merchant_id,
                POSMerchantMapping.pos_provider == pos_provider
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_restaurant_id(
        self,
        restaurant_id: int,
        pos_provider: Optional[str] = None
    ) -> Optional[POSMerchantMapping]:
        """Get mapping for a restaurant (optionally filtered by provider)"""
        stmt = select(POSMerchantMapping).where(
            POSMerchantMapping.restaurant_id == restaurant_id
        )
        if pos_provider:
            stmt = stmt.where(POSMerchantMapping.pos_provider == pos_provider)

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_mapping(
        self,
        merchant_id: str,
        pos_provider: str,
        restaurant_id: int,
        location_id: Optional[str] = None
    ) -> POSMerchantMapping:
        """Create a new merchant mapping"""
        mapping = POSMerchantMapping(
            merchant_id=merchant_id,
            pos_provider=pos_provider,
            restaurant_id=restaurant_id,
            location_id=location_id
        )
        self.db.add(mapping)
        await self.db.flush()
        await self.db.refresh(mapping)
        return mapping

    async def upsert_mapping(
        self,
        merchant_id: str,
        pos_provider: str,
        restaurant_id: int,
        location_id: Optional[str] = None
    ) -> POSMerchantMapping:
        """Create or update a merchant mapping (upsert)"""
        existing = await self.get_by_merchant_id(merchant_id, pos_provider)

        if existing:
            # Update existing mapping
            existing.restaurant_id = restaurant_id
            if location_id is not None:
                existing.location_id = location_id

            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new mapping
            return await self.create_mapping(
                merchant_id=merchant_id,
                pos_provider=pos_provider,
                restaurant_id=restaurant_id,
                location_id=location_id
            )

    async def delete_by_restaurant(self, restaurant_id: int, pos_provider: str) -> bool:
        """Delete merchant mapping for a restaurant"""
        stmt = select(POSMerchantMapping).where(
            and_(
                POSMerchantMapping.restaurant_id == restaurant_id,
                POSMerchantMapping.pos_provider == pos_provider
            )
        )
        result = await self.db.execute(stmt)
        mapping = result.scalar_one_or_none()

        if mapping:
            await self.db.delete(mapping)
            await self.db.flush()
            return True
        return False
