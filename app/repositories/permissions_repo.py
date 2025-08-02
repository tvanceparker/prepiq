# app/repositories/permissions_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.repositories.base_repository import BaseRepository
from app.db.models.permissions_orm import Permission
from typing import List, Optional

class PermissionRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: Optional[int] = None):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Permission, restaurant_id, pk_field="permission_id")
    
    async def get_by_name(self, name: str) -> Optional[Permission]:
        """Get permission by its name and restaurant_id."""
        stmt = select(Permission).filter_by(name=name)
        if self.restaurant_id:
            stmt = stmt.filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def exists(self, permission_name: str) -> bool:
        stmt = select(Permission).filter_by(name=permission_name)
        if self.restaurant_id:
            stmt = stmt.filter_by(restaurant_id=self.restaurant_id) 
        result = await self.db.execute(stmt)
        return result.scalars().first() is not None
    
    async def get_all_permission_names(self) -> List[str]:
        """Get all permission names for this restaurant."""
        stmt = select(Permission.name)
        if self.restaurant_id:
            stmt = stmt.filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]
    
    async def add_permission_by_name(self, name: str) -> Optional[Permission]:
        """
        Add a permission to the restaurant by duplicating a global permission (without restaurant_id).
        """
        if not self.restaurant_id:
            raise ValueError("restaurant_id is required to assign a permission")

        # Fetch the global permission
        stmt = select(Permission).filter_by(name=name, restaurant_id=None)
        result = await self.db.execute(stmt)
        global_perm = result.scalars().first()

        if not global_perm:
            return None  # or raise an error if preferred

        # Create a new permission for the specific restaurant
        new_perm = Permission(
            name=global_perm.name,
            description=global_perm.description,
            restaurant_id=self.restaurant_id
        )
        self.db.add(new_perm)
        await self.db.flush()  # Keep in-memory sync
        return new_perm

    async def remove_permission_by_name(self, name: str):
        query = delete(Permission).where(
            Permission.restaurant_id == self.restaurant_id,
            Permission.name == name
        )
        await self.db.execute(query)
        await self.db.commit()


