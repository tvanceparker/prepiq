from sqlalchemy import Column, BigInteger, String, DateTime, DECIMAL, Boolean, ForeignKey, JSON
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(
        BigInteger, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    role_id = Column(BigInteger, ForeignKey("roles.role_id"), nullable=True)  # Changed to Integer and ForeignKey
    email = Column(String(100), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    hire_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    login_code = Column(BigInteger, nullable=True)
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
    orders = relationship("Order", back_populates="employee")
    # Cash drawer relationships
    opened_drawer_sessions = relationship("CashDrawerSession", foreign_keys="CashDrawerSession.opened_by_employee_id", back_populates="opened_by")
    closed_drawer_sessions = relationship("CashDrawerSession", foreign_keys="CashDrawerSession.closed_by_employee_id", back_populates="closed_by")
    cash_drawer_transactions = relationship("CashDrawerTransaction", back_populates="employee")

    def __repr__(self):
        return f"<Employee(id={self.employee_id}, name={self.name}, role_id={self.role_id})>"
