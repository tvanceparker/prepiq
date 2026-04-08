# db/models/ingredients_orm.py

from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, Boolean, and_
from app.db.session import Base
from sqlalchemy.orm import relationship, foreign


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
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="ingredients")
    # inventory = relationship("Inventory", back_populates="ingredient")
    spoilage_data = relationship("SpoilageData", back_populates="ingredient")
    recipe_ingredients = relationship(
        "RecipeIngredient",
        back_populates="ingredient",
        primaryjoin="and_(Ingredient.ingredient_id == foreign(RecipeIngredient.reference_id), RecipeIngredient.ingredient_type == 'ingredient')",
        overlaps="recipe_ingredients",
    )

    ingredient_suppliers = relationship(
        "IngredientSupplier", back_populates="ingredient"
    )
    batch_recipe_ingredients = relationship(
        "BatchRecipeIngredient",
        back_populates="ingredient",
        primaryjoin="and_(Ingredient.ingredient_id == foreign(BatchRecipeIngredient.reference_id), "
                     "BatchRecipeIngredient.ingredient_type == 'ingredient')",
    )
    purchase_order_items = relationship(
        "PurchaseOrderItem", back_populates="ingredient"
    )
    recipe_modifiers = relationship("RecipeModifier", back_populates="ingredient")
    ingredient_forecast_breakdowns = relationship(
        "IngredientForecastBreakdown", back_populates="ingredient"
    )
