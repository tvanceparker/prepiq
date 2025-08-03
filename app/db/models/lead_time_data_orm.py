# app/db/models/lead_time_data_orm.py

from sqlalchemy import Column, Integer, Date, String, Text, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class LeadTimeData(Base):
    __tablename__ = "lead_time_data"

    lead_time_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    supplier_id = Column(Integer, ForeignKey("supplier.supplier_id"), nullable=False)
    lead_time_date = Column(Date, nullable=False)
    lead_time_days = Column(Integer)
    lead_time_variance = Column(Integer)
    status = Column(String(50))
    notes = Column(Text)

    restaurant = relationship("Restaurant", back_populates="lead_time_data")
    supplier = relationship("Supplier", back_populates="lead_time_data")
