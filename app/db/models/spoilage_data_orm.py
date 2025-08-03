# db/models/spoilage_data_orm.py

from sqlalchemy import Column, Integer, DECIMAL, Date, ForeignKey, Enum
from app.db.session import Base
from sqlalchemy.orm import relationship


class SpoilageData(Base):
    __tablename__ = "spoilage_data"

    spoilage_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )
    spoilage_date = Column(Date, nullable=False)
    spoilage_rate = Column(DECIMAL(4, 3))
    spoiled_quantity = Column(DECIMAL(10, 2))
    source = Column(
        Enum("auto", "manual", name="spoilage_source_enum"),
        nullable=False,
        default="auto",
    )

    restaurant = relationship("Restaurant", back_populates="spoilage_data")
    ingredient = relationship("Ingredient", back_populates="spoilage_data")
