# app/db/models/devices_orm.py

from sqlalchemy import Column, BigInteger, String, JSON, ForeignKey, TIMESTAMP, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(BigInteger, ForeignKey("restaurants.restaurant_id"), nullable=False)
    name = Column(String(255), nullable=False)
    device_type = Column(String(64), nullable=False)  # e.g., 'pos_terminal', 'kitchen_display', 'printer'
    device_metadata = Column(JSON, nullable=True)
    device_settings = Column(JSON, nullable=True)  # Device-specific settings overrides
    fingerprint_hash = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=True, server_default="1")
    last_seen_at = Column(TIMESTAMP, nullable=True)
    biometric_capability = Column(String(20), nullable=True)

    restaurant = relationship("Restaurant", back_populates="devices")
