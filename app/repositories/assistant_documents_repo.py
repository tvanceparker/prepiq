from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assistant_documents_orm import AssistantDocument
from app.repositories.base_repository import BaseRepository


class AssistantDocumentsRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, AssistantDocument, restaurant_id, pk_field="document_id")

    async def get_by_source(self, source_type: str, source_path: str) -> Optional[AssistantDocument]:
        stmt = select(AssistantDocument).where(
            AssistantDocument.restaurant_id == self.restaurant_id,
            AssistantDocument.source_type == source_type,
            AssistantDocument.source_path == source_path,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_uploaded(self) -> List[AssistantDocument]:
        stmt = (
            select(AssistantDocument)
            .where(
                AssistantDocument.restaurant_id == self.restaurant_id,
                AssistantDocument.is_uploaded.is_(True),
            )
            .order_by(AssistantDocument.updated_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_all(self) -> List[AssistantDocument]:
        stmt = (
            select(AssistantDocument)
            .where(AssistantDocument.restaurant_id == self.restaurant_id)
            .order_by(
                AssistantDocument.is_uploaded.asc(),
                AssistantDocument.source_type.asc(),
                AssistantDocument.display_name.asc(),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
