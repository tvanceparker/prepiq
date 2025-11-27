# app/db/models/pos_item_mappings_orm.py

from sqlalchemy import Column, String, Enum, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class POSItemMapping(Base):
    __tablename__ = "pos_item_mappings"

    mapping_id = Column(INTEGER(11), primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(INTEGER(11), ForeignKey('restaurants.restaurant_id', ondelete='CASCADE'), nullable=False, index=True)
    pos_provider = Column(Enum('square', 'toast', 'clover'), nullable=False)
    external_item_id = Column(String(255), nullable=False)
    external_item_name = Column(String(255), nullable=True)
    menu_item_id = Column(INTEGER(11), ForeignKey('menu_items.menu_item_id', ondelete='SET NULL'), nullable=True, index=True)
    confidence_score = Column(DECIMAL(3, 2), default=0.00)
    mapping_status = Column(Enum('auto', 'manual', 'unmapped'), default='unmapped', nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    restaurant = relationship("Restaurant", backref="pos_item_mappings")
    menu_item = relationship("MenuItem", backref="pos_mappings")
