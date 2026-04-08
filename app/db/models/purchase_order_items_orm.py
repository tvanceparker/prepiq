# app/db/models/purchase_order_items_orm.py

from sqlalchemy import Column, Integer, DECIMAL, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    order_item_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False)
    order_id = Column(Integer, ForeignKey("purchase_orders.order_id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), nullable=False)
    ingredient_supplier_id = Column(Integer, ForeignKey("ingredient_supplier.ingredient_supplier_id"))
    
    quantity_ordered = Column(DECIMAL(10, 2))
    quantity_received = Column(DECIMAL(10, 2), nullable=True)
    unit = Column(String(20))
    unit_price = Column(DECIMAL(10, 2))
    total_item_price = Column(DECIMAL(10, 2), default=0.00)

    restaurant = relationship("Restaurant", back_populates="purchase_order_items")
    purchase_order = relationship("PurchaseOrder", back_populates="purchase_order_items")
    ingredient = relationship("Ingredient", back_populates="purchase_order_items")
    ingredient_supplier = relationship("IngredientSupplier", back_populates="purchase_order_items")
