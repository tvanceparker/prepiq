# app/core/middleware.py

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.logging import logger
from jose import jwt, JWTError
from app.utils.security import SECRET_KEY, ALGORITHM
from app.services.utils.subscription_tiers import normalize_subscription_tier


class AuthExtractionMiddleware(BaseHTTPMiddleware):
    """
    Best-effort JWT extraction middleware.

    Decodes the Bearer token and populates ``request.state`` when valid.
    Does **not** reject requests on its own — route-level dependencies
    (``get_current_user`` / ``check_permissions``) enforce authentication so
    that error responses go through FastAPI's response pipeline and carry
    proper CORS headers.
    """

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                request.state.username = payload.get("sub")
                request.state.restaurant_id = int(payload.get("restaurant_id"))
                request.state.subscription_tier = normalize_subscription_tier(
                    payload.get("subscription_tier")
                )

                logger.info(
                    f"[Middleware] User: {request.state.username}, "
                    f"Restaurant ID: {request.state.restaurant_id}, "
                    f"Tier: {request.state.subscription_tier}"
                )

            except JWTError as e:
                # Don't block the request — let route dependencies return a
                # proper 401 HTTPException with CORS headers so the browser
                # (and the Axios refresh interceptor) can read the response.
                logger.warning(f"[Middleware] JWT decode skipped ({e})")

        return await call_next(request)
