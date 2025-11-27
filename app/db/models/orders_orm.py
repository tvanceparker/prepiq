# app/db/models/orders_orm.py

from sqlalchemy import Column, BigInteger, String, DECIMAL, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class Order(Base):
    __tablename__ = "orders"

    order_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(BigInteger, ForeignKey("restaurants.restaurant_id"), nullable=False)
    external_id = Column(String(255), nullable=True)
    employee_id = Column(BigInteger, ForeignKey("employees.employee_id"), nullable=True)
    order_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    order_status = Column(String(32), default='open', nullable=False)
    sales_channel = Column(String(50), nullable=True)
    subtotal = Column(DECIMAL(10, 2), default=0.00)
    tax = Column(DECIMAL(10, 2), default=0.00)
    discount = Column(DECIMAL(10, 2), default=0.00)
    total = Column(DECIMAL(10, 2), default=0.00)
    order_metadata = Column(JSON, nullable=True)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="orders")
    employee = relationship("Employee", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    cash_drawer_transactions = relationship("CashDrawerTransaction", back_populates="order")
