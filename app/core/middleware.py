# app/core/middleware.py

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.logging import logger
from starlette.responses import Response
from jose import jwt, JWTError
from app.utils.security import SECRET_KEY, ALGORITHM

class AuthExtractionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                request.state.username = payload.get("sub")
                request.state.restaurant_id = int(payload.get("restaurant_id"))
                request.state.subscription_tier = payload.get("subscription_tier")

                logger.info(f"[Middleware] User: {request.state.username}, "
                      f"Restaurant ID: {request.state.restaurant_id}, "
                      f"Tier: {request.state.subscription_tier}")

            except JWTError as e:
                logger.warning(f"JWT Decode Failed: {e}")
                return Response("Invalid token", status_code=401)

        return await call_next(request)
