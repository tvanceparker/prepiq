# app/db/models/order_items_orm.py

from sqlalchemy import Column, BigInteger, DECIMAL, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"), nullable=False)
    menu_item_id = Column(BigInteger, ForeignKey("menu_items.menu_item_id"), nullable=False)
    quantity = Column(DECIMAL(8, 2), default=1, nullable=False)
    unit_price = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    line_total = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    instructions = Column(String(255), nullable=True)
    recipe_snapshot = Column(JSON, nullable=True)

    # Relationships
    order = relationship("Order", back_populates="order_items")
    menu_item = relationship("MenuItem", back_populates="order_items")
    modifiers = relationship("OrderItemModifier", back_populates="order_item", cascade="all, delete-orphan")
