import functools
from fastapi import HTTPException
from app.core.logging import logger

def log_method(activity_name=None):
    """
    Async decorator to log entry, exit, and exceptions of a method.
    Does NOT call self.log_activity to avoid recursion.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            logger.info(f"[Service] Starting {activity_name or func.__name__}")
            try:
                result = await func(self, *args, **kwargs)
                logger.info(f"[Service] Completed {activity_name or func.__name__}")
                # Removed: await self.log_activity(...)
                return result
            except Exception as e:
                logger.error(f"[Service] Error in {activity_name or func.__name__}: {e}", exc_info=True)
                raise
        return wrapper
    return decorator


def log_sync_method(activity_name=None):
    """
    Sync version of log_method decorator for synchronous functions/methods.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            logger.info(f"Starting {activity_name or func.__name__}")
            try:
                result = func(self, *args, **kwargs)
                logger.info(f"Completed {activity_name or func.__name__}")
                return result
            except Exception as e:
                logger.error(f"Error in {activity_name or func.__name__}: {e}", exc_info=True)
                raise
        return wrapper
    return decorator

async def safe_log_activity(service_instance, action, details=None):
    """
    Helper to safely call log_activity on a service instance without raising
    if something goes wrong (to avoid disrupting main flow).
    """
    try:
        if hasattr(service_instance, "log_activity"):
            await service_instance.log_activity(action, details)
    except Exception as e:
        logger.error(f"Failed to log activity {action}: {e}", exc_info=True)


def log_route(name=None):
    """
    Decorator for FastAPI route handlers to log entry, exit, and uncaught exceptions.
    Automatically handles async routes. Re-raises HTTPExceptions and logs other errors.

    Args:
        name (str): Optional custom name for logging.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            route_name = name or func.__name__
            logger.info(f"[ROUTE] Start: {route_name}")
            try:
                result = await func(*args, **kwargs)
                logger.info(f"[ROUTE] Success: {route_name}")
                return result
            except HTTPException:
                # Let FastAPI handle it (e.g., 401, 404, etc.)
                logger.warning(f"[ROUTE] Handled HTTPException in {route_name}", exc_info=True)
                raise
            except Exception as e:
                logger.error(f"[ROUTE] Unhandled Exception in {route_name}: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Internal server error")
        return wrapper
    return decorator