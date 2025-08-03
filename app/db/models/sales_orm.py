# db/models/sales_orm.py

from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class Sales(Base):
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    sale_timestamp = Column(DateTime, nullable=False)
    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=False
    )
    quantity_sold = Column(Integer, nullable=False)
    sales_channel = Column(String(50))

    restaurant = relationship("Restaurant", back_populates="sales")
    menu_item = relationship("MenuItem", back_populates="sales")
