from datetime import date

import pytest

from app.utils.replenishment_policy import (
    normalize_supplier_cadence_settings,
    normalize_weekday_codes,
    resolve_cadence,
)


def test_normalize_weekday_codes_accepts_mixed_aliases() -> None:
    assert normalize_weekday_codes("Monday, wed, friday") == ["mon", "wed", "fri"]


def test_normalize_supplier_cadence_requires_days_for_fixed_schedule() -> None:
    with pytest.raises(ValueError):
        normalize_supplier_cadence_settings(
            {
                "order_schedule_type": "fixed_days_of_week",
                "allowed_order_days": None,
            }
        )


def test_resolve_cadence_uses_delivery_schedule_and_review_gap() -> None:
    resolution = resolve_cadence(
        as_of_date=date(2026, 1, 5),
        lead_time_days=2,
        review_period_days=None,
        order_schedule_type="fixed_days_of_week",
        allowed_order_days=["wed"],
        allowed_delivery_days=["fri"],
    )

    assert resolution.next_order_date == date(2026, 1, 7)
    assert resolution.next_delivery_date == date(2026, 1, 9)
    assert resolution.review_period_days == 7
    assert resolution.protection_window_days == 11


def test_resolve_cadence_for_every_n_days_uses_review_period() -> None:
    resolution = resolve_cadence(
        as_of_date=date(2026, 1, 5),
        lead_time_days=2,
        review_period_days=3,
        order_schedule_type="every_n_days",
    )

    assert resolution.next_order_date == date(2026, 1, 8)
    assert resolution.next_delivery_date == date(2026, 1, 10)
    assert resolution.review_period_days == 3
    assert resolution.protection_window_days == 8