from typing import Optional, Dict, Any, List
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.models.forecast_run_ledger_orm import ForecastRunLedger
from app.repositories.base_repository import BaseRepository


class ForecastRunLedgerRepository(BaseRepository[ForecastRunLedger]):
    """Repository for ForecastRunLedger operations."""

    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, ForecastRunLedger, restaurant_id)
        self.pk_field = "forecast_ledger_id"

    async def get_or_create(self, run_date: date) -> ForecastRunLedger:
        """Get existing ledger entry or create new one for the given date."""
        stmt = select(ForecastRunLedger).where(
            and_(
                ForecastRunLedger.restaurant_id == self.restaurant_id,
                ForecastRunLedger.run_date == run_date,
            )
        )
        result = await self.db.execute(stmt)
        ledger = result.scalar_one_or_none()

        if ledger:
            return ledger

        new_ledger = ForecastRunLedger(
            restaurant_id=self.restaurant_id,
            run_date=run_date,
            running=False,
            accuracy_evaluated=False,
            daily_accuracy_evaluated=False,
            forecasts_generated=False,
            batch_breakdown_calculated=False,
            ingredient_breakdown_calculated=False,
            finalized=False,
            menu_items_processed=0,
            menu_items_total=0,
            durations={},
            errors=[],
        )
        self.db.add(new_ledger)
        await self.db.flush()
        await self.db.refresh(new_ledger)
        return new_ledger

    async def mark_running(self, ledger: ForecastRunLedger) -> None:
        """Mark the forecast run as currently running."""
        ledger.running = True
        ledger.started_at = datetime.utcnow()
        await self.db.flush()

    async def mark_stage_complete(
        self, ledger: ForecastRunLedger, stage_name: str, duration_ms: int
    ) -> None:
        """Mark a specific stage as complete and record its duration."""
        setattr(ledger, stage_name, True)
        
        if ledger.durations is None:
            ledger.durations = {}
        ledger.durations[stage_name] = duration_ms
        
        await self.db.flush()

    async def update_progress(
        self, ledger: ForecastRunLedger, processed: int, total: int
    ) -> None:
        """Update menu items processing progress."""
        ledger.menu_items_processed = processed
        ledger.menu_items_total = total
        await self.db.flush()

    async def record_error(
        self, ledger: ForecastRunLedger, stage: str, message: str
    ) -> None:
        """Record an error that occurred during a stage."""
        if ledger.errors is None:
            ledger.errors = []
        
        ledger.errors.append({
            "stage": stage,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        })
        await self.db.flush()

    async def finalize(self, ledger: ForecastRunLedger) -> None:
        """Mark the forecast run as finalized and complete."""
        ledger.running = False
        ledger.finalized = True
        ledger.finished_at = datetime.utcnow()
        await self.db.flush()

    async def is_running(self, run_date: date) -> bool:
        """Check if a forecast run is currently in progress for the given date."""
        stmt = select(ForecastRunLedger.running).where(
            and_(
                ForecastRunLedger.restaurant_id == self.restaurant_id,
                ForecastRunLedger.run_date == run_date,
            )
        )
        result = await self.db.execute(stmt)
        running = result.scalar_one_or_none()
        return bool(running)
