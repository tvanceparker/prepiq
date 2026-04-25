from dataclasses import dataclass
from typing import Awaitable, Callable

from mcp.server.auth.middleware.auth_context import get_access_token
from pydantic import BaseModel

from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.mcp_server.auth import (
    MCPActorContext,
    decode_actor_from_token,
    require_permissions,
    validate_actor_against_database,
)
from app.mcp_server.confirmation import (
    issue_confirmation_token,
    payload_hash,
    token_hash,
    verify_stored_confirmation_token,
    verify_confirmation_token,
)
from app.mcp_server.errors import (
    MCPAuthenticationError,
    MCPConfirmationError,
    MCPIdempotencyError,
    MCPTierError,
    MCPToolError,
    normalize_error,
)
from app.mcp_server.rag import RAGPreflightContextAdapter
from app.mcp_server.service_adapters import MCPServiceAdapters, jsonable
from app.repositories.mcp_action_audit_repo import MCPActionAuditRepository
from app.services.utils.subscription_tiers import is_full_service_tier


@dataclass(frozen=True)
class ToolSpec:
    name: str
    permissions: tuple[str, ...]
    full_tier_required: bool = False
    confirmation_required: bool = False
    risk_level: str = "standard"


def business_payload(payload: BaseModel) -> dict:
    return payload.model_dump(
        mode="json",
        exclude={
            "dry_run",
            "confirmation_token",
            "operator_intent",
            "include_rag_context",
        },
        exclude_none=True,
    )


def result_ok(
    *,
    tool_name: str,
    audit_id: int | None,
    status: str,
    data: dict | list | None = None,
    confirmation_token: str | None = None,
    rag_context: dict | None = None,
    idempotent_replay: bool = False,
) -> dict:
    return {
        "ok": True,
        "tool": tool_name,
        "status": status,
        "audit_id": audit_id,
        "idempotent_replay": idempotent_replay,
        "requires_confirmation": bool(confirmation_token),
        "confirmation_token": confirmation_token,
        "data": data,
        "rag_context": rag_context,
        "error": None,
    }


def result_error(
    *,
    tool_name: str,
    audit_id: int | None,
    error: MCPToolError,
) -> dict:
    return {
        "ok": False,
        "tool": tool_name,
        "status": "failed",
        "audit_id": audit_id,
        "idempotent_replay": False,
        "requires_confirmation": error.code == "confirmation_required",
        "confirmation_token": None,
        "data": None,
        "rag_context": None,
        "error": {
            "code": error.code,
            "message": error.message,
            "retryable": error.retryable,
        },
    }


def _raw_token_from_context(raw_token: str | None = None) -> str:
    if raw_token:
        return raw_token
    access_token = get_access_token()
    if not access_token:
        raise MCPAuthenticationError()
    return access_token.token


def _status_for_error(error: MCPToolError) -> str:
    if error.code in {"permission_denied", "tier_unavailable", "unauthenticated"}:
        return "denied"
    if error.code == "confirmation_required":
        return "requires_confirmation"
    return "failed"


