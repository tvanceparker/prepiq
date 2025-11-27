# app/repositories/cash_drawer_transactions_repo.py

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base_repository import BaseRepository
from app.db.models.cash_drawer_transactions_orm import CashDrawerTransaction
from datetime import datetime, date


class CashDrawerTransactionRepository(BaseRepository[CashDrawerTransaction]):
    """Repository for cash drawer transaction operations."""
    
    model = CashDrawerTransaction
    pk_field = "transaction_id"

    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, self.model, restaurant_id, self.pk_field)

    async def get_transactions_for_session(
        self, 
        session_id: int,
        transaction_type: Optional[str] = None
    ) -> List[CashDrawerTransaction]:
        """Get all transactions for a specific drawer session."""
        query = select(CashDrawerTransaction).where(
            CashDrawerTransaction.session_id == session_id,
            CashDrawerTransaction.restaurant_id == self.restaurant_id
        )
        if transaction_type:
            query = query.where(CashDrawerTransaction.transaction_type == transaction_type)
        query = query.order_by(CashDrawerTransaction.created_at)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_session_totals(self, session_id: int) -> dict:
        """Calculate totals for a drawer session by transaction type."""
        result = await self.db.execute(
            select(
                CashDrawerTransaction.transaction_type,
                func.sum(CashDrawerTransaction.amount).label("total_amount"),
                func.sum(CashDrawerTransaction.tip_amount).label("total_tips"),
                func.count().label("count")
            )
            .where(
                CashDrawerTransaction.session_id == session_id,
                CashDrawerTransaction.restaurant_id == self.restaurant_id
            )
            .group_by(CashDrawerTransaction.transaction_type)
        )
        
        totals = {
            "cash_sales": 0.0,
            "card_sales": 0.0,
            "cash_refunds": 0.0,
            "card_refunds": 0.0,
            "pay_ins": 0.0,
            "pay_outs": 0.0,
            "tips": 0.0,
            "transaction_count": 0
        }
        
        for row in result:
            tx_type = row.transaction_type
            amount = float(row.total_amount or 0)
            tips = float(row.total_tips or 0)
            count = row.count
            
            totals["transaction_count"] += count
            totals["tips"] += tips
            
            if tx_type == "cash_sale":
                totals["cash_sales"] += amount
            elif tx_type == "card_sale":
                totals["card_sales"] += amount
            elif tx_type == "cash_refund":
                totals["cash_refunds"] += amount
            elif tx_type == "card_refund":
                totals["card_refunds"] += amount
            elif tx_type == "pay_in":
                totals["pay_ins"] += amount
            elif tx_type == "pay_out":
                totals["pay_outs"] += amount
        
        # Calculate net cash
        totals["net_cash"] = (
            totals["cash_sales"] 
            - totals["cash_refunds"] 
            + totals["pay_ins"] 
            - totals["pay_outs"]
        )
        
        return totals

    async def get_transactions_by_order(self, order_id: int) -> List[CashDrawerTransaction]:
        """Get all drawer transactions linked to an order."""
        result = await self.db.execute(
            select(CashDrawerTransaction)
            .where(
                CashDrawerTransaction.order_id == order_id,
                CashDrawerTransaction.restaurant_id == self.restaurant_id
            )
            .order_by(CashDrawerTransaction.created_at)
        )
        return list(result.scalars().all())

    async def get_transactions_by_payment(self, payment_id: int) -> List[CashDrawerTransaction]:
        """Get all drawer transactions linked to a payment."""
        result = await self.db.execute(
            select(CashDrawerTransaction)
            .where(
                CashDrawerTransaction.payment_id == payment_id,
                CashDrawerTransaction.restaurant_id == self.restaurant_id
            )
            .order_by(CashDrawerTransaction.created_at)
        )
        return list(result.scalars().all())

    async def get_transactions_by_employee(
        self, 
        employee_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[CashDrawerTransaction]:
        """Get transactions created by a specific employee, optionally within date range."""
        query = select(CashDrawerTransaction).where(
            CashDrawerTransaction.employee_id == employee_id,
            CashDrawerTransaction.restaurant_id == self.restaurant_id
        )
        
        if start_date:
            query = query.where(
                func.date(CashDrawerTransaction.created_at) >= start_date
            )
        if end_date:
            query = query.where(
                func.date(CashDrawerTransaction.created_at) <= end_date
            )
            
        query = query.order_by(CashDrawerTransaction.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def record_no_sale(
        self,
        session_id: int,
        employee_id: int,
        reason: Optional[str] = None
    ) -> CashDrawerTransaction:
        """Record a no-sale (drawer open without transaction) event."""
        no_sale = CashDrawerTransaction(
            restaurant_id=self.restaurant_id,
            session_id=session_id,
            employee_id=employee_id,
            transaction_type="no_sale",
            amount=0,
            tip_amount=0,
            notes=reason or "No sale - drawer opened"
        )
        self.db.add(no_sale)
        await self.db.flush()
        return no_sale
