from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from typing import List, Optional
from app.core.logging import logger
from jose import JWTError, jwt
from app.utils.security import SECRET_KEY, ALGORITHM, verify_device_token
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models.role_permissions_orm import RolePermission
from app.db.models.permissions_orm import Permission
from app.services.utils.subscription_tiers import normalize_subscription_tier

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class CurrentUser:
    def __init__(self, username, restaurant_id, subscription_tier, employee_id, name, role_id: Optional[int]):
        self.username = username
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.name = name
        self.role_id = role_id
        logger.info(f"[Dependency] Constructing CurrentUser: {self.username}, {self.restaurant_id},\
                    {self.subscription_tier}, {self.employee_id}, {self.name}, {self.role_id}")

async def get_current_user(token: str = Depends(oauth2_scheme)):

    credentials_exception = HTTPException(status_code=401, detail="Invalid credentials")

    logger.info("[Dependency]Decoding JWT token in get_current_user dependency")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        restaurant_id = payload.get("restaurant_id")
        subscription_tier = normalize_subscription_tier(payload.get("subscription_tier"))
        employee_id = payload.get("employee_id")
        name = payload.get("name")
        role_id = payload.get("role_id")
        if None in (username, restaurant_id, employee_id, name):
            logger.warning("[Dependency]Missing claims in JWT token: "
                           f"username={username}, restaurant_id={restaurant_id}, "
                           f"employee_id={employee_id}, name={name}, role_id={role_id}")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"[Dependency]JWT decode error in get_current_user: {e}")
        raise credentials_exception
    logger.info(f"[Dependency]JWT Payload: {payload}")
    logger.info(f"[Dependency]Authenticated user '{username}' for restaurant_id {restaurant_id}")
    return CurrentUser(username, restaurant_id, subscription_tier, employee_id, name, role_id)


async def get_device_context(token: str = Depends(oauth2_scheme)):
    """Extract device info from device token"""
    credentials_exception = HTTPException(status_code=401, detail="Invalid device token")
    
    logger.info("[Dependency] Validating device token")
    try:
        payload = verify_device_token(token)
        if not payload:
            logger.warning("[Dependency] Invalid device token format")
            raise credentials_exception
            
        device_id = payload.get("device_id")
        device_type = payload.get("device_type")
        restaurant_id = payload.get("restaurant_id")
        fingerprint = payload.get("fingerprint")
        
        if not all([device_id, device_type, restaurant_id]):
            logger.warning("[Dependency] Missing required device claims")
            raise credentials_exception
            
        logger.info(f"[Dependency] Validated device {device_id} ({device_type}) for restaurant {restaurant_id}")
        return {
            "device_id": device_id,
            "device_type": device_type,
            "restaurant_id": restaurant_id,
            "fingerprint": fingerprint
        }
    except Exception as e:
        logger.error(f"[Dependency] Device token validation error: {e}")
        raise credentials_exception


def get_restaurant_id(current_user: CurrentUser = Depends(get_current_user)) -> int:
    logger.debug(f"[Dependency]Extracting restaurant_id {current_user.restaurant_id} from current_user")
    return current_user.restaurant_id

def check_roles(required_roles: List[str]):
    async def _check_roles(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required one of the roles: {', '.join(required_roles)}"
            )
    logger.info(f"[Dependency]Check Roles: {required_roles}")
    return _check_roles

def check_permissions(required_permissions: List[str]):
    async def _check_permissions(
        current_user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        if current_user.role_id is None:
            logger.info(
                f"[Dependency]Skipping permission check for user {current_user.username} "
                "because role_id is not present under the shared-access v1 model"
            )
            return

        logger.info(f"[Dependency]Checking permissions for user {current_user.username} "
                     f"(role_id={current_user.role_id}, restaurant_id={current_user.restaurant_id})")

        stmt = (
            select(RolePermission)
            .options(selectinload(RolePermission.permission))  # 👈 Eager load Permission
            .join(Permission)
            .filter(
                RolePermission.role_id == current_user.role_id,
                RolePermission.restaurant_id == current_user.restaurant_id,
                Permission.name.in_(required_permissions),
            )
        )
        result = await db.execute(stmt)
        role_perms = result.scalars().all()

        granted_permissions = [p.permission.name for p in role_perms]
        logger.info(f"[Dependency]User '{current_user.username}' role_id={current_user.role_id} "
                    f"restaurant_id={current_user.restaurant_id} has permissions {granted_permissions} "
                    f"required={required_permissions}")

        if not role_perms or len(granted_permissions) < len(required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(required_permissions)}",
            )

    return _check_permissions

def build_service(service_class):
    async def _get_service(
        db: AsyncSession = Depends(get_db),
        current_user: CurrentUser = Depends(get_current_user),
    ):
        logger.info(f"[Dependency]Building service instance for {service_class.__name__} "
                     f"for user {current_user.username}")
        return service_class(
            db=db,
            restaurant_id=current_user.restaurant_id,
            subscription_tier=current_user.subscription_tier,
            employee_id=current_user.employee_id,
        )
    return _get_service


def get_auth_service(db: AsyncSession = Depends(get_db)):
    from app.services.auth_service import AuthService
    logger.info("[Dependency]Providing AuthService instance")
    return AuthService(db=db)

# Dependency injections for services
from app.services.menu_service import MenuService
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService
from app.services.sales_forecast_service import SalesForecastService
from app.services.profit_analytics_service import ProfitAnalyticsService
from app.services.prep_service import PrepService
from app.services.eod_service import EODService
from app.services.admin_service import AdminService
from app.services.settings_service import SettingsService
from app.services.alerts_service import AlertsService
from app.services.team_service import TeamService
from app.services.order_service import OrderService
from app.services.assistant_service import AssistantService


get_menu_service = build_service(MenuService)
get_sales_forecast_service = build_service(SalesForecastService)
get_dashboard_service = build_service(DashboardService)
get_inventory_service = build_service(InventoryService)
get_profit_analytics_service = build_service(ProfitAnalyticsService)
get_prep_service = build_service(PrepService)
get_eod_service = build_service(EODService)
get_admin_service = build_service(AdminService)
get_settings_service = build_service(SettingsService)
get_alert_service = build_service(AlertsService)
get_team_service = build_service(TeamService)
get_order_service = build_service(OrderService)
get_assistant_service = build_service(AssistantService)
