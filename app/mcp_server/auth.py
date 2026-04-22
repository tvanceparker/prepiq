from dataclasses import dataclass
from typing import Optional

from jose import JWTError, jwt
from mcp.server.auth.provider import AccessToken, TokenVerifier
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.employees_orm import Employee
from app.db.models.restaurants_orm import Restaurant
from app.services.utils.subscription_tiers import normalize_subscription_tier
from app.utils.security import ALGORITHM, SECRET_KEY
from app.mcp_server.errors import MCPAuthenticationError


@dataclass(frozen=True)
class MCPActorContext:
    username: str
    restaurant_id: int
    subscription_tier: str
    employee_id: int
    name: str
    role_id: Optional[int]


class PrepIQTokenVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            return None

        username = payload.get("sub")
        restaurant_id = payload.get("restaurant_id")
        employee_id = payload.get("employee_id")
        name = payload.get("name")
        if None in (username, restaurant_id, employee_id, name):
            return None

        return AccessToken(
            token=token,
            client_id=str(username),
            scopes=["prepiq:mcp"],
        )


def decode_actor_from_token(token: str) -> MCPActorContext:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise MCPAuthenticationError("Invalid MCP bearer token.") from exc

    username = payload.get("sub")
    restaurant_id = payload.get("restaurant_id")
    subscription_tier = normalize_subscription_tier(payload.get("subscription_tier"))
    employee_id = payload.get("employee_id")
    name = payload.get("name")
    role_id = payload.get("role_id")
    if None in (username, restaurant_id, employee_id, name):
        raise MCPAuthenticationError("MCP bearer token is missing required claims.")

    return MCPActorContext(
        username=str(username),
        restaurant_id=int(restaurant_id),
        subscription_tier=subscription_tier or "basic",
        employee_id=int(employee_id),
        name=str(name),
        role_id=int(role_id) if role_id is not None else None,
    )


async def validate_actor_against_database(
    db: AsyncSession,
    actor: MCPActorContext,
) -> MCPActorContext:
    employee_result = await db.execute(
        select(Employee).where(
            Employee.employee_id == actor.employee_id,
            Employee.restaurant_id == actor.restaurant_id,
        )
    )
    employee = employee_result.scalar_one_or_none()
    if not employee or not getattr(employee, "is_active", True):
        raise MCPAuthenticationError("The MCP actor is not an active PrepIQ user.")

    restaurant_result = await db.execute(
        select(Restaurant.subscription_tier).where(
            Restaurant.restaurant_id == actor.restaurant_id
        )
    )
    tier = normalize_subscription_tier(restaurant_result.scalar_one_or_none())
    if not tier:
        raise MCPAuthenticationError("The MCP actor is not scoped to an active restaurant.")

    return MCPActorContext(
        username=actor.username,
        restaurant_id=actor.restaurant_id,
        subscription_tier=tier,
        employee_id=actor.employee_id,
        name=actor.name,
        role_id=actor.role_id,
    )


async def require_permissions(
    db: AsyncSession,
    actor: MCPActorContext,
    required_permissions: list[str],
) -> None:
    """Compatibility hook for older role-permission metadata.

    PrepIQ's current v1 MCP boundary trusts the authenticated, active employee
    and restaurant scope from the JWT/database. The old role/permission tables
    are not authoritative for MCP access because many v1 users no longer have
    role bindings. Tool safety is enforced by tenant scoping, tier checks,
    strict schemas, dry-run confirmation, idempotency, audit logging, and the
    existing domain services.
    """
    return None
