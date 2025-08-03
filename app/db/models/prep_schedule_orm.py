# app/db/models/prep_schedule_orm.py

from sqlalchemy import Column, Integer, DECIMAL, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class PrepSchedule(Base):
    __tablename__ = "prep_schedule"

    prep_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    batch_recipe_id = Column(
        Integer, ForeignKey("batch_recipes.batch_recipe_id"), nullable=False
    )
    prep_date = Column(Date, nullable=False)
    quantity_needed = Column(DECIMAL(10, 2))
    quantity_prepped = Column(DECIMAL(10, 2))
    prep_batch_count = Column(DECIMAL(10, 2))
    prep_time_minutes_estimated = Column(Integer)
    prep_time_minutes_actual = Column(Integer)
    assigned_employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    status = Column(String(20), default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="prep_schedules")
    batch_recipe = relationship(
        "BatchRecipe", back_populates="prep_schedules", lazy="joined"
    )
    employee = relationship("Employee", back_populates="prep_schedules")
