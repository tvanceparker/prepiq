from sqlalchemy import Column, BigInteger, Date, DateTime, Boolean, JSON, String, UniqueConstraint
from datetime import datetime
from app.db.session import Base


class EODRunLedger(Base):
    """Tracks per-restaurant, per-date EOD pipeline progress for idempotency & observability."""
    __tablename__ = "eod_run_ledger"
    __table_args__ = (
        UniqueConstraint("restaurant_id", "run_date", name="uq_eod_run_ledger_restaurant_date"),
    )

    id = Column(BigInteger, primary_key=True, index=True)
    restaurant_id = Column(BigInteger, index=True, nullable=False)
    run_date = Column(Date, index=True, nullable=False)

    running = Column(Boolean, default=False)
    lock_token = Column(String(40), nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    # Stage completion flags
    sales_deducted = Column(Boolean, default=False)
    forecast_completed = Column(Boolean, default=False)
    reorder_completed = Column(Boolean, default=False)
    po_suggested = Column(Boolean, default=False)
    po_written = Column(Boolean, default=False)
    finalized = Column(Boolean, default=False)

    durations = Column(JSON, default=dict)  # stage -> milliseconds
    errors = Column(JSON, default=list)     # list of {stage, message, ts}

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
