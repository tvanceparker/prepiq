# app/repositories/pos_item_mappings_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.models.pos_item_mappings_orm import POSItemMapping
from app.repositories.base_repository import BaseRepository
from typing import Optional, List


class POSItemMappingsRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, POSItemMapping, restaurant_id, pk_field="mapping_id")

    async def get_mapping(
        self,
        external_item_id: str,
        pos_provider: str
    ) -> Optional[POSItemMapping]:
        """Get mapping for a specific external item ID"""
        stmt = select(POSItemMapping).where(
            and_(
                POSItemMapping.restaurant_id == self.restaurant_id,
                POSItemMapping.pos_provider == pos_provider,
                POSItemMapping.external_item_id == external_item_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_mappings(self, pos_provider: Optional[str] = None) -> List[POSItemMapping]:
        """Get all mappings for the restaurant, optionally filtered by provider"""
        stmt = select(POSItemMapping).where(
            POSItemMapping.restaurant_id == self.restaurant_id
        )
        if pos_provider:
            stmt = stmt.where(POSItemMapping.pos_provider == pos_provider)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_unmapped_items(self, pos_provider: str) -> List[POSItemMapping]:
        """Get all unmapped items for a provider"""
        stmt = select(POSItemMapping).where(
            and_(
                POSItemMapping.restaurant_id == self.restaurant_id,
                POSItemMapping.pos_provider == pos_provider,
                POSItemMapping.mapping_status == 'unmapped'
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_mapping(
        self,
        external_item_id: str,
        pos_provider: str,
        external_item_name: Optional[str] = None,
        menu_item_id: Optional[int] = None,
        confidence_score: float = 0.00,
        mapping_status: str = 'unmapped'
    ) -> POSItemMapping:
        """Create a new POS item mapping"""
        mapping = POSItemMapping(
            restaurant_id=self.restaurant_id,
            pos_provider=pos_provider,
            external_item_id=external_item_id,
            external_item_name=external_item_name,
            menu_item_id=menu_item_id,
            confidence_score=confidence_score,
            mapping_status=mapping_status
        )
        self.db.add(mapping)
        await self.db.flush()
        await self.db.refresh(mapping)
        return mapping

    async def update_mapping(
        self,
        mapping_id: int,
        menu_item_id: Optional[int] = None,
        mapping_status: Optional[str] = None,
        confidence_score: Optional[float] = None
    ) -> Optional[POSItemMapping]:
        """Update an existing mapping"""
        stmt = select(POSItemMapping).where(
            and_(
                POSItemMapping.mapping_id == mapping_id,
                POSItemMapping.restaurant_id == self.restaurant_id
            )
        )
        result = await self.db.execute(stmt)
        mapping = result.scalar_one_or_none()

        if mapping:
            if menu_item_id is not None:
                mapping.menu_item_id = menu_item_id
            if mapping_status is not None:
                mapping.mapping_status = mapping_status
            if confidence_score is not None:
                mapping.confidence_score = confidence_score

            await self.db.flush()
            await self.db.refresh(mapping)

        return mapping

    async def delete_mapping(self, mapping_id: int) -> bool:
        """Delete a mapping"""
        stmt = select(POSItemMapping).where(
            and_(
                POSItemMapping.mapping_id == mapping_id,
                POSItemMapping.restaurant_id == self.restaurant_id
            )
        )
        result = await self.db.execute(stmt)
        mapping = result.scalar_one_or_none()

        if mapping:
            await self.db.delete(mapping)
            await self.db.flush()
            return True
        return False

    async def upsert_mapping(
        self,
        external_item_id: str,
        pos_provider: str,
        external_item_name: Optional[str] = None,
        menu_item_id: Optional[int] = None,
        confidence_score: float = 0.00,
        mapping_status: str = 'unmapped'
    ) -> POSItemMapping:
        """Create or update a mapping (upsert)"""
        existing = await self.get_mapping(external_item_id, pos_provider)

        if existing:
            # Update existing mapping
            if menu_item_id is not None:
                existing.menu_item_id = menu_item_id
            if external_item_name is not None:
                existing.external_item_name = external_item_name
            if confidence_score is not None:
                existing.confidence_score = confidence_score
            if mapping_status is not None:
                existing.mapping_status = mapping_status

            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new mapping
            return await self.create_mapping(
                external_item_id=external_item_id,
                pos_provider=pos_provider,
                external_item_name=external_item_name,
                menu_item_id=menu_item_id,
                confidence_score=confidence_score,
                mapping_status=mapping_status
            )
