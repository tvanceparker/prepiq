# db/models/supplier_orm.py

from sqlalchemy import Column, Integer, String, Boolean, Date, DECIMAL, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Supplier(Base):
    __tablename__ = "supplier"

    supplier_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    type = Column(String(50))
    region = Column(String(50))
    contact_info = Column(String(255))
    rating = Column(DECIMAL(3, 2), default=5.00)
    website = Column(String(255))
    is_active = Column(Boolean, default=True)
    supplier_feedback = Column(Text)
    contract_status = Column(String(50), default="Active")
    contract_start_date = Column(Date)
    contract_end_date = Column(Date)

    # Relationship back to IngredientSupplier
    ingredient_suppliers = relationship("IngredientSupplier", back_populates="supplier")
    lead_time_data = relationship("LeadTimeData", back_populates="supplier")
    restaurant = relationship("Restaurant", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
