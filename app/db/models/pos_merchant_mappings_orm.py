# app/db/models/pos_merchant_mappings_orm.py

from sqlalchemy import Column, String, Enum, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class POSMerchantMapping(Base):
    __tablename__ = "pos_merchant_mappings"

    mapping_id = Column(INTEGER(11), primary_key=True, autoincrement=True, index=True)
    merchant_id = Column(String(255), nullable=False)
    pos_provider = Column(Enum('square', 'toast', 'clover'), nullable=False)
    restaurant_id = Column(INTEGER(11), ForeignKey('restaurants.restaurant_id', ondelete='CASCADE'), nullable=False, index=True)
    location_id = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)

    # Relationship
    restaurant = relationship("Restaurant", backref="pos_merchant_mappings")
