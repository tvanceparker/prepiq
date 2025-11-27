# app/db/models/cash_drawer_sessions_orm.py

from sqlalchemy import Column, BigInteger, String, Text, Enum, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import INTEGER
from app.db.session import Base
from datetime import datetime


class CashDrawerSession(Base):
    __tablename__ = "cash_drawer_sessions"

    session_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(INTEGER(11), ForeignKey("restaurants.restaurant_id"), nullable=False)
    device_id = Column(BigInteger, ForeignKey("devices.device_id"), nullable=True)
    opened_by_employee_id = Column(INTEGER(11), ForeignKey("employees.employee_id"), nullable=False)
    opened_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    opening_float = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    closed_by_employee_id = Column(INTEGER(11), ForeignKey("employees.employee_id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closing_float = Column(DECIMAL(10, 2), nullable=True)
    expected_cash = Column(DECIMAL(10, 2), nullable=True)
    actual_cash = Column(DECIMAL(10, 2), nullable=True)
    variance = Column(DECIMAL(10, 2), nullable=True)
    cash_sales_total = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    card_sales_total = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    tip_total = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    status = Column(Enum('open', 'closed'), nullable=False, default='open')
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="cash_drawer_sessions")
    device = relationship("Device", back_populates="cash_drawer_sessions")
    opened_by = relationship("Employee", foreign_keys=[opened_by_employee_id], back_populates="opened_drawer_sessions")
    closed_by = relationship("Employee", foreign_keys=[closed_by_employee_id], back_populates="closed_drawer_sessions")
    transactions = relationship("CashDrawerTransaction", back_populates="session", cascade="all, delete-orphan")
