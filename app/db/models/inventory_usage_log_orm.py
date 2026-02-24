# app/db/models/inventory_usage_log_orm.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
import enum


class UsageTypeEnum(str, enum.Enum):
    sale = "sale"
    waste = "waste"
    spoilage = "spoilage"
    manual_adjustment = "manual_adjustment"
    batch_production = "batch_production"
    batch_output = "batch_output"


class ReferenceTypeEnum(str, enum.Enum):
    sale = "sale"
    batch = "batch"
    user = "user"
    lot = "lot"
    waste_report = "waste_report"
    eod_sales = "eod_sales"
    other = "other"


class InventoryUsageLog(Base):
    __tablename__ = "inventory_usage_log"

    usage_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    inventory_id = Column(Integer, ForeignKey("inventory.inventory_id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.lot_id"), nullable=True)
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )

    used_quantity = Column(DECIMAL(10, 2), nullable=False)
    unit = Column(String(20), nullable=False)
    used_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    usage_type = Column(Enum(UsageTypeEnum), nullable=False)
    reference_type = Column(Enum(ReferenceTypeEnum), nullable=True)
    reference_id = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)

    # Relationships (optional but helpful)
    inventory = relationship("Inventory", back_populates="usage_logs")
    lot = relationship("InventoryLot", back_populates="usage_logs", lazy="joined")
    restaurant = relationship("Restaurant", back_populates="usage_logs")
