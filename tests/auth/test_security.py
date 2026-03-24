from datetime import timedelta

from app.utils import security


def test_create_access_token_uses_hour_based_expiry(monkeypatch):
    monkeypatch.setattr(security, 'ACCESS_TOKEN_EXPIRE_HOURS', 8)
    monkeypatch.setattr(security, 'ACCESS_TOKEN_EXPIRE_DAYS', 30)

    _, expires_in = security.create_access_token({'sub': 'testuser'})

    assert expires_in == int(timedelta(hours=8).total_seconds())


def test_create_access_token_falls_back_to_day_expiry(monkeypatch):
    monkeypatch.setattr(security, 'ACCESS_TOKEN_EXPIRE_HOURS', 0)
    monkeypatch.setattr(security, 'ACCESS_TOKEN_EXPIRE_DAYS', 30)

    _, expires_in = security.create_access_token({'sub': 'testuser'})

    assert expires_in == int(timedelta(days=30).total_seconds())