# db/models/ingredients_orm.py

from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class Ingredient(Base):
    __tablename__ = "ingredients"

    ingredient_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    category = Column(String(50))
    average_weight_per_unit = Column(DECIMAL(10, 2))
    abc_class = Column(String(1))
    max_stock_level = Column(DECIMAL(10, 2), nullable=True)

    restaurant = relationship("Restaurant", back_populates="ingredients")
    # inventory = relationship("Inventory", back_populates="ingredient")
    spoilage_data = relationship("SpoilageData", back_populates="ingredient")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")

    ingredient_suppliers = relationship(
        "IngredientSupplier", back_populates="ingredient"
    )
    batch_recipe_ingredients = relationship(
        "BatchRecipeIngredient", back_populates="ingredient"
    )
    purchase_order_items = relationship(
        "PurchaseOrderItem", back_populates="ingredient"
    )
    recipe_modifiers = relationship("RecipeModifier", back_populates="ingredient")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")
    batch_recipe_ingredients = relationship(
        "BatchRecipeIngredient", back_populates="ingredient"
    )
    ingredient_forecast_breakdowns = relationship(
        "IngredientForecastBreakdown", back_populates="ingredient"
    )
