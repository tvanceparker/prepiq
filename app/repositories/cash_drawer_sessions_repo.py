# app/repositories/cash_drawer_sessions_repo.py

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from app.repositories.base_repository import BaseRepository
from app.db.models.cash_drawer_sessions_orm import CashDrawerSession
from datetime import datetime, date


class CashDrawerSessionRepository(BaseRepository[CashDrawerSession]):
    """Repository for cash drawer session operations."""
    
    model = CashDrawerSession
    pk_field = "session_id"

    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, self.model, restaurant_id, self.pk_field)

    async def get_open_session(self, device_id: Optional[int] = None) -> Optional[CashDrawerSession]:
        """Get currently open drawer session, optionally for a specific device."""
        query = select(CashDrawerSession).where(
            CashDrawerSession.restaurant_id == self.restaurant_id,
            CashDrawerSession.status == "open"
        )
        if device_id:
            query = query.where(CashDrawerSession.device_id == device_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_session_by_employee(self, employee_id: int, status: str = "open") -> Optional[CashDrawerSession]:
        """Get a session opened by a specific employee."""
        result = await self.db.execute(
            select(CashDrawerSession).where(
                CashDrawerSession.restaurant_id == self.restaurant_id,
                CashDrawerSession.opened_by_employee_id == employee_id,
                CashDrawerSession.status == status
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions_for_date(self, session_date: date) -> List[CashDrawerSession]:
        """List all sessions for a specific date."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(CashDrawerSession)
            .where(
                CashDrawerSession.restaurant_id == self.restaurant_id,
                func.date(CashDrawerSession.opened_at) == session_date
            )
            .order_by(CashDrawerSession.opened_at.desc())
        )
        return list(result.scalars().all())

    async def close_session(
        self,
        session_id: int,
        closing_float: float,
        actual_cash: float,
        cash_sales_total: float,
        card_sales_total: float,
        tip_total: float,
        closed_by_employee_id: int,
        notes: Optional[str] = None
    ) -> Optional[CashDrawerSession]:
        """Close a drawer session with final counts."""
        # Calculate expected and variance
        session = await self.get(session_id)
        if not session or session.restaurant_id != self.restaurant_id:
            return None
            
        expected_cash = session.opening_float + cash_sales_total - closing_float
        variance = actual_cash - expected_cash
        
        stmt = (
            update(CashDrawerSession)
            .where(
                CashDrawerSession.session_id == session_id,
                CashDrawerSession.restaurant_id == self.restaurant_id
            )
            .values(
                closing_float=closing_float,
                expected_cash=expected_cash,
                actual_cash=actual_cash,
                variance=variance,
                cash_sales_total=cash_sales_total,
                card_sales_total=card_sales_total,
                tip_total=tip_total,
                status="closed",
                closed_at=datetime.utcnow(),
                closed_by_employee_id=closed_by_employee_id,
                notes=notes
            )
            .returning(CashDrawerSession)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_session_with_transactions(self, session_id: int) -> Optional[CashDrawerSession]:
        """Get session with its transactions eagerly loaded."""
        from app.db.models.cash_drawer_transactions_orm import CashDrawerTransaction
        result = await self.db.execute(
            select(CashDrawerSession)
            .options(joinedload(CashDrawerSession.transactions))
            .where(
                CashDrawerSession.session_id == session_id,
                CashDrawerSession.restaurant_id == self.restaurant_id
            )
        )
        return result.unique().scalar_one_or_none()

    async def get_sessions_with_variance(self, min_variance: float = 0.01) -> List[CashDrawerSession]:
        """Get closed sessions where variance exceeds threshold (for auditing)."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(CashDrawerSession)
            .where(
                CashDrawerSession.restaurant_id == self.restaurant_id,
                CashDrawerSession.status == "closed",
                func.abs(CashDrawerSession.variance) >= min_variance
            )
            .order_by(CashDrawerSession.closed_at.desc())
        )
        return list(result.scalars().all())
