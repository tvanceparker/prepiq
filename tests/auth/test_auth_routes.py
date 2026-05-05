from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt

from app.api.dependencies import CurrentUser, get_auth_service, get_current_user
from app.api.v1.auth_routes import router
from app.utils.security import ALGORITHM, SECRET_KEY, create_refresh_token


@pytest.fixture
def auth_test_app():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def current_user_override():
    return CurrentUser(
        username="testuser",
        restaurant_id=7,
        subscription_tier="pro",
        employee_id=42,
        name="Test User",
        role_id=3,
    )


@pytest.fixture
def auth_service_override():
    service = AsyncMock()

    mock_user = AsyncMock()
    mock_user.employee_id = 42
    mock_user.username = "testuser"
    mock_user.name = "Test User"
    mock_user.email = "testuser@example.com"

    service.get_current_user_info.return_value = (
        mock_user,
        ["view_dashboard", "manage_inventory"],
    )
    return service


@pytest.fixture
def client(auth_test_app, current_user_override, auth_service_override):
    auth_test_app.dependency_overrides[get_current_user] = lambda: current_user_override
    auth_test_app.dependency_overrides[get_auth_service] = lambda: auth_service_override

    with TestClient(auth_test_app) as test_client:
        yield test_client

    auth_test_app.dependency_overrides.clear()


def test_me_returns_current_user_and_permissions(client, auth_service_override):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json() == {
        "user": {
            "user_id": 42,
            "username": "testuser",
            "name": "Test User",
            "email": "testuser@example.com",
            "restaurant_id": 7,
            "role_id": 3,
            "subscription_tier": "pro",
        },
        "permissions": ["view_dashboard", "manage_inventory"],
    }
    auth_service_override.get_current_user_info.assert_awaited_once_with(42, 7, 3)


def test_login_returns_tokens_and_optional_role_id(auth_test_app):
    auth_service = AsyncMock()
    mock_user = AsyncMock()
    mock_user.username = "testuser"
    mock_user.restaurant_id = 7
    mock_user.employee_id = 42
    mock_user.name = "Test User"
    mock_user.preferences = {"theme": "light"}
    mock_user.role_id = None
    auth_service.authenticate_and_create_token.return_value = (
        mock_user,
        "access-token",
        "basic",
        2592000,
    )
    auth_test_app.dependency_overrides[get_auth_service] = lambda: auth_service

    with TestClient(auth_test_app) as test_client:
        response = test_client.post(
            "/api/v1/auth/login",
            data={"username": "testuser", "password": "secret"},
        )

    assert response.status_code == 200
    assert response.json()["access_token"] == "access-token"
    assert response.json()["role_id"] is None
    assert response.cookies.get("refresh_token") is not None
    auth_service.authenticate_and_create_token.assert_awaited_once_with("testuser", "secret")
    auth_test_app.dependency_overrides.clear()


def test_whoami_returns_same_payload_as_me(client):
    response = client.get("/api/v1/auth/whoami")

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "testuser"
    assert response.json()["permissions"] == ["view_dashboard", "manage_inventory"]


def test_me_returns_401_without_token(auth_test_app):
    with TestClient(auth_test_app) as test_client:
        response = test_client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_returns_401_when_user_missing(auth_test_app, current_user_override):
    auth_test_app.dependency_overrides[get_current_user] = lambda: current_user_override

    auth_service = AsyncMock()
    auth_service.get_current_user_info.return_value = (None, [])
    auth_test_app.dependency_overrides[get_auth_service] = lambda: auth_service

    with TestClient(auth_test_app) as test_client:
        response = test_client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "User not found"}
    auth_test_app.dependency_overrides.clear()


def test_me_returns_empty_permissions_when_role_id_missing(auth_test_app, auth_service_override):
    current_user = CurrentUser(
        username="testuser",
        restaurant_id=7,
        subscription_tier="basic",
        employee_id=42,
        name="Test User",
        role_id=None,
    )
    auth_test_app.dependency_overrides[get_current_user] = lambda: current_user

    mock_user = AsyncMock()
    mock_user.employee_id = 42
    mock_user.username = "testuser"
    mock_user.name = "Test User"
    mock_user.email = "testuser@example.com"

    auth_service = AsyncMock()
    auth_service.get_current_user_info.return_value = (mock_user, [])
    auth_test_app.dependency_overrides[get_auth_service] = lambda: auth_service

    with TestClient(auth_test_app) as test_client:
        response = test_client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["user"]["role_id"] is None
    assert response.json()["permissions"] == []
    auth_service.get_current_user_info.assert_awaited_once_with(42, 7, None)
    auth_test_app.dependency_overrides.clear()


def test_refresh_returns_401_without_refresh_cookie(auth_test_app):
    with TestClient(auth_test_app) as test_client:
        response = test_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json() == {"detail": "No refresh token found"}


def test_refresh_normalizes_legacy_full_tier_cookie(auth_test_app):
    refresh_token, _ = create_refresh_token(
        {
            "sub": "testuser",
            "restaurant_id": 7,
            "subscription_tier": "master",
            "employee_id": 42,
            "name": "Test User",
            "role_id": 3,
        }
    )

    with TestClient(auth_test_app) as test_client:
        test_client.cookies.set("refresh_token", refresh_token)
        response = test_client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    claims = jwt.decode(response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["subscription_tier"] == "full"


def test_logout_clears_refresh_cookie(auth_test_app, current_user_override):
    auth_test_app.dependency_overrides[get_current_user] = lambda: current_user_override

    auth_service = AsyncMock()
    auth_test_app.dependency_overrides[get_auth_service] = lambda: auth_service

    with TestClient(auth_test_app) as test_client:
        response = test_client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out user testuser"
    set_cookie_header = response.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie_header
    auth_service.logout.assert_awaited_once_with(42, 7, "testuser")
    auth_test_app.dependency_overrides.clear()