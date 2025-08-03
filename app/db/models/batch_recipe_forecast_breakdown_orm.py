# app/db/models/batch_recipe_forecast_breakdown_orm.py


from sqlalchemy import Column, Integer, ForeignKey, Date, DECIMAL, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class BatchRecipeForecastBreakdown(Base):
    __tablename__ = "batch_recipe_forecast_breakdown"

    batch_breakdown_id = Column(Integer, primary_key=True, autoincrement=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.forecast_id"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    batch_recipe_id = Column(
        Integer, ForeignKey("batch_recipes.batch_recipe_id"), nullable=False
    )
    quantity = Column(DECIMAL(10, 2), nullable=False)
    source_menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=True
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=True
    )
    created_at = Column(DateTime, server_default=func.now())

    batch_recipe = relationship(
        "BatchRecipe", back_populates="batch_recipe_forecast_breakdowns"
    )
    forecast = relationship(
        "Forecast", back_populates="batch_recipe_forecast_breakdowns"
    )
    source_menu_item = relationship(
        "MenuItem", back_populates="batch_recipe_forecast_breakdowns"
    )
