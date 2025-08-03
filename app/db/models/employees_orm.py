from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, Boolean, ForeignKey, JSON
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=True)  # Changed to Integer and ForeignKey
    email = Column(String(100), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    hire_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    login_code = Column(Integer, nullable=True)
    pay_rate = Column(DECIMAL(10, 2))
    employment_type = Column(String(20), default="hourly")
    preferences = Column(JSON, nullable=True, default=dict)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="employees")
    role = relationship("Role", back_populates="employees", lazy="selectin")  # Added relationship to Role

    clock_events = relationship("ClockEvent", back_populates="employee")
    scheduled_shifts = relationship("ScheduledShift", back_populates="employee")
    error_logs = relationship("ErrorLog", back_populates="employee")
    activity_logs = relationship("ActivityLog", back_populates="employee")
    prep_schedules = relationship("PrepSchedule", back_populates="employee")
    alerts = relationship("Alert", back_populates="employee")

    def __repr__(self):
        return f"<Employee(id={self.employee_id}, name={self.name}, role_id={self.role_id})>"
