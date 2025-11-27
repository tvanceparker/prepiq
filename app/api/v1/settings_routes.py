from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.settings_service import SettingsService
from app.services.pos_integration_service import POSIntegrationService
from app.api.dependencies import get_settings_service, check_permissions, build_service
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


# ========== POS Integration Settings ==========

@router.get("/pos/oauth-url")
@log_route("Get POS OAuth URL")
async def get_pos_oauth_url(
    provider: str = Query(..., description="POS provider: square, toast, clover"),
    redirect_uri: str = Query(..., description="OAuth callback URL"),
    state: str = Query(..., description="CSRF state token"),
    pos_service: POSIntegrationService = Depends(build_service(POSIntegrationService))
):
    """
    Generate OAuth authorization URL for POS provider connection.
    Frontend should redirect user to this URL.
    """
    try:
        oauth_url = await pos_service.get_oauth_authorization_url(provider, redirect_uri, state)
        return {"oauth_url": oauth_url, "provider": provider}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pos/oauth-callback")
@log_route("POS OAuth Callback")
async def pos_oauth_callback(
    provider: str = Query(..., description="POS provider"),
    code: str = Query(..., description="Authorization code from OAuth"),
    redirect_uri: str = Query(..., description="OAuth redirect URI"),
    pos_service: POSIntegrationService = Depends(build_service(POSIntegrationService))
):
    """
    Complete OAuth flow after user grants access.
    This endpoint exchanges the authorization code for access tokens.
    """
    try:
        result = await pos_service.complete_oauth_flow(provider, code, redirect_uri)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[POS OAuth] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="OAuth flow failed")


@router.post("/pos/disconnect")
@log_route("Disconnect POS")
async def disconnect_pos(
    pos_service: POSIntegrationService = Depends(build_service(POSIntegrationService))
):
    """Disconnect current POS provider and revoke tokens."""
    result = await pos_service.disconnect_provider()
    return result


@router.get("/pos/sync-status")
@log_route("Get POS Sync Status")
async def get_pos_sync_status(
    pos_service: POSIntegrationService = Depends(build_service(POSIntegrationService))
):
    """Get current POS integration status and last sync info."""
    status_info = await pos_service.get_sync_status()
    return status_info


@router.post("/pos/sync-now")
@log_route("Trigger POS Sync")
async def trigger_pos_sync(
    days_back: int = Query(7, description="Number of days to sync backwards"),
    pos_service: POSIntegrationService = Depends(build_service(POSIntegrationService))
):
    """Manually trigger order sync from POS provider."""
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_back)
    
    result = await pos_service.sync_orders(start_date, end_date)
    return result


@router.get("/pos/mode")
@log_route("Get POS Mode Settings")
async def get_pos_mode_settings(
    settings_service: SettingsService = Depends(get_settings_service)
):
    """Get the current POS mode configuration for the restaurant."""
    return await settings_service.get_pos_mode_settings()


@router.put("/pos/mode")
@log_route("Update POS Mode Settings")
async def update_pos_mode_settings(
    pos_mode: str = Query(..., description="POS mode: internal or external"),
    pos_provider: str = Query(None, description="Provider for external mode: square, toast, clover"),
    cash_drawer_enabled: bool = Query(True, description="Enable cash drawer tracking"),
    settings_service: SettingsService = Depends(get_settings_service)
):
    """
    Update restaurant POS mode configuration.
    - internal: Use PrepIQ as the primary POS
    - external: Use external POS (Square, Toast, Clover)
    """
    return await settings_service.update_pos_mode_settings(
        pos_mode=pos_mode,
        pos_provider=pos_provider,
        cash_drawer_enabled=cash_drawer_enabled
    )


#-------------Role Permissions----------------------
