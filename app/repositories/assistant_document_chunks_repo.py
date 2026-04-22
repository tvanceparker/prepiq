from typing import List

from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assistant_document_chunks_orm import AssistantDocumentChunk
from app.repositories.base_repository import BaseRepository


class AssistantDocumentChunksRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, AssistantDocumentChunk, restaurant_id, pk_field="chunk_id")

    async def list_by_document_id(self, document_id: int) -> List[AssistantDocumentChunk]:
        stmt = (
            select(AssistantDocumentChunk)
            .options(selectinload(AssistantDocumentChunk.document))
            .where(
                AssistantDocumentChunk.restaurant_id == self.restaurant_id,
                AssistantDocumentChunk.document_id == document_id,
            )
            .order_by(AssistantDocumentChunk.chunk_index.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_all(self) -> List[AssistantDocumentChunk]:
        stmt = (
            select(AssistantDocumentChunk)
            .options(selectinload(AssistantDocumentChunk.document))
            .where(AssistantDocumentChunk.restaurant_id == self.restaurant_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_by_document_id(self, document_id: int) -> None:
        stmt = delete(AssistantDocumentChunk).where(
            AssistantDocumentChunk.restaurant_id == self.restaurant_id,
            AssistantDocumentChunk.document_id == document_id,
        )
        await self.db.execute(stmt)
