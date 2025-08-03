# app/db/models/supplier_preferences_orm.py

from sqlalchemy import Column, Integer, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class SupplierPreference(Base):
    __tablename__ = "supplier_preferences"

    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), primary_key=True
    )
    weight_cost = Column(DECIMAL(4, 3), default=0.4)
    weight_lead_time = Column(DECIMAL(4, 3), default=0.3)
    weight_spoilage = Column(DECIMAL(4, 3), default=0.2)
    weight_rating = Column(DECIMAL(4, 3), default=0.1)

    restaurant = relationship("Restaurant", back_populates="supplier_preferences")
