from fastapi import APIRouter, Depends, HTTPException
from app.schemas.team_dto import StandardResponse
from app.utils.logger_helpers import log_route
from app.api.dependencies import get_team_service
from app.services.team_service import TeamService
from app.schemas.team_dto import (EmployeeCreateDTO, EmployeeUpdateDTO, ShiftCreateDTO, ClockEventCreateDTO, ClockEventUpdateDTO)

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
async def update_employee(employee_id: int, dto: EmployeeUpdateDTO, service: TeamService = Depends(get_team_service)):
    try:
        employee = await service.update_employee(employee_id, dto)
        return StandardResponse(success=True, message="Employee updated", data=employee)
    except Exception as e:
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

@router.get("/shifts/{employee_id}", response_model=StandardResponse)
async def get_shifts_for_employee(employee_id: int, service: TeamService = Depends(get_team_service)):
    try:
        shifts = await service.get_all_shifts_for_employee(employee_id)
        return StandardResponse(success=True, message="Shifts fetched", data=shifts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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