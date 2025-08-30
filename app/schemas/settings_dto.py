from typing import Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

class RestaurantSettingsDTO(BaseModel):
    forecast_length: Annotated[int, Field(ge=3, le=30)]  # 3, 7, 14
    timezone: Optional[str] = None
    eod_run_when_closed: bool
    eod_run_after_close_mins: Annotated[Optional[int], Field(ge=0)] = 60
    sales_channels: Optional[List[str]] = ["in-house", "take-out"]
    # Optional geolocation for weather integrations
    latitude: Optional[Annotated[float, Field(ge=-90, le=90)]] = None
    longitude: Optional[Annotated[float, Field(ge=-180, le=180)]] = None
    # POS/Kitchen settings
    settings: Optional[Dict[str, Any]] = {}
    pos_mode: Optional[str] = "register"
    kitchen_mode: Optional[str] = "display_only"
    ui_layout_size: Optional[str] = "auto"

class UpdateRestaurantSettingsDTO(BaseModel):
    forecast_length: Optional[Annotated[int, Field(ge=3, le=30)]] = None
    timezone: Optional[str] = None
    eod_run_when_closed: Optional[bool] = None
    eod_run_after_close_mins: Optional[Annotated[int, Field(ge=0)]] = None
    sales_channels: Optional[List[str]] = None
    latitude: Optional[Annotated[float, Field(ge=-90, le=90)]] = None
    longitude: Optional[Annotated[float, Field(ge=-180, le=180)]] = None
    # POS/Kitchen settings
    settings: Optional[Dict[str, Any]] = None
    pos_mode: Optional[str] = None
    kitchen_mode: Optional[str] = None
    ui_layout_size: Optional[str] = None

# ---- Account Management ----
class ChangePasswordDTO(BaseModel):
    current_password: Annotated[str, Field(min_length=8)]
    new_password: Annotated[str, Field(min_length=8)]


class ChangeEmailDTO(BaseModel):
    current_password: Annotated[str, Field(min_length=8)]
    new_email: EmailStr


class ChangePhoneDTO(BaseModel):
    current_password: Annotated[str, Field(min_length=8)]
    new_phone: Annotated[str, Field(min_length=7, max_length=15)]


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
    restaurant_latitude: Optional[Annotated[float, Field(ge=-90, le=90)]] = None
    restaurant_longitude: Optional[Annotated[float, Field(ge=-180, le=180)]] = None

