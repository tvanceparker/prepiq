from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.services.alerts_service import AlertsService
from app.schemas.alerts_dto import AlertCreate, AlertResponse, FixAlertRequest
from app.api.dependencies import get_alert_service, check_permissions
import logging
from app.core.logging import logging
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.post("/create", response_model=AlertResponse,
             dependencies=[Depends(check_permissions(["alerts"]))])
@log_route("Create Alert")
async def create_alert(
    alert_in: AlertCreate,
    service: AlertsService = Depends(get_alert_service)):
    alert = await service.create_alert(
        alert_type=alert_in.alert_type,
        message=alert_in.message,
        severity=alert_in.alert_type,
        employee_id=alert_in.employee_id,
        role=alert_in.role,
        meta=alert_in.meta,
    )
    return alert

@router.get("/get_all", response_model=List[AlertResponse])
@log_route("Get all Alerts")
async def get_all_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    alerts_service: AlertsService = Depends(get_alert_service)
):
    return await alerts_service.get_all_alerts(skip=skip, limit=limit)

@router.get("/active", response_model=List[AlertResponse])
@log_route("List Active Alerts")
async def list_active_alerts(
    skip: int = 0,
    limit: int = 50,
    service: AlertsService = Depends(get_alert_service)
):
    alerts = await service.get_active_alerts(skip, limit)
    return alerts


@router.post("/{alert_id}/resolve", response_model=AlertResponse,
             dependencies=[Depends(check_permissions(["alerts"]))])
@log_route("Resolve Alert")
async def resolve_alert(
    alert_id: int,
    service: AlertsService = Depends(get_alert_service)):
    alert = await service.resolve_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse,
             dependencies=[Depends(check_permissions(["alerts"]))])
@log_route("Acknowledge Alert")
async def acknowledge_alert(
    alert_id: int,
    service: AlertsService = Depends(get_alert_service)):
    alert = await service.acknowledge_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


    
@router.post("/{alert_id}/fix", response_model=dict,
             dependencies=[Depends(check_permissions(["alerts"]))])
@log_route("Fixing Alert")
async def fix_alert(
    alert_id: str,
    fix_data: FixAlertRequest,
    service: AlertsService = Depends(get_alert_service)):
    try:
        print(f"fix_alert called with alert_id={alert_id}, fix_data={fix_data}")
        success = await service.fix_alert(alert_id, fix_data.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=400, detail="Could not fix alert or invalid input.")
        return {"status": "success", "alert_id": alert_id}
    except HTTPException:
        raise  # re-raise expected errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
@router.get("/active_count")
async def get_active_alert_count(service: AlertsService = Depends(get_alert_service)):
    try:
        count = await service.get_active_alert_count()
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active alert count: {str(e)}")
