# db/models/traffic_data_orm.py

from sqlalchemy import Column, Integer, Date, String, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class TrafficData(Base):
    __tablename__ = "traffic_data"

    traffic_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    traffic_date = Column(Date, nullable=False)
    traffic_count = Column(Integer)
    traffic_condition = Column(String(100))
    traffic_delay_minutes = Column(Integer)

    restaurant = relationship("Restaurant", back_populates="traffic_data")
