# app/schemas/employees_dto.py

from pydantic import BaseModel
from typing import Optional


class EmployeeBase(BaseModel):
    restaurant_id: int
    name: str
    role: Optional[str] = None
    email: str
    username: str
    phone: Optional[str] = None
    password_hash: str
    hire_date: Optional[str] = None  # Can be passed as string in ISO format
    is_active: Optional[bool] = True
    login_code: int
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = "hourly"


class EmployeeCreate(EmployeeBase):
    name: str
    username: str
    role: str
    email: str
    phone: str
    login_code: int
    password_hash: str
    pay_rate: float
    employment_type: str
    restaurant_id: int = 1  # default for now!!


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    hire_date: Optional[str] = None
    is_active: Optional[bool] = None
    login_code: Optional[int] = None
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = None


class Employee(EmployeeBase):
    employee_id: int

    class Config:
        orm_mode = True
