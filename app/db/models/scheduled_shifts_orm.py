# db/models/scheduled_shifts_orm.py

from sqlalchemy import Column, Integer, DateTime, String, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class ScheduledShift(Base):
    __tablename__ = "scheduled_shifts"

    shift_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    shift_start = Column(DateTime)
    shift_end = Column(DateTime)
    shift_type = Column(String(20))

    restaurant = relationship("Restaurant", back_populates="scheduled_shifts")
    employee = relationship("Employee", back_populates="scheduled_shifts")
