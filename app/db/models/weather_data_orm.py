# db/models/weather_data_orm.py

from sqlalchemy import Column, Integer, Date, Numeric, String, ForeignKey, TIMESTAMP, SmallInteger
from app.db.session import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class WeatherData(Base):
    __tablename__ = "weather_data"

    weather_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True
    )
    weather_date = Column(Date, nullable=False)

    # Core measurements
    temperature = Column(Numeric(6, 2), nullable=True)
    precipitation_mm = Column(Numeric(6, 2), nullable=True)
    precipitation_type = Column(String(32), nullable=True)
    humidity = Column(SmallInteger, nullable=True)
    wind_speed = Column(Numeric(6, 2), nullable=True)
    wind_deg = Column(SmallInteger, nullable=True)
    weather_condition = Column(String(128), nullable=True)

    # Metadata
    source = Column(String(64), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="weather_data")
