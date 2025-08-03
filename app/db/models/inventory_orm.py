# app/db/models/inventory_orm.py

from sqlalchemy import (
    Column,
    Integer,
    Float,
    Date,
    DateTime,
    ForeignKey,
    String,
    DECIMAL,
)
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    ingredient_id = Column(Integer, nullable=True)
    quantity_on_hand = Column(Float, default=0)
    min_stock_level = Column(Float, default=0)
    last_delivery_date = Column(Date)
    spoilage_expected_date = Column(Date)
    shelf_life_days = Column(Integer)
    spoilage_rate = Column(DECIMAL(4, 3))  # Using DECIMAL for precision/scale
    last_audit_timestamp = Column(DateTime)
    last_audit_quantity = Column(Float, default=0)
    unit = Column(String(20), nullable=False)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="inventory")
    # ingredient = relationship("Ingredient", back_populates="inventory")
    inventory_lots = relationship("InventoryLot", back_populates="inventory")
    usage_logs = relationship("InventoryUsageLog", back_populates="inventory")
