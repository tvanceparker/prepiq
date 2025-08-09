# app/schemas/tenant.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List, Literal, Dict
from decimal import Decimal
from datetime import date, datetime
import json

class DayHours(BaseModel):
    day: Literal['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    open_time: Optional[str]  # "10:00"
    close_time: Optional[str]  # "22:00"
    is_closed: bool

class TenantInfoResponse(BaseModel):
    restaurant_id: int
    name: str
    phone: Optional[str]
    email: EmailStr
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    subscription_tier: Literal['basic', 'pro', 'master']
    subscription_status: Literal['active', 'inactive']
    expiry_date: Optional[date]
    hours_of_operation: List[DayHours]

    model_config = ConfigDict(from_attributes=True)

    @field_validator("hours_of_operation", mode="before")
    @classmethod
    def parse_hours(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception as e:
                raise ValueError(f"Invalid JSON in hours_of_operation: {e}")
        return v

class TenantInfoUpdateRequest(BaseModel):
    name: str
    phone: Optional[str]
    email: EmailStr
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    hours_of_operation: List[DayHours]

    model_config = ConfigDict(from_attributes=True)

class ActivityLogResponse(BaseModel):
    activity_id: int
    employee_id: Optional[int]
    employee_name: Optional[str]
    action: str
    details: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
class CheckEntry(BaseModel):
    count: int
    exists: bool

class EndOfDayCheckResponse(BaseModel):
    forecasts: CheckEntry
    forecast_accuracy: CheckEntry
    daily_forecast_accuracy: CheckEntry
    forecast_breakdown: CheckEntry
    sales_data: CheckEntry
    overall_status: str

#------------Roles-------------------
# Create Role DTO
class CreateRoleDTO(BaseModel):
    name: str
    description: Optional[str] = None

# Update Role DTO
class UpdateRoleDTO(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# Role Response DTO (for displaying the role after creation or update)
class RoleDTO(BaseModel):
    role_id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

#---------Permissions-----------------
class PermissionDTO(BaseModel):
    permission_id: int
    name: str
    description: str
    
    model_config = ConfigDict(from_attributes=True)
class UpdatePermissionsDTO(BaseModel):
    permissions: List[PermissionDTO]


class AssignPermissionDTO(BaseModel):
    role_id: int
    permission_id: int

class AssignRoleToEmployeeDTO(BaseModel):
    employee_id: int
    role_id: int

class RemovePermissionDTO(BaseModel):
    role_id: int
    permission_id: int

class EmployeeRoleResponse(BaseModel):
    employee_name: str
    role_name: str | None

class PermissionOut(BaseModel):
    permission_id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RoleWithPermissionsDTO(BaseModel):
    role_id: int
    name: str
    description: str
    permissions: List[PermissionDTO]

    model_config = ConfigDict(from_attributes=True)

class RoleSyncDTO(BaseModel):
    role_id: int | None = None
    name: str
    description: str | None = None
    permission_names: List[str]

    model_config = ConfigDict(from_attributes=True)

class RolesSyncRequestDTO(BaseModel):
    roles: List[RoleSyncDTO]
    deleted_roles: List[str]

    model_config = ConfigDict(from_attributes=True)
class CreateEmployeeDTO(BaseModel):
    name: str
    email: EmailStr
    username: str
    phone: Optional[str]
    password: str
    role_id: int
    pay_rate: Optional[float]
    employment_type: Optional[str] = "hourly"
    preferences: Optional[Dict] = {}
    login_code: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
    def to_create_dict(self, restaurant_id: int, password_hash: str) -> dict:
        return {
            "restaurant_id": restaurant_id,
            "name": self.name,
            "email": self.email,
            "username": self.username,
            "phone": self.phone,
            "password_hash": password_hash,
            "hire_date": datetime.utcnow(),
            "is_active": True,
            "login_code": self.login_code,
            "pay_rate": self.pay_rate,
            "employment_type": self.employment_type,
            "preferences": self.preferences,
            "role_id": self.role_id,
        }

class UpdateEmployeeDTO(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    pay_rate: Optional[float] = None
    employment_type: Optional[str] = None
    preferences: Optional[Dict] = None
    is_active: Optional[bool] = None
    model_config = ConfigDict(from_attributes=True)

class EmployeeOutDTO(BaseModel):
    employee_id: int
    restaurant_id: int
    name: str
    email: str
    username: str
    phone: Optional[str] = None
    hire_date: Optional[datetime] = None
    is_active: Optional[bool] = True
    login_code: Optional[int] = None
    pay_rate: Optional[Decimal] = None
    employment_type: Optional[str] = None
    preferences: Optional[dict] = None
    role_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class RoleOutDTO(BaseModel):
    role_id: int
    name: str
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)


class DeleteRoleResponseDTO(BaseModel):
    detail: str
    model_config = ConfigDict(from_attributes=True)

# ---- Restaurants (re-export for section alignment) ----
class RestaurantBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantUpdate(RestaurantBase):
    pass

class Restaurant(RestaurantBase):
    restaurant_id: int
    model_config = ConfigDict(from_attributes=True)

# ---- Error Logs (admin-related utilities) ----
class ErrorLogBase(BaseModel):
    restaurant_id: int
    employee_id: Optional[int] = None
    message: str
    level: Optional[str] = None
    trace: Optional[str] = None
    source: Optional[str] = None
    created_at: Optional[str] = None


class ErrorLogCreate(ErrorLogBase):
    pass


class ErrorLogUpdate(ErrorLogBase):
    pass


class ErrorLog(ErrorLogBase):
    log_id: int
    model_config = ConfigDict(from_attributes=True)