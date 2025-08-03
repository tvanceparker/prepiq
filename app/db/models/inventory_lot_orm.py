# app/db/models/inventory_lot_orm.py

from sqlalchemy import Column, Integer, Date, Float, String, ForeignKey, DECIMAL, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
from enum import Enum as PyEnum

class LotStatus(PyEnum):
    available = "available"
    used = "used"
    expired = "expired"



class InventoryLot(Base):
    __tablename__ = "inventory_lots"

    lot_id = Column(Integer, primary_key=True, index=True)  # Unique ID for each lot
    inventory_id = Column(
        Integer, ForeignKey("inventory.inventory_id"), nullable=False
    )  # Reference to inventory
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )  # Reference to restaurant
    ingredient_supplier_id = Column(
        Integer,
        ForeignKey("ingredient_supplier.ingredient_supplier_id"),
        nullable=False,
    )  # Reference to ingredient_supplier
    delivery_date = Column(Date, nullable=False)  # Delivery date of the lot
    spoilage_expected_date = Column(
        Date, nullable=True
    )  # Expected spoilage date (can be null)
    quantity = Column(Float, nullable=False)  # Quantity of the item in the lot
    total_received = Column(
        DECIMAL(10, 2), default=0.00, nullable=False
    )  # Total received quantity
    unit = Column(
        String, nullable=False
    )  # Unit of the ingredient, e.g. kg, liter, etc.
    ingredient_id = Column(Integer)
    batch_recipe_id = Column(Integer)
    status = Column(Enum(LotStatus), default=LotStatus.available, nullable=False)
    # Relationships
    inventory = relationship("Inventory", back_populates="inventory_lots")
    restaurant = relationship("Restaurant", back_populates="inventory_lots")
    ingredient_supplier = relationship(
        "IngredientSupplier", back_populates="inventory_lots"
    )
    usage_logs = relationship("InventoryUsageLog", back_populates="lot")
