# app/db/models/payments_orm.py

from sqlalchemy import Column, BigInteger, DECIMAL, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"), nullable=False)
    restaurant_id = Column(BigInteger, ForeignKey("restaurants.restaurant_id"), nullable=False)
    payment_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    tip_amount = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    cash_tendered = Column(DECIMAL(10, 2), nullable=True)
    change_given = Column(DECIMAL(10, 2), nullable=True)
    currency = Column(String(10), default='USD')
    method = Column(String(50), nullable=True)
    provider = Column(String(50), nullable=True)
    provider_payment_id = Column(String(255), nullable=True)
    status = Column(String(32), default='pending')
    payment_metadata = Column(JSON, nullable=True)

    # Relationships
    order = relationship("Order", back_populates="payments")
    restaurant = relationship("Restaurant", back_populates="payments")
