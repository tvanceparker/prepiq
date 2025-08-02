# app/routes/permissions.py

from fastapi import APIRouter, Depends
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.permission_service import PermissionUtil

router = APIRouter(prefix="/permissions", tags=["Permissions"])

@router.post("/update")
async def update_permissions_for_all_restaurants(
    db: AsyncSession = Depends(get_db)
):
    result = await PermissionUtil.update_permissions_for_all_restaurants(db)
    return result
