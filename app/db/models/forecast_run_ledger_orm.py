from sqlalchemy import Column, BigInteger, Date, DateTime, Boolean, JSON, String, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class ForecastRunLedger(Base):
    """Tracks per-restaurant, per-date forecast pipeline progress for idempotency & observability."""
    __tablename__ = "forecast_run_ledger"
    __table_args__ = (
        UniqueConstraint("restaurant_id", "run_date", name="uq_forecast_run_ledger_restaurant_date"),
    )

    forecast_ledger_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(INTEGER(11), ForeignKey("restaurants.restaurant_id", ondelete="CASCADE"), index=True, nullable=False)
    run_date = Column(Date, index=True, nullable=False)

    running = Column(Boolean, default=False)
    lock_token = Column(String(40), nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    # Stage completion flags
    accuracy_evaluated = Column(Boolean, default=False)
    daily_accuracy_evaluated = Column(Boolean, default=False)
    forecasts_generated = Column(Boolean, default=False)
    batch_breakdown_calculated = Column(Boolean, default=False)
    ingredient_breakdown_calculated = Column(Boolean, default=False)
    finalized = Column(Boolean, default=False)

    # Metadata
    menu_items_processed = Column(BigInteger, default=0)
    menu_items_total = Column(BigInteger, default=0)
    
    durations = Column(JSON, default=dict)  # stage -> milliseconds
    errors = Column(JSON, default=list)     # list of {stage, message, ts}

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="forecast_run_ledgers")
