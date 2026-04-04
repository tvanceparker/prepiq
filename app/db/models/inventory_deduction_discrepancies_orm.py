from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, DECIMAL, ForeignKey, Integer, String, Text

from app.db.session import Base


class InventoryDeductionDiscrepancy(Base):
    __tablename__ = "inventory_deduction_discrepancies"

    discrepancy_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.alert_id"), nullable=True)

    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, default="urgent")
    status = Column(String(20), nullable=False, default="Active")
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    date_created = Column(DateTime, nullable=False, default=datetime.utcnow)
    date_resolved = Column(DateTime, nullable=True)

    item_kind = Column(String(20), nullable=False, default="unknown")
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), nullable=True)
    batch_recipe_id = Column(Integer, ForeignKey("batch_recipes.batch_recipe_id"), nullable=True)
    item_name = Column(String(100), nullable=True)
    unit = Column(String(20), nullable=True)

    required_quantity = Column(DECIMAL(10, 2), nullable=False, default=0)
    available_quantity = Column(DECIMAL(10, 2), nullable=False, default=0)
    current_quantity_on_hand = Column(DECIMAL(10, 2), nullable=False, default=0)
    shortfall_quantity = Column(DECIMAL(10, 2), nullable=False, default=0)

    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    attempted_day = Column(Date, nullable=True)