# db/models/ingredient_supplier_orm.py

from sqlalchemy import Column, Integer, DECIMAL, Date, ForeignKey, Boolean, String
from sqlalchemy.orm import relationship
from app.db.session import Base


class IngredientSupplier(Base):
    __tablename__ = "ingredient_supplier"

    # New auto-incrementing primary key
    ingredient_supplier_id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign key relationships
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )
    supplier_id = Column(Integer, ForeignKey("supplier.supplier_id"), nullable=False)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )

    # Other fields
    cost_per_unit = Column(DECIMAL(10, 2), nullable=False)
    lead_time_days = Column(Integer, nullable=False)
    spoilage_rate = Column(DECIMAL(4, 3))
    shelf_life_days = Column(Integer)
    preferred = Column(Boolean, default=False)
    min_order_quantity = Column(Integer)
    supplier_priority = Column(Integer)
    unit = Column(String, nullable=False)
    pack_size = Column(Integer)
    quantity_per_pack_item = Column(DECIMAL(10, 2))

    # Relationships
    ingredient = relationship("Ingredient", back_populates="ingredient_suppliers")
    supplier = relationship("Supplier", back_populates="ingredient_suppliers")
    restaurant = relationship("Restaurant", back_populates="ingredient_supplier")

    inventory_lots = relationship("InventoryLot", back_populates="ingredient_supplier")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="ingredient_supplier")
