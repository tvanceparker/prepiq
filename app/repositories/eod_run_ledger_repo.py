from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.eod_run_ledger_orm import EODRunLedger


class EODRunLedgerRepository:
    """Repository providing idempotent stage updates for the EOD pipeline."""

    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id

    async def get_by_date(self, run_date) -> Optional[EODRunLedger]:
        stmt = select(EODRunLedger).filter(
            EODRunLedger.restaurant_id == self.restaurant_id,
            EODRunLedger.run_date == run_date,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_or_create(self, run_date) -> EODRunLedger:
        ledger = await self.get_by_date(run_date)
        if ledger:
            return ledger
        ledger = EODRunLedger(restaurant_id=self.restaurant_id, run_date=run_date, running=False)
        self.db.add(ledger)
        await self.db.flush()
        await self.db.refresh(ledger)
        return ledger

    async def mark_running(self, ledger: EODRunLedger, lock_token: Optional[str] = None) -> EODRunLedger:
        if not ledger.running:
            ledger.running = True
            ledger.started_at = ledger.started_at or datetime.utcnow()
            ledger.lock_token = lock_token
            await self.db.flush()
        return ledger

    async def mark_stage_complete(self, ledger: EODRunLedger, stage: str, duration_ms: int) -> None:
        setattr(ledger, stage, True)
        durations = ledger.durations or {}
        durations[stage] = duration_ms
        ledger.durations = durations
        await self.db.flush()

    async def append_error(self, ledger: EODRunLedger, stage: str, message: str) -> None:
        errors = ledger.errors or []
        errors.append({"stage": stage, "message": message, "ts": datetime.utcnow().isoformat()})
        ledger.errors = errors
        await self.db.flush()

    async def finalize(self, ledger: EODRunLedger) -> None:
        ledger.finalized = True
        ledger.running = False
        ledger.finished_at = datetime.utcnow()
        await self.db.flush()
