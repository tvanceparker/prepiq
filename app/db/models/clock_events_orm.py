# db/models/clock_events_orm.py

from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class ClockEvent(Base):
    __tablename__ = "clock_events"

    clock_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime)
    shift_note = Column(Text)

    restaurant = relationship("Restaurant", back_populates="clock_events")
    employee = relationship("Employee", back_populates="clock_events")
