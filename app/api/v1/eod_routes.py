# app/api/v1/eod_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from app.services.eod_service import EODService
from app.api.dependencies import get_eod_service
from datetime import date
from app.core.logging import logger
from app.schemas.eod_dto import EODLaunchSummaryDTO, EODRunSummaryDTO

router = APIRouter(prefix="/eod", tags=["End of Day"])


@router.get("/summary", response_model=EODRunSummaryDTO)
async def get_eod_summary(
    run_date: date | None = Query(None),
    eod_service: EODService = Depends(get_eod_service),
):
    summary = await eod_service.get_eod_run_summary(run_date=run_date)
    if not summary:
        raise HTTPException(status_code=404, detail="No EOD run summary found.")
    return summary


@router.get("/finalize", response_model=EODLaunchSummaryDTO)
async def finalize_eod(
    background_tasks: BackgroundTasks,
    eod_date: date = Query(...),
    force: bool = Query(False, description="Manual rerun only. Resets the EOD ledger for the requested date before rerunning."),
    eod_service: EODService = Depends(get_eod_service),
):
    logger.info(f"[ROUTE] Called /finalize with eod_date={eod_date} force={force}")
    
    # ✅ Use async-compatible background task
    async def background_finalize():
        try:
            await eod_service.finalize_end_of_day_summary(
                eod_date,
                force=force,
                trigger_source="manual",
            )
        except Exception as e:
            logger.error(f"[EOD Background Task] Failed: {e}", exc_info=True)
    
    background_tasks.add_task(background_finalize)

    return {
        "status": "processing",
        "detail": "EOD finalization started in background.",
        "run_date": eod_date,
        "trigger_source": "manual",
        "run_mode": "force_rerun" if force else "idempotent_run",
        "protections": [
            "sales_deduction_idempotent",
            "po_write_idempotent",
            "po_receipt_replay_protected",
        ],
    }
