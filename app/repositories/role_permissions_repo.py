# app/repositories/role_permissions_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.repositories.base_repository import BaseRepository
from app.db.models.role_permissions_orm import RolePermission
from typing import List, Optional

class RolePermissionRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: Optional[int] = None):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, RolePermission, restaurant_id, pk_field="role_id")  # The PK is composite (role_id, permission_id)
    
    async def get_by_role_id(self, role_id: int) -> List[RolePermission]:
        """Get all permissions associated with a role and restaurant_id."""
        stmt = select(RolePermission).filter_by(role_id=role_id)
        if self.restaurant_id:
            stmt = stmt.join(RolePermission.role).filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_permission_id(self, permission_id: int) -> List[RolePermission]:
        """Get all roles associated with a permission and restaurant_id."""
        stmt = select(RolePermission).filter_by(permission_id=permission_id)
        if self.restaurant_id:
            stmt = stmt.join(RolePermission.role).filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_by_role_and_permission(self, role_id: int, permission_id: int):
        """Delete a role-permission pair filtered by restaurant_id."""
        stmt = select(RolePermission).filter_by(role_id=role_id, permission_id=permission_id)
        if self.restaurant_id:
            stmt = stmt.join(RolePermission.role).filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        role_permission = result.scalars().first()
        if role_permission:
            await self.db.delete(role_permission)
            await self.db.commit()

    async def delete_all_for_role(self, role_id: int):
        await self.db.execute(
            delete(RolePermission)
            .where(RolePermission.role_id == role_id)
            .where(RolePermission.restaurant_id == self.restaurant_id)
        )
        await self.db.commit()

    async def exists(self, role_id: int, permission_id: int) -> bool:
        """
        Check if a role-permission association exists for the given role_id and permission_id,
        optionally filtered by restaurant_id.
        """
        stmt = select(RolePermission).filter_by(role_id=role_id, permission_id=permission_id)
        if self.restaurant_id:
            stmt = stmt.join(RolePermission.role).filter_by(restaurant_id=self.restaurant_id)

        result = await self.db.execute(stmt)
        role_permission = result.scalars().first()
        return role_permission is not None
    