from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_auth_service, get_current_user
from app.api.v1.auth_routes import router


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


def test_whoami_returns_same_payload_as_me(client):
    response = client.get("/api/v1/auth/whoami")

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "testuser"
    assert response.json()["permissions"] == ["view_dashboard", "manage_inventory"]


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