# db/models/weather_data_orm.py

from sqlalchemy import Column, Integer, Date, DECIMAL, String, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class WeatherData(Base):
    __tablename__ = "weather_data"

    weather_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    weather_date = Column(Date, nullable=False)
    temperature = Column(DECIMAL(5, 2))
    precipitation = Column(DECIMAL(5, 2))
    weather_condition = Column(String(100))

    restaurant = relationship("Restaurant", back_populates="weather_data")
