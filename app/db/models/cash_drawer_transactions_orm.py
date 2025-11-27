# app/db/models/cash_drawer_transactions_orm.py

from sqlalchemy import Column, BigInteger, String, Enum, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import INTEGER
from app.db.session import Base
from datetime import datetime


class CashDrawerTransaction(Base):
    __tablename__ = "cash_drawer_transactions"

    transaction_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    session_id = Column(BigInteger, ForeignKey("cash_drawer_sessions.session_id"), nullable=False)
    restaurant_id = Column(INTEGER(11), ForeignKey("restaurants.restaurant_id"), nullable=False)
    transaction_type = Column(
        Enum('cash_sale', 'card_sale', 'cash_refund', 'card_refund', 'pay_in', 'pay_out', 'no_sale'),
        nullable=False
    )
    amount = Column(DECIMAL(10, 2), nullable=False)
    tip_amount = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    payment_id = Column(INTEGER(11), ForeignKey("payments.payment_id"), nullable=True)
    order_id = Column(INTEGER(11), ForeignKey("orders.order_id"), nullable=True)
    employee_id = Column(INTEGER(11), ForeignKey("employees.employee_id"), nullable=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    session = relationship("CashDrawerSession", back_populates="transactions")
    restaurant = relationship("Restaurant", back_populates="cash_drawer_transactions")
    payment = relationship("Payment", back_populates="cash_drawer_transactions")
    order = relationship("Order", back_populates="cash_drawer_transactions")
    employee = relationship("Employee", back_populates="cash_drawer_transactions")
