from typing import Optional, List, Dict, Any
from pydantic import BaseModel, conint, condecimal, EmailStr, constr, Field
from enum import Enum

class RestaurantSettingsDTO(BaseModel):
    forecast_length: conint(ge=3, le=30)  # 3, 7, 14
    timezone: Optional[str] = None
    eod_run_when_closed: bool
    eod_run_after_close_mins: Optional[conint(ge=0)] = 60
    sales_channels: Optional[List[str]] = ["in-house", "take-out"]
    # Optional geolocation for weather integrations
    latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None
    longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None

class UpdateRestaurantSettingsDTO(BaseModel):
    forecast_length: Optional[conint(ge=3, le=30)]
    timezone: Optional[str]
    eod_run_when_closed: Optional[bool]
    eod_run_after_close_mins: Optional[conint(ge=0)]
    sales_channels: Optional[List[str]]
    latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None
    longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None

# ---- Account Management ----
class ChangePasswordDTO(BaseModel):
    current_password: constr(min_length=8)
    new_password: constr(min_length=8)


class ChangeEmailDTO(BaseModel):
    current_password: constr(min_length=8)
    new_email: EmailStr


class ChangePhoneDTO(BaseModel):
    current_password: constr(min_length=8)
    new_phone: constr(min_length=7, max_length=15)


# ---- Preferences Management ----
# --- Theme Enum ---
class ThemeMode(str, Enum):
    light = "light"
    dark = "dark"
    system = "system"


# --- Returned to client (GET) ---
class PreferencesDTO(BaseModel):
    auto_logout_minutes: int = Field(..., example=15)
    theme: ThemeMode = Field(..., example="light")


# --- Used in update route (PUT) ---
class UpdatePreferencesDTO(BaseModel):
    auto_logout_minutes: int = Field(..., example=15, le=120)
    theme: ThemeMode = Field(..., example="dark")

class AccountInfoDTO(BaseModel):
    name: str
    role: Optional[str]
    email: str
    phone: Optional[str]
    preferences: Optional[Dict[str, Any]] = {}
    restaurant_name: Optional[str]
    # Expose restaurant coords so UI can show location or weather availability
    restaurant_latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None
    restaurant_longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None

