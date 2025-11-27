# app/services/cash_drawer_service.py

from typing import Optional, List
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.repositories.cash_drawer_sessions_repo import CashDrawerSessionRepository
from app.repositories.cash_drawer_transactions_repo import CashDrawerTransactionRepository
from app.db.models.cash_drawer_sessions_orm import CashDrawerSession
from app.db.models.cash_drawer_transactions_orm import CashDrawerTransaction
from app.utils.logger_helpers import log_method
import logging

logger = logging.getLogger(__name__)


class CashDrawerService:
    """
    Service for managing cash drawer sessions and transactions.
    
    Each POS device/register can have one open drawer session at a time.
    Sessions track opening float, closing counts, and all cash/card transactions.
    """

    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: Optional[int] = None
    ):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.session_repo = CashDrawerSessionRepository(db, restaurant_id)
        self.transaction_repo = CashDrawerTransactionRepository(db, restaurant_id)

    @log_method()
    async def open_drawer(
        self,
        opening_float: float,
        device_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> CashDrawerSession:
        """
        Open a new cash drawer session.
        
        Args:
            opening_float: Starting cash amount in the drawer
            device_id: POS device/register ID (optional)
            notes: Opening notes (e.g., "Float from safe")
            
        Returns:
            The new CashDrawerSession
            
        Raises:
            HTTPException: If a drawer is already open for this device
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required to open drawer"
            )
        
        # Check if there's already an open session for this device
        existing = await self.session_repo.get_open_session(device_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cash drawer already open (Session #{existing.session_id}). Close it first."
            )
        
        session = CashDrawerSession(
            restaurant_id=self.restaurant_id,
            device_id=device_id,
            opened_by_employee_id=self.employee_id,
            opening_float=opening_float,
            status="open",
            notes=notes
        )
        
        created = await self.session_repo.create(session)
        logger.info(
            f"Cash drawer opened - Session #{created.session_id}, "
            f"Float: ${opening_float:.2f}, Employee: {self.employee_id}"
        )
        return created

    @log_method()
    async def close_drawer(
        self,
        session_id: int,
        actual_cash: float,
        closing_float: float = 0.0,
        notes: Optional[str] = None
    ) -> CashDrawerSession:
        """
        Close a drawer session with final cash count.
        
        Args:
            session_id: The session to close
            actual_cash: Actual cash counted in drawer at close
            closing_float: Cash left in drawer for next shift (default 0)
            notes: Closing notes
            
        Returns:
            Updated session with variance calculated
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required to close drawer"
            )
        
        session = await self.session_repo.get(session_id)
        if not session or session.restaurant_id != self.restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Drawer session not found"
            )
        
        if session.status != "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session is already {session.status}"
            )
        
        # Calculate totals from transactions
        totals = await self.transaction_repo.get_session_totals(session_id)
        
        closed = await self.session_repo.close_session(
            session_id=session_id,
            closing_float=closing_float,
            actual_cash=actual_cash,
            cash_sales_total=totals["cash_sales"] - totals["cash_refunds"],
            card_sales_total=totals["card_sales"] - totals["card_refunds"],
            tip_total=totals["tips"],
            closed_by_employee_id=self.employee_id,
            notes=notes
        )
        
        logger.info(
            f"Cash drawer closed - Session #{session_id}, "
            f"Expected: ${closed.expected_cash:.2f}, "
            f"Actual: ${actual_cash:.2f}, "
            f"Variance: ${closed.variance:.2f}"
        )
        
        return closed

    @log_method()
    async def get_current_session(
        self, 
        device_id: Optional[int] = None
    ) -> Optional[CashDrawerSession]:
        """Get the currently open drawer session."""
        return await self.session_repo.get_open_session(device_id)

    @log_method()
    async def get_session_details(self, session_id: int) -> dict:
        """
        Get full session details including calculated totals.
        
        Returns dict with session data and transaction summary.
        """
        session = await self.session_repo.get_session_with_transactions(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        totals = await self.transaction_repo.get_session_totals(session_id)
        
        return {
            "session": session,
            "totals": totals,
            "transaction_count": totals["transaction_count"]
        }

    @log_method()
    async def record_sale(
        self,
        session_id: int,
        amount: float,
        payment_method: str,  # "cash" or "card"
        order_id: Optional[int] = None,
        payment_id: Optional[int] = None,
        tip_amount: float = 0.0,
        cash_tendered: Optional[float] = None,
        notes: Optional[str] = None
    ) -> CashDrawerTransaction:
        """
        Record a sale transaction in the cash drawer.
        
        For cash sales, calculates change to return.
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required"
            )
        
        session = await self.session_repo.get(session_id)
        if not session or session.status != "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No open drawer session"
            )
        
        tx_type = "cash_sale" if payment_method == "cash" else "card_sale"
        
        # Calculate change for cash payments
        change_given = 0.0
        if payment_method == "cash" and cash_tendered:
            total_due = amount + tip_amount
            change_given = cash_tendered - total_due
            if change_given < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient payment. Due: ${total_due:.2f}, Tendered: ${cash_tendered:.2f}"
                )
            notes = f"{notes or ''} Cash tendered: ${cash_tendered:.2f}, Change: ${change_given:.2f}".strip()
        
        transaction = CashDrawerTransaction(
            restaurant_id=self.restaurant_id,
            session_id=session_id,
            employee_id=self.employee_id,
            transaction_type=tx_type,
            amount=amount,
            tip_amount=tip_amount,
            order_id=order_id,
            payment_id=payment_id,
            notes=notes
        )
        
        created = await self.transaction_repo.create(transaction)
        
        logger.info(
            f"Sale recorded - {tx_type.upper()} ${amount:.2f} "
            f"(tip: ${tip_amount:.2f}) Session #{session_id}"
        )
        
        return created

    @log_method()
    async def record_refund(
        self,
        session_id: int,
        amount: float,
        payment_method: str,
        order_id: Optional[int] = None,
        payment_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> CashDrawerTransaction:
        """Record a refund transaction."""
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required"
            )
        
        session = await self.session_repo.get(session_id)
        if not session or session.status != "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No open drawer session"
            )
        
        tx_type = "cash_refund" if payment_method == "cash" else "card_refund"
        
        transaction = CashDrawerTransaction(
            restaurant_id=self.restaurant_id,
            session_id=session_id,
            employee_id=self.employee_id,
            transaction_type=tx_type,
            amount=amount,
            tip_amount=0,
            order_id=order_id,
            payment_id=payment_id,
            notes=f"REFUND: {reason}" if reason else "REFUND"
        )
        
        created = await self.transaction_repo.create(transaction)
        logger.info(f"Refund recorded - {tx_type.upper()} ${amount:.2f} Session #{session_id}")
        return created

    @log_method()
    async def pay_in(
        self,
        session_id: int,
        amount: float,
        reason: str
    ) -> CashDrawerTransaction:
        """
        Record cash added to drawer (not from a sale).
        E.g., manager adds change from safe.
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required"
            )
        
        transaction = CashDrawerTransaction(
            restaurant_id=self.restaurant_id,
            session_id=session_id,
            employee_id=self.employee_id,
            transaction_type="pay_in",
            amount=amount,
            tip_amount=0,
            notes=f"PAY IN: {reason}"
        )
        
        created = await self.transaction_repo.create(transaction)
        logger.info(f"Pay-in recorded - ${amount:.2f} Session #{session_id}: {reason}")
        return created

    @log_method()
    async def pay_out(
        self,
        session_id: int,
        amount: float,
        reason: str
    ) -> CashDrawerTransaction:
        """
        Record cash removed from drawer (not from a refund).
        E.g., manager pulls excess cash for safe drop.
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required"
            )
        
        transaction = CashDrawerTransaction(
            restaurant_id=self.restaurant_id,
            session_id=session_id,
            employee_id=self.employee_id,
            transaction_type="pay_out",
            amount=amount,
            tip_amount=0,
            notes=f"PAY OUT: {reason}"
        )
        
        created = await self.transaction_repo.create(transaction)
        logger.info(f"Pay-out recorded - ${amount:.2f} Session #{session_id}: {reason}")
        return created

    @log_method()
    async def no_sale(
        self,
        session_id: int,
        reason: Optional[str] = None
    ) -> CashDrawerTransaction:
        """
        Record a no-sale drawer open event.
        Used for making change, checking float, etc.
        """
        if not self.employee_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee authentication required"
            )
        
        return await self.transaction_repo.record_no_sale(
            session_id=session_id,
            employee_id=self.employee_id,
            reason=reason
        )

    @log_method()
    async def calculate_expected_cash(self, session_id: int) -> dict:
        """
        Calculate expected cash in drawer without closing.
        
        Returns:
            Dict with opening_float, sales, refunds, pay_ins, pay_outs, expected_cash
        """
        session = await self.session_repo.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        totals = await self.transaction_repo.get_session_totals(session_id)
        
        expected = (
            session.opening_float
            + totals["cash_sales"]
            - totals["cash_refunds"]
            + totals["pay_ins"]
            - totals["pay_outs"]
        )
        
        return {
            "opening_float": session.opening_float,
            "cash_sales": totals["cash_sales"],
            "cash_refunds": totals["cash_refunds"],
            "pay_ins": totals["pay_ins"],
            "pay_outs": totals["pay_outs"],
            "expected_cash": expected,
            "card_sales": totals["card_sales"],
            "card_refunds": totals["card_refunds"],
            "tips": totals["tips"]
        }

    @log_method()
    async def list_sessions_for_date(self, target_date: date) -> List[CashDrawerSession]:
        """Get all drawer sessions for a given date."""
        return await self.session_repo.list_sessions_for_date(target_date)

    @log_method()
    async def get_sessions_with_discrepancies(self, threshold: float = 1.0) -> List[CashDrawerSession]:
        """Get closed sessions with cash variance above threshold (for auditing)."""
        return await self.session_repo.get_sessions_with_variance(min_variance=threshold)
