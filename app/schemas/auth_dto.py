from pydantic import BaseModel, Field
from typing import Optional

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type, usually bearer")

class Preferences(BaseModel):
    auto_logout_minutes: Optional[int] = Field(None, description="Auto logout in minutes")
    theme: Optional[str] = Field("light", description="Theme preference")

class LoginResponse(TokenResponse):
    message: str = Field(..., description="Login success message")
    restaurant_id: int = Field(..., description="ID of the restaurant")
    subscription_tier: str = Field(..., description="Subscription tier")
    employee_id: int = Field(..., description="ID of employee")
    name: str = Field(..., description="Employee name")
    preferences: Preferences = Field(..., description="User preferences")
    role: str = Field(...,description="The role for Permissions")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Employee username")
    password: str = Field(..., description="Employee password")
