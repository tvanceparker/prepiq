from pydantic import BaseModel, Field
from typing import Optional, List

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type, usually bearer")

class Preferences(BaseModel):
    auto_logout_minutes: Optional[int] = Field(None, description="Auto logout in minutes")
    theme: Optional[str] = Field("light", description="Theme preference")

class UserInfo(BaseModel):
    user_id: int = Field(..., description="Employee ID")
    username: str = Field(..., description="Employee username")
    name: str = Field(..., description="Employee name")
    email: Optional[str] = Field(None, description="Employee email")
    restaurant_id: int = Field(..., description="ID of the restaurant")
    role_id: Optional[int] = Field(None, description="Role ID when role-based access is in use")
    subscription_tier: str = Field(..., description="Subscription tier")

class LoginResponse(TokenResponse):
    message: str = Field(..., description="Login success message")
    restaurant_id: int = Field(..., description="ID of the restaurant")
    subscription_tier: str = Field(..., description="Subscription tier")
    employee_id: int = Field(..., description="ID of employee")
    name: str = Field(..., description="Employee name")
    preferences: Preferences = Field(..., description="User preferences")
    role_id: Optional[int] = Field(None, description="Role ID when role-based access is in use")
    expires_in: int = Field(..., description="Token expiry time in seconds")

class MeResponse(BaseModel):
    user: UserInfo = Field(..., description="Current user information")
    permissions: List[str] = Field(default_factory=list, description="List of user permissions")

class LogoutResponse(BaseModel):
    message: str = Field(..., description="Logout success message")
    timestamp: str = Field(..., description="UTC timestamp of logout")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Employee username")
    password: str = Field(..., description="Employee password")

class StandardResponse(BaseModel):
    message: str = Field(..., description="Response message")
    timestamp: str = Field(..., description="UTC timestamp")
    success: bool = Field(default=True, description="Success flag")

class DeviceRegistrationRequest(BaseModel):
    device_name: str = Field(..., description="Human-readable device name")
    device_type: str = Field(..., description="Device type: pos_terminal, kitchen_display, mobile")
    device_fingerprint: str = Field(..., description="Unique device fingerprint")
    restaurant_id: int = Field(..., description="Restaurant ID")


class DeviceRegistrationResponse(BaseModel):
    device_id: int = Field(..., description="Unique device ID")
    device_token: str = Field(..., description="JWT device token")
    device_type: str = Field(..., description="Device type")

class RefreshTokenResponse(TokenResponse):
    expires_in: int = Field(..., description="Token expiry time in seconds")
