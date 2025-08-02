from fastapi import APIRouter, Depends, HTTPException, status
from app.services.settings_service import SettingsService
from app.api.dependencies import get_settings_service, check_permissions
from app.schemas.settings_dto import (RestaurantSettingsDTO, UpdateRestaurantSettingsDTO, 
                                      ChangePasswordDTO, ChangeEmailDTO, ChangePhoneDTO,
                                        PreferencesDTO, UpdatePreferencesDTO, AccountInfoDTO,
                                         )
from app.utils.logger_helpers import log_route
from app.core.logging import logger
from app.utils.security import verify_password, get_password_hash

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/restaurant_settings", response_model=RestaurantSettingsDTO)
@log_route("Get Restaurant Settings")
async def get_settings(settings_service: SettingsService = Depends(get_settings_service)):
    return await settings_service.get_restaurant_settings()

@router.put("/restaurant_settings", response_model=RestaurantSettingsDTO,
            dependencies=[Depends(check_permissions(["restaurant_settings"]))])
@log_route("Update Restaurant Settings")
async def update_settings(
    settings_dto: UpdateRestaurantSettingsDTO,
    settings_service: SettingsService = Depends(get_settings_service)
):
    await settings_service.update_restaurant_settings(settings_dto)
    return await settings_service.get_restaurant_settings()

# --- Password ---
@router.post("/change_password")
@log_route("Change Password")
async def change_password(
    dto: ChangePasswordDTO,
    service: SettingsService = Depends(get_settings_service)
):
    await service.change_password(dto.current_password, dto.new_password)
    return {"detail": "Password updated successfully"}


# --- Email ---
@router.post("/change_email")
@log_route("Change Email")
async def change_email(
    dto: ChangeEmailDTO,
    service: SettingsService = Depends(get_settings_service)
):
    await service.change_email(dto.current_password, dto.new_email)
    return {"detail": "Email updated successfully"}


# --- Phone ---
@router.post("/change_phone")
@log_route("Change Phone")
async def change_phone(
    dto: ChangePhoneDTO,
    service: SettingsService = Depends(get_settings_service)
):
    await service.change_phone(dto.current_password, dto.new_phone)
    return {"detail": "Phone number updated successfully"}


@router.put("/preferences", response_model=PreferencesDTO)
@log_route("Update Preferences")
async def update_preferences(
    dto: UpdatePreferencesDTO,
    service: SettingsService = Depends(get_settings_service)
):
    # Convert DTO to dict and pass to service
    return await service.update_preferences(dto.dict())


@router.get("/account-info", response_model=AccountInfoDTO)
@log_route("Get Account Info")
async def get_account_info(
    service = Depends(get_settings_service),
):
    try:
        info = await service.get_employee_account_info()
        return AccountInfoDTO(**info)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


#-------------Role Permissions----------------------
