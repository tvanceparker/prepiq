# app/repositories/roles_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.repositories.base_repository import BaseRepository
from app.db.models.roles_orm import Role
from typing import List, Optional

class RoleRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Role, restaurant_id, pk_field="role_id")
    
    async def get_by_name(self, name: str) -> Optional[Role]:
        """Get a role by its name and restaurant_id."""
        stmt = select(Role).filter_by(name=name, restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def exists(self, role_name: str) -> bool:
        stmt = select(Role).filter_by(name=role_name)
        if self.restaurant_id:
            stmt = stmt.filter_by(restaurant_id=self.restaurant_id)  # if you have restaurant ID in your role model
        result = await self.db.execute(stmt)
        return result.scalars().first() is not None