# app/db/models/order_item_modifiers_orm.py

from sqlalchemy import Column, BigInteger, DECIMAL, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class OrderItemModifier(Base):
    __tablename__ = "order_item_modifiers"

    modifier_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    order_item_id = Column(BigInteger, ForeignKey("order_items.order_item_id"), nullable=False)
    mod_type = Column(Enum('remove', 'add', 'replace', 'modifier', 'cooking_temp', 'note'), nullable=False)
    target_type = Column(Enum('ingredient', 'modifier'), nullable=True)
    reference_id = Column(BigInteger, nullable=True)
    quantity = Column(DECIMAL(10, 2), nullable=True)
    unit = Column(String(20), nullable=True)
    note = Column(String(255), nullable=True)

    # Relationships
    order_item = relationship("OrderItem", back_populates="modifiers")