async def execute_mcp_action(
    spec: ToolSpec,
    payload: BaseModel,
    adapter_call: Callable[[MCPServiceAdapters], Awaitable[dict]],
    *,
    raw_token: str | None = None,
) -> dict:
    audit_id: int | None = None
    actor: MCPActorContext | None = None
    payload_body = business_payload(payload)
    digest = payload_hash(payload_body)

    try:
        token = _raw_token_from_context(raw_token)
        actor = decode_actor_from_token(token)

        async with AsyncSessionLocal() as db:
            actor = await validate_actor_against_database(db, actor)
            audit_repo = MCPActionAuditRepository(db, actor.restaurant_id)
            existing = await audit_repo.get_by_idempotency_key(
                tool_name=spec.name,
                idempotency_key=payload.idempotency_key,
            )
            if existing:
                audit_id = existing.audit_id

            if existing and existing.payload_hash != digest:
                raise MCPIdempotencyError(
                    "This idempotency_key was already used with a different payload."
                )

            if existing and existing.status == "succeeded":
                await db.commit()
                return result_ok(
                    tool_name=spec.name,
                    audit_id=existing.audit_id,
                    status="succeeded",
                    data=existing.result_summary,
                    idempotent_replay=True,
                )

            if existing and existing.status not in {
                "started",
                "dry_run",
                "requires_confirmation",
            }:
                raise MCPIdempotencyError(
                    "This idempotency_key is tied to a completed failed or denied attempt. Use a new key."
                )

            audit = existing or await audit_repo.create(
                {
                    "employee_id": actor.employee_id,
                    "tool_name": spec.name,
                    "idempotency_key": payload.idempotency_key,
                    "payload_hash": digest,
                    "status": "started",
                    "risk_level": spec.risk_level,
                    "requires_confirmation": spec.confirmation_required,
                    "input_summary": payload_body,
                }
            )
            audit_id = audit.audit_id
            await db.commit()

            try:
                await require_permissions(db, actor, list(spec.permissions))
                if spec.full_tier_required and not is_full_service_tier(actor.subscription_tier):
                    raise MCPTierError(f"{spec.name} is only available for the full tier.")

                adapters = MCPServiceAdapters(db, actor)
                preflight = await adapters.preflight(spec.name, payload)
                rag_context = None
                if getattr(payload, "include_rag_context", False) and getattr(payload, "operator_intent", None):
                    rag_context = await RAGPreflightContextAdapter(
                        db,
                        restaurant_id=actor.restaurant_id,
                        subscription_tier=actor.subscription_tier,
                        employee_id=actor.employee_id,
                    ).build(
                        query=payload.operator_intent,
                        target_tool=spec.name,
                        include_documents=False,
                    )
                await db.commit()

                if getattr(payload, "dry_run", False):
                    confirmation = None
                    confirmation_digest = None
                    if spec.confirmation_required:
                        confirmation = issue_confirmation_token(
                            tool_name=spec.name,
                            restaurant_id=actor.restaurant_id,
                            employee_id=actor.employee_id,
                            payload_digest=digest,
                            risk_level=spec.risk_level,
                        )
                        confirmation_digest = token_hash(confirmation)
                    dry_run_result = {
                        "preview": payload_body,
                        "preflight": preflight,
                        "will_execute": False,
                    }
                    await audit_repo.mark(
                        audit_id,
                        status="requires_confirmation" if confirmation else "dry_run",
                        outcome_code="dry_run",
                        result_summary=dry_run_result,
                        confirmation_token_hash=confirmation_digest,
                    )
                    await db.commit()
                    return result_ok(
                        tool_name=spec.name,
                        audit_id=audit_id,
                        status="requires_confirmation" if confirmation else "dry_run",
                        data=dry_run_result,
                        confirmation_token=confirmation,
                        rag_context=rag_context,
                    )

                if spec.confirmation_required:
                    confirmation_token = getattr(payload, "confirmation_token", None)
                    if not confirmation_token:
                        raise MCPConfirmationError(
                            "Run this MCP tool with dry_run=true first, then replay with the returned confirmation_token."
                        )
                    token_is_valid = verify_confirmation_token(
                        confirmation_token,
                        tool_name=spec.name,
                        restaurant_id=actor.restaurant_id,
                        employee_id=actor.employee_id,
                        payload_digest=digest,
                    )
                    if (
                        not token_is_valid
                        and existing
                        and existing.status == "requires_confirmation"
                        and int(existing.employee_id or 0) == int(actor.employee_id)
                    ):
                        token_is_valid = verify_stored_confirmation_token(
                            confirmation_token,
                            expected_token_hash=existing.confirmation_token_hash,
                        )
                    if not token_is_valid:
                        raise MCPConfirmationError("The confirmation_token is invalid or expired.")

                await db.commit()
                result = jsonable(await adapter_call(adapters))
                await db.commit()
                await audit_repo.mark(
                    audit_id,
                    status="succeeded",
                    outcome_code="succeeded",
                    result_summary=result,
                    completed=True,
                )
                await db.commit()
                return result_ok(
                    tool_name=spec.name,
                    audit_id=audit_id,
                    status="succeeded",
                    data=result,
                    rag_context=rag_context,
                )

            except Exception as exc:
                await db.rollback()
                error = normalize_error(exc)
                logger.warning(
                    "[MCP] Tool failed tool=%s audit_id=%s code=%s message=%s",
                    spec.name,
                    audit_id,
                    error.code,
                    error.message,
                    exc_info=not isinstance(exc, MCPToolError),
                )
                await audit_repo.mark(
                    audit_id,
                    status=_status_for_error(error),
                    outcome_code=error.outcome_code,
                    error_code=error.code,
                    error_message=error.message,
                    completed=error.code != "confirmation_required",
                )
                await db.commit()
                return result_error(tool_name=spec.name, audit_id=audit_id, error=error)

    except Exception as exc:
        error = normalize_error(exc)
        logger.warning(
            "[MCP] Tool rejected before audit tool=%s code=%s message=%s",
            spec.name,
            error.code,
            error.message,
            exc_info=not isinstance(exc, MCPToolError),
        )
        return result_error(tool_name=spec.name, audit_id=audit_id, error=error)


