from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.mcp_action_audit_orm import MCPActionAudit
from app.repositories.base_repository import BaseRepository


class MCPActionAuditRepository(BaseRepository[MCPActionAudit]):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(
            db,
            MCPActionAudit,
            restaurant_id,
            pk_field="audit_id",
        )

    async def get_by_idempotency_key(
        self,
        *,
        tool_name: str,
        idempotency_key: str,
    ) -> Optional[MCPActionAudit]:
        result = await self.db.execute(
            select(MCPActionAudit).where(
                MCPActionAudit.restaurant_id == self.restaurant_id,
                MCPActionAudit.tool_name == tool_name,
                MCPActionAudit.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    async def mark(
        self,
        audit_id: int,
        *,
        status: str,
        outcome_code: Optional[str] = None,
        error_code: Optional[str] = None,
        result_summary: Optional[dict] = None,
        error_message: Optional[str] = None,
        confirmation_token_hash: Optional[str] = None,
        completed: bool = False,
    ) -> Optional[MCPActionAudit]:
        update_data = {
            "status": status,
            "outcome_code": outcome_code,
            "error_code": error_code,
            "result_summary": result_summary,
            "error_message": error_message,
        }
        if confirmation_token_hash is not None:
            update_data["confirmation_token_hash"] = confirmation_token_hash
        if completed:
            update_data["completed_at"] = datetime.utcnow()
        return await self.update(audit_id, update_data)

