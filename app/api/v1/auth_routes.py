from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from datetime import datetime

from app.api.dependencies import get_auth_service, get_current_user, CurrentUser
from app.services.auth_service import AuthService
from app.utils.security import create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM
from app.schemas.auth_dto import LoginResponse, DeviceRegistrationRequest, DeviceRegistrationResponse, MeResponse, LogoutResponse, RefreshTokenResponse
from app.utils.logger_helpers import log_route
from app.services.utils.subscription_tiers import normalize_subscription_tier

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse, summary="Login and get access token")
@log_route("login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    user, access_token, subscription_tier, expires_in = await auth_service.authenticate_and_create_token(
        form_data.username, form_data.password
    )

    if not user or not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    refresh_token, refresh_expires_in = create_refresh_token({
        "sub": user.username,
        "restaurant_id": user.restaurant_id,
        "subscription_tier": subscription_tier,
        "employee_id": user.employee_id,
        "name": user.name,
        "role_id": user.role_id if user.role_id else None,
    })
    preferences = user.preferences if user.preferences else {}

    response = JSONResponse(content={
        "message": f"Successfully logged in as {user.username}",
        "restaurant_id": user.restaurant_id,
        "subscription_tier": subscription_tier,
        "employee_id": user.employee_id,
        "name": user.name,
        "preferences": preferences,
        "access_token": access_token,
        "role_id": user.role_id if user.role_id else None,
        "token_type": "bearer",
        "expires_in": expires_in,
    })

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # True in prod with HTTPS
        samesite="lax",
        max_age=refresh_expires_in,
    )

    return response


@router.post("/refresh", response_model=RefreshTokenResponse, summary="Get a new access token")
@log_route("refresh_token")
async def refresh_token(request: Request):
    refresh_token_cookie = request.cookies.get("refresh_token")

    if not refresh_token_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token found")

    try:
        payload = jwt.decode(refresh_token_cookie, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    subscription_tier = normalize_subscription_tier(payload.get("subscription_tier")) or "basic"

    new_token, expires_in = create_access_token({
        "sub": payload["sub"],
        "restaurant_id": payload["restaurant_id"],
        "subscription_tier": subscription_tier,
        "employee_id": payload.get("employee_id"),
        "name": payload.get("name"),
        "role_id": payload.get("role_id")
    })

    return {"access_token": new_token, "token_type": "bearer", "expires_in": expires_in}


from pydantic import BaseModel
from typing import Optional

@router.post("/register-device", response_model=DeviceRegistrationResponse)
@log_route("Register Device")
async def register_device(
    registration: DeviceRegistrationRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Register a new device and return device token"""
    return await auth_service.register_device(
        registration.device_name,
        registration.device_type,
        registration.device_fingerprint,
        registration.restaurant_id
    )


@router.get("/me", response_model=MeResponse, summary="Get current user info and permissions")
@router.get("/whoami", response_model=MeResponse, summary="Get current user info and permissions")
@log_route("get_current_user")
async def get_me(current_user: CurrentUser = Depends(get_current_user), auth_service: AuthService = Depends(get_auth_service)):
    """Retrieve current authenticated user info and permissions"""
    user, permissions = await auth_service.get_current_user_info(
        current_user.employee_id,
        current_user.restaurant_id,
        current_user.role_id
    )
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return {
        "user": {
            "user_id": user.employee_id,
            "username": user.username,
            "name": user.name,
            "email": getattr(user, "email", None),
            "restaurant_id": current_user.restaurant_id,
            "role_id": current_user.role_id,
            "subscription_tier": current_user.subscription_tier,
        },
        "permissions": permissions
    }


@router.post("/logout", response_model=LogoutResponse, summary="Logout user")
@log_route("logout")
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Logout the current user"""
    await auth_service.logout(
        current_user.employee_id,
        current_user.restaurant_id,
        current_user.username
    )
    
    response = JSONResponse(content={
        "message": f"Successfully logged out user {current_user.username}",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Clear refresh token cookie
    response.delete_cookie("refresh_token")
    
    return response
