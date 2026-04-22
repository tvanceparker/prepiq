from typing import Optional


class MCPToolError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool = False,
        outcome_code: Optional[str] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.outcome_code = outcome_code or code


class MCPAuthenticationError(MCPToolError):
    def __init__(self, message: str = "Authentication is required."):
        super().__init__("unauthenticated", message)


class MCPPermissionError(MCPToolError):
    def __init__(self, message: str):
        super().__init__("permission_denied", message)


class MCPTierError(MCPToolError):
    def __init__(self, message: str):
        super().__init__("tier_unavailable", message)


class MCPValidationError(MCPToolError):
    def __init__(self, message: str):
        super().__init__("validation_failed", message)


class MCPConfirmationError(MCPToolError):
    def __init__(self, message: str = "Confirmation is required."):
        super().__init__("confirmation_required", message)


class MCPIdempotencyError(MCPToolError):
    def __init__(self, message: str):
        super().__init__("idempotency_conflict", message)


def normalize_error(exc: Exception) -> MCPToolError:
    if isinstance(exc, MCPToolError):
        return exc

    return MCPToolError(
        "execution_failed",
        "The MCP action failed before it could be completed.",
        retryable=False,
        outcome_code="execution_failed",
    )

