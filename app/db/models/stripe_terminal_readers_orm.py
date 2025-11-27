# app/db/models/stripe_terminal_readers_orm.py

from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import INTEGER
from app.db.session import Base
from datetime import datetime


class StripeTerminalReader(Base):
    __tablename__ = "stripe_terminal_readers"

    reader_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(INTEGER(11), ForeignKey("restaurants.restaurant_id"), nullable=False)
    stripe_reader_id = Column(String(255), nullable=False, unique=True)
    label = Column(String(100), nullable=True)
    device_type = Column(String(50), nullable=True)
    serial_number = Column(String(100), nullable=True)
    status = Column(String(32), nullable=False, default='offline')
    ip_address = Column(String(45), nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="stripe_terminal_readers")
    payments = relationship("Payment", back_populates="terminal_reader")