async def execute_mcp_query(
    spec: ToolSpec,
    payload: BaseModel,
    adapter_call: Callable[[MCPServiceAdapters], Awaitable[dict | list]],
    *,
    raw_token: str | None = None,
) -> dict:
    try:
        token = _raw_token_from_context(raw_token)
        actor = decode_actor_from_token(token)
        async with AsyncSessionLocal() as db:
            actor = await validate_actor_against_database(db, actor)
            await require_permissions(db, actor, list(spec.permissions))
            if spec.full_tier_required and not is_full_service_tier(actor.subscription_tier):
                raise MCPTierError(f"{spec.name} is only available for the full tier.")

            adapters = MCPServiceAdapters(db, actor)
            rag_context = None
            if getattr(payload, "include_rag_context", False) and getattr(payload, "operator_intent", None):
                rag_context = await RAGPreflightContextAdapter(
                    db,
                    restaurant_id=actor.restaurant_id,
                    subscription_tier=actor.subscription_tier,
                    employee_id=actor.employee_id,
                ).build(
                    query=payload.operator_intent,
                    target_tool=spec.name,
                    include_documents=False,
                )
            result = jsonable(await adapter_call(adapters))
            await db.commit()
            return result_ok(
                tool_name=spec.name,
                audit_id=None,
                status="succeeded",
                data=result,
                rag_context=rag_context,
            )
    except Exception as exc:
        error = normalize_error(exc)
        logger.warning(
            "[MCP] Query failed tool=%s code=%s message=%s",
            spec.name,
            error.code,
            error.message,
            exc_info=not isinstance(exc, MCPToolError),
        )
        return result_error(tool_name=spec.name, audit_id=None, error=error)


async def execute_rag_preflight(payload, *, raw_token: str | None = None) -> dict:
    try:
        token = _raw_token_from_context(raw_token)
        actor = decode_actor_from_token(token)
        async with AsyncSessionLocal() as db:
            actor = await validate_actor_against_database(db, actor)
            context = await RAGPreflightContextAdapter(
                db,
                restaurant_id=actor.restaurant_id,
                subscription_tier=actor.subscription_tier,
                employee_id=actor.employee_id,
            ).build(
                query=payload.query,
                target_tool=payload.target_tool,
                include_documents=payload.include_documents,
            )
            await db.commit()
            return {
                "ok": True,
                "tool": "prepare_action_context",
                "status": "succeeded",
                "data": context,
                "error": None,
            }
    except Exception as exc:
        error = normalize_error(exc)
        return {
            "ok": False,
            "tool": "prepare_action_context",
            "status": "failed",
            "data": None,
            "error": {
                "code": error.code,
                "message": error.message,
                "retryable": error.retryable,
            },
        }
