"""Durable identity for a manual waste event and its allocated movements."""
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, UniqueConstraint
from app.db.session import Base

class WasteReport(Base):
    __tablename__ = 'waste_reports'
    __table_args__ = (UniqueConstraint('restaurant_id', 'request_key', name='uq_waste_report_request'),)
    report_id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.restaurant_id'), nullable=False)
    request_key = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False)
    result = Column(JSON, nullable=True)
