from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.utils.security import verify_password, create_access_token
from app.utils.logger_helpers import log_method
from app.core.logging import logger
from datetime import datetime
class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.employees_repo = EmployeeRepository(db)
    # Don't change this log activity it needs to be different
    async def log_activity(self, action: str, details: str | None = None, restaurant_id=None, employee_id=None):
        # For login, we pass restaurant_id and employee_id explicitly
        if not restaurant_id or not employee_id:
            # If missing, we can't log activity meaningfully
            return

        activity_log_repo = ActivityLogRepository(self.db, restaurant_id, employee_id)
        try:
            await activity_log_repo.create({
                "action": action,
                "details": details,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to log activity '{action}': {e}", exc_info=True)

    @log_method("Authenticate and create token")
    async def authenticate_and_create_token(self, username: str, password: str):
        raw_username = username
        username = username.strip()
        if not username:
            logger.warning("Login attempt with empty username (after trim)")
            return None, None, None
        user = await self.employees_repo.get_by_username(username)
        if not user or not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt for username: {username} (raw input: '{raw_username}')")
            return None, None, None
        

        await self.log_activity(
            "User Login",
            f"User {username} logged in",
            restaurant_id=user.restaurant_id,
            employee_id=user.employee_id
        )
        # Now that we have restaurant_id from user, instantiate restaurant repo
        restaurant_repo = RestaurantRepository(self.db, user.restaurant_id)
        subscription_tier = await restaurant_repo.get_subscription_tier()

        token = create_access_token(data={
            "sub": user.username,
            "restaurant_id": user.restaurant_id,
            "subscription_tier": subscription_tier,
            "employee_id": user.employee_id,
            "name": user.name,
            "role_id": user.role_id if user.role_id else None,
        })


        return user, token, subscription_tier
