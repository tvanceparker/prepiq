# app/db/models/alerts_orm.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    DateTime,
    Boolean,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
import enum

class SeverityEnum(str, enum.Enum):
    info = "info"
    warning = "warning"
    urgent = "urgent"
    high = "high"


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    role = Column(String(50), nullable=False)
    alert_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_resolved = Column(DateTime, nullable=True)
    status = Column(Enum("Active", "Resolved", "Acknowledged", name="alert_status"), default="Active")
    is_acknowledged = Column(Boolean, default=False)
    meta = Column(JSON)
    severity = Column(Enum(SeverityEnum), nullable=False, default=SeverityEnum.info)

    # Relationships to other tables
    restaurant = relationship("Restaurant", back_populates="alerts")
    employee = relationship("Employee", back_populates="alerts")
