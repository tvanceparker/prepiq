# db/models/error_logs_orm.py

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime


class ErrorLog(Base):
    __tablename__ = "error_logs"

    log_id = Column(
        Integer, primary_key=True, index=True
    )  # Change from error_id to log_id
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    employee_id = Column(
        Integer, ForeignKey("employees.employee_id")
    )  # Employee is nullable based on your table
    level = Column(String(20), nullable=False)  # Corresponds to level in your table
    message = Column(Text, nullable=False)  # Corresponds to message in your table
    trace = Column(Text)  # Corresponds to trace in your table
    source = Column(String(50))  # Corresponds to source in your table
    created_at = Column(
        DateTime, default=datetime.utcnow
    )  # Corresponds to created_at in your table

    restaurant = relationship("Restaurant", back_populates="error_logs")
    employee = relationship("Employee", back_populates="error_logs")
