from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError

from app.api.dependencies import get_auth_service
from app.services.auth_service import AuthService
from app.utils.security import create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM
from app.schemas.auth_dto import LoginResponse, DeviceRegistrationRequest, DeviceRegistrationResponse
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse, summary="Login and get access token")
@log_route("login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    user, access_token, subscription_tier = await auth_service.authenticate_and_create_token(
        form_data.username, form_data.password
    )

    if not user or not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    refresh_token = create_refresh_token({
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
    })

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # True in prod with HTTPS
        samesite="lax",
        max_age=30 * 24 * 3600,
    )

    return response


@router.post("/refresh", summary="Get a new access token")
@log_route("refresh_token")
async def refresh_token(request: Request):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token found")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_token = create_access_token({
        "sub": payload["sub"],
        "restaurant_id": payload["restaurant_id"],
        "subscription_tier": payload["subscription_tier"],
        "employee_id": payload.get("employee_id"),
        "name": payload.get("name"),
        "role_id": payload.get("role_id")
    }, expires_delta=timedelta(minutes=15))

    return {"access_token": new_token, "token_type": "bearer"}


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
