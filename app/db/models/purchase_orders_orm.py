# app/db/models/purchase_orders_orm.py

from sqlalchemy import Column, Integer, Date, String, ForeignKey, DECIMAL, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    order_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("supplier.supplier_id"), nullable=True)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    actual_delivery_date = Column(Date)
    status = Column(String(20), default="pending")
    total_order_price = Column(DECIMAL(10, 2), default=0.00)
    notes = Column(Text, nullable=True)

    restaurant = relationship("Restaurant", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    purchase_order_items = relationship(
        "PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan"
    )
