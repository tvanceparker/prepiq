from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime

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
    pay_rate: float
    employment_type: str
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
