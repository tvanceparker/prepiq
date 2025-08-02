# app/api/v1/eod_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from app.services.eod_service import EODService
from app.api.dependencies import get_eod_service
from datetime import date
from app.core.logging import logger

router = APIRouter(prefix="/eod", tags=["End of Day"])


@router.get("/finalize")
async def finalize_eod(
    background_tasks: BackgroundTasks,
    eod_date: date = Query(...),
    eod_service: EODService = Depends(get_eod_service),
):
    logger.info(f"[ROUTE] Called /finalize with eod_date={eod_date}")
    
    # ✅ Use async-compatible background task
    async def background_finalize():
        try:
            await eod_service.finalize_end_of_day_summary(eod_date)
        except Exception as e:
            logger.error(f"[EOD Background Task] Failed: {e}", exc_info=True)
    
    background_tasks.add_task(background_finalize)

    return {"status": "processing", "detail": "EOD finalization started in background."}
