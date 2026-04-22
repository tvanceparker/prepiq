import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from app.utils.security import SECRET_KEY


DEFAULT_CONFIRMATION_TTL_SECONDS = int(
    os.getenv("MCP_CONFIRMATION_TTL_SECONDS", "600")
)


def canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)


def payload_hash(data: Any) -> str:
    return hashlib.sha256(canonical_json(data).encode("utf-8")).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _secret() -> bytes:
    return os.getenv("MCP_CONFIRMATION_SECRET", SECRET_KEY).encode("utf-8")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def issue_confirmation_token(
    *,
    tool_name: str,
    restaurant_id: int,
    employee_id: int,
    payload_digest: str,
    risk_level: str,
    ttl_seconds: int = DEFAULT_CONFIRMATION_TTL_SECONDS,
) -> str:
    body = {
        "tool": tool_name,
        "restaurant_id": restaurant_id,
        "employee_id": employee_id,
        "payload_hash": payload_digest,
        "risk_level": risk_level,
        "exp": int(time.time()) + ttl_seconds,
    }
    encoded_body = _b64encode(canonical_json(body).encode("utf-8"))
    signature = hmac.new(
        _secret(),
        encoded_body.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_body}.{_b64encode(signature)}"


def verify_confirmation_token(
    token: str,
    *,
    tool_name: str,
    restaurant_id: int,
    employee_id: int,
    payload_digest: str,
) -> bool:
    try:
        encoded_body, encoded_signature = token.split(".", 1)
        expected_signature = hmac.new(
            _secret(),
            encoded_body.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        provided_signature = _b64decode(encoded_signature)
        if not hmac.compare_digest(expected_signature, provided_signature):
            return False

        body = json.loads(_b64decode(encoded_body).decode("utf-8"))
        if int(body.get("exp", 0)) < int(time.time()):
            return False

        return (
            body.get("tool") == tool_name
            and int(body.get("restaurant_id")) == int(restaurant_id)
            and int(body.get("employee_id")) == int(employee_id)
            and body.get("payload_hash") == payload_digest
        )
    except Exception:
        return False

