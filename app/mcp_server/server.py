import os
from functools import lru_cache

from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP

from app.mcp_server.auth import PrepIQTokenVerifier
from app.mcp_server.tools import register_tools


@lru_cache(maxsize=1)
def create_mcp_server() -> FastMCP:
    public_base_url = os.getenv("MCP_PUBLIC_BASE_URL", "http://localhost:8000/mcp")
    issuer_url = os.getenv("MCP_ISSUER_URL", "http://localhost:8000/api/v1/auth")
    mcp = FastMCP(
        "PrepIQ MCP",
        instructions=(
            "Use RAG and structured reads for planning. Use these tools only for "
            "validated PrepIQ business actions. The restaurant/tenant scope is "
            "always taken from the authenticated PrepIQ user; never ask for or "
            "accept a restaurant_id in tool input. High-risk tools must be "
            "dry-run first and replayed with the confirmation token."
        ),
        auth=AuthSettings(
            issuer_url=issuer_url,
            resource_server_url=public_base_url,
            required_scopes=["prepiq:mcp"],
        ),
        token_verifier=PrepIQTokenVerifier(),
        stateless_http=True,
        streamable_http_path="/",
    )
    register_tools(mcp)
    return mcp


def create_mcp_app():
    return create_mcp_server().streamable_http_app()
