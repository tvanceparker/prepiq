from fastapi import APIRouter, Depends, HTTPException
from app.schemas.team_dto import StandardResponse
from app.utils.logger_helpers import log_route
from app.api.dependencies import get_team_service, get_current_user, CurrentUser
from app.services.team_service import TeamService
from app.schemas.team_dto import (
    EmployeeCreateDTO,
    EmployeeUpdateDTO,
    ShiftCreateDTO,
    ClockEventCreateDTO,
    ClockEventUpdateDTO,
    ShiftUpdateDTO,
    ShiftListResponse,
    ShiftScheduleRequest,
    ShiftScheduleResponse,
)

router = APIRouter(prefix="/team", tags=["Team"])

@log_route("Create Employee")
@router.post("/employees", response_model=StandardResponse)
async def create_employee(dto: EmployeeCreateDTO, service: TeamService = Depends(get_team_service)):
    try:
        employee = await service.create_employee(dto)
        return StandardResponse(success=True, message="Employee created", data=employee)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@log_route("Update Employee")
@router.patch("/employees/{employee_id}", response_model=StandardResponse)
async def update_employee(
    employee_id: int,
    dto: EmployeeUpdateDTO,
    service: TeamService = Depends(get_team_service),
):
    try:
        employee = await service.update_employee(employee_id, dto)
        return StandardResponse(success=True, message="Employee updated", data=employee)
    except Exception:
        raise HTTPException(status_code=404, detail="Employee not found")

@log_route("List Employees")
@router.get("/employees", response_model=StandardResponse)
async def list_employees(service: TeamService = Depends(get_team_service)):
    try:
        employees = await service.get_all_employees()
        return StandardResponse(success=True, message="Employees fetched", data=employees)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@log_route("Get Employee")
@router.get("/employees/{employee_id}", response_model=StandardResponse)
async def get_employee(employee_id: int, service: TeamService = Depends(get_team_service)):
    try:
        employee = await service.get_employee_by_id(employee_id)
        return StandardResponse(success=True, message="Employee fetched", data=employee)
    except HTTPException:
        raise


@log_route("Create Shift")
@router.post("/shifts", response_model=StandardResponse)
async def create_shift(dto: ShiftCreateDTO, service: TeamService = Depends(get_team_service)):
    try:
        shift = await service.create_shift(dto)
        return StandardResponse(success=True, message="Shift created", data=shift)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/shifts/weekly", response_model=dict)
@log_route()
async def get_weekly_schedule(
    start_date: str,
    end_date: str = None,
    service: TeamService = Depends(get_team_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all scheduled shifts for a date range (default 7 days if end_date not provided).
    """
    try:
        schedule = await service.get_weekly_schedule(start_date, end_date)
        return {
            "status": "success",
            "data": [shift.model_dump() for shift in schedule],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch schedule: {str(e)}")


@router.get("/shifts/{employee_id}", response_model=StandardResponse)
async def get_shifts_for_employee(employee_id: int, service: TeamService = Depends(get_team_service)):
    try:
        shifts = await service.get_all_shifts_for_employee(employee_id)
        return StandardResponse(success=True, message="Shifts fetched", data=shifts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@log_route("Get All Shifts")
@router.get("/shifts", response_model=StandardResponse)
async def get_all_shifts(
    start_date: str = None,
    end_date: str = None,
    service: TeamService = Depends(get_team_service)
):
    """Get all shifts with optional date filtering."""
    try:
        shifts = await service.get_all_shifts(start_date=start_date, end_date=end_date)
        return StandardResponse(success=True, message="All shifts fetched", data=shifts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@log_route("Update Shift")
@router.patch("/shifts/{shift_id}", response_model=StandardResponse)
async def update_shift(shift_id: int, dto: ShiftUpdateDTO, service: TeamService = Depends(get_team_service)):
    """Update an existing shift."""
    try:
        shift = await service.update_shift(shift_id, dto)
        return StandardResponse(success=True, message="Shift updated", data=shift)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@log_route("Delete Shift")
@router.delete("/shifts/{shift_id}", response_model=StandardResponse)
async def delete_shift(shift_id: int, service: TeamService = Depends(get_team_service)):
    """Delete a shift."""
    try:
        await service.delete_shift(shift_id)
        return StandardResponse(success=True, message="Shift deleted", data=None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/clock-events", response_model=StandardResponse)
async def create_clock_event(dto: ClockEventCreateDTO, service: TeamService = Depends(get_team_service)):
    try:
        clock_event = await service.create_clock_event(dto)
        return StandardResponse(success=True, message="Clock event created", data=clock_event)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/clock-events/{employee_id}", response_model=StandardResponse)
async def get_clock_events_for_employee(employee_id: int, service: TeamService = Depends(get_team_service)):
    try:
        clock_events = await service.get_clock_events_for_employee(employee_id)
        return StandardResponse(success=True, message="Clock events fetched", data=clock_events)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/clock-events/{clock_event_id}", response_model=StandardResponse)
async def update_clock_event(clock_event_id: int, dto: ClockEventUpdateDTO, service: TeamService = Depends(get_team_service)):
    try:
        updated_clock_event = await service.update_clock_event(clock_event_id, dto)
        return StandardResponse(success=True, message="Clock event updated", data=updated_clock_event)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update clock event: {str(e)}")


# ====================== Shift Scheduling Routes ======================

@router.post("/shifts/schedule", response_model=dict)
@log_route()
async def create_scheduled_shift(
    shift_data: ShiftScheduleRequest,
    service: TeamService = Depends(get_team_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a new scheduled shift for an employee.
    """
    try:
        shift = await service.create_scheduled_shift(shift_data)
        return {
            "status": "success",
            "message": "Shift scheduled successfully",
            "data": shift.model_dump(),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to schedule shift: {str(e)}")



@router.patch("/shifts/{shift_id}", response_model=dict)
@log_route()
async def update_scheduled_shift(
    shift_id: int,
    shift_data: ShiftScheduleRequest,
    service: TeamService = Depends(get_team_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update an existing scheduled shift.
    """
    try:
        updated_shift = await service.update_scheduled_shift(shift_id, shift_data)
        return {
            "status": "success",
            "message": "Shift updated successfully",
            "data": updated_shift.model_dump(),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update shift: {str(e)}")


@router.delete("/shifts/{shift_id}", response_model=dict)
@log_route()
async def delete_scheduled_shift(
    shift_id: int,
    service: TeamService = Depends(get_team_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Delete a scheduled shift.
    """
    try:
        await service.delete_scheduled_shift(shift_id)
        return {
            "status": "success",
            "message": "Shift deleted successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete shift: {str(e)}")


# ====================== Team Insights Routes ======================

@router.get("/insights", response_model=dict)
@log_route()
async def get_team_insights(
    start_date: str,
    end_date: str,
    service: TeamService = Depends(get_team_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get team analytics and insights for a date range.
    Legacy team/timekeeping surface; not part of the current product.
    """
    try:
        insights = await service.get_team_insights(start_date, end_date)
        return {
            "status": "success",
            "data": insights.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch team insights: {str(e)}")
