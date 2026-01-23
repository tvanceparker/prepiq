from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime, date

# === DTOs === #

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class EmployeeDTO(BaseModel):
    name: str
    email: str
    username: str
    phone: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = None
    role_id: int

class EmployeeCreateDTO(EmployeeDTO):
    password: str  
    login_code: Optional[str] = None

class EmployeeUpdateDTO(EmployeeDTO):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = None
    role_id: Optional[int] = None
    password: Optional[str] = None

class EmployeeReadDTO(EmployeeDTO):
    employee_id: int
    hire_date: datetime
    is_active: bool
    login_code: int
    preferences: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class ShiftDTO(BaseModel):
    employee_id: int
    shift_start: datetime
    shift_end: Optional[datetime] = None
    shift_type: str

class ShiftCreateDTO(ShiftDTO):
    pass

class ShiftReadDTO(ShiftDTO):
    shift_id: int
    shift_start: datetime
    shift_end: Optional[datetime] = None
    employee_id: int
    employee_name: Optional[str] = None  # Include employee name for display


    model_config = ConfigDict(from_attributes=True)


class ShiftUpdateDTO(BaseModel):
    employee_id: Optional[int] = None
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None
    shift_type: Optional[str] = None


class ShiftListResponse(BaseModel):
    """Response for listing shifts with employee details."""
    shift_id: int
    employee_id: int
    employee_name: str
    shift_start: datetime
    shift_end: Optional[datetime] = None
    shift_type: str
    duration_hours: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

class ClockEventDTO(BaseModel):
    employee_id: int
    clock_in: datetime
    clock_out: Optional[datetime] = None
    shift_note: Optional[str] = None

class ClockEventUpdateDTO(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None


class ClockEventCreateDTO(ClockEventDTO):
    pass

class ClockEventReadDTO(ClockEventDTO):
    clock_id: int
    clock_in: datetime
    clock_out: Optional[datetime] = None
    shift_note: Optional[str]


    model_config = ConfigDict(from_attributes=True)


# === Shift Scheduling DTOs === #

class ShiftScheduleRequest(BaseModel):
    """Request to create/update a shift schedule."""
    employee_id: int
    shift_date: date
    shift_start_time: str  # "HH:MM" format
    shift_end_time: str    # "HH:MM" format
    shift_type: str        # "morning", "afternoon", "evening", "night"


class ShiftScheduleResponse(BaseModel):
    """Response for shift schedule with employee details."""
    shift_id: int
    employee_id: int
    employee_name: str
    shift_start: datetime
    shift_end: datetime
    shift_type: str
    duration_hours: float
    
    model_config = ConfigDict(from_attributes=True)


class WeeklyScheduleRequest(BaseModel):
    """Request to get weekly schedule."""
    start_date: date
    end_date: Optional[date] = None


# === Team Insights DTOs === #

class EmployeePerformanceDTO(BaseModel):
    """Individual employee performance metrics."""
    employee_id: int
    employee_name: str
    total_hours: float
    total_shifts: int
    avg_shift_duration: float
    on_time_percentage: float
    role: str


class TeamInsightsResponse(BaseModel):
    """Team insights analytics response."""
    # Overview metrics
    total_employees: int
    active_employees: int
    total_hours_worked: float
    total_shifts: int
    avg_hours_per_employee: float
    
    # Labor cost metrics
    total_labor_cost: float
    avg_cost_per_hour: float
    labor_cost_percentage: Optional[float] = None  # Of total revenue
    
    # Attendance metrics
    on_time_rate: float
    late_clock_ins: int
    missed_shifts: int
    
    # Top performers
    top_performers: List[EmployeePerformanceDTO]
    
    # Daily breakdown
    hours_by_day: dict  # {day: hours}
    shifts_by_type: dict  # {shift_type: count}
    
    model_config = ConfigDict(from_attributes=True)


class TeamInsightsRequest(BaseModel):
    """Request parameters for team insights."""
    start_date: date
    end_date: date

