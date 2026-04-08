# app/db/models/batch_recipes_orm.py

from sqlalchemy import Column, Integer, String, DECIMAL, Text, ForeignKey
from sqlalchemy.orm import relationship, foreign
from app.db.session import Base


class BatchRecipe(Base):
    __tablename__ = "batch_recipes"

    batch_recipe_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    description = Column(Text)
    yield_quantity = Column(DECIMAL(10, 2))
    yield_unit = Column(String(20))
    estimated_prep_time_minutes = Column(Integer)
    shelf_life_days = Column(Integer)

    restaurant = relationship("Restaurant", back_populates="batch_recipes")
    batch_recipe_ingredients = relationship(
        "BatchRecipeIngredient",
        back_populates="batch_recipe",
        cascade="all, delete-orphan",
        foreign_keys="[BatchRecipeIngredient.batch_recipe_id]",
    )
    menu_item_batch_usage = relationship(
        "MenuItemBatchUsage", back_populates="batch_recipe"
    )
    recipe_ingredients = relationship(
        "RecipeIngredient",
        primaryjoin="and_(RecipeIngredient.ingredient_type == 'batch', foreign(RecipeIngredient.reference_id) == BatchRecipe.batch_recipe_id)",
        back_populates="batch_recipe",
        overlaps="ingredient,recipe_ingredients",
    )
    prep_schedules = relationship("PrepSchedule", back_populates="batch_recipe")
    batch_recipe_forecast_breakdowns = relationship(
        "BatchRecipeForecastBreakdown", back_populates="batch_recipe"
    )
