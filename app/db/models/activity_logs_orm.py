# db/models/activity_logs_orm.py

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    activity_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="activity_logs")
    employee = relationship("Employee", back_populates="activity_logs")
