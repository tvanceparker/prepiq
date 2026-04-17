from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional, Sequence


POLICY_TYPES = {
    "fresh_perishable",
    "stable_stocked",
    "recipe_dependent",
    "intermittent_low_turn",
}
POLICY_ASSIGNMENT_MODES = {"system", "manual"}
ORDER_SCHEDULE_TYPES = {"ad_hoc", "fixed_days_of_week", "every_n_days"}
CADENCE_SOURCES = {"manual", "inferred", "default"}

_DAY_ALIASES = {
    "mon": "mon",
    "monday": "mon",
    "tue": "tue",
    "tues": "tue",
    "tuesday": "tue",
    "wed": "wed",
    "wednesday": "wed",
    "thu": "thu",
    "thur": "thu",
    "thurs": "thu",
    "thursday": "thu",
    "fri": "fri",
    "friday": "fri",
    "sat": "sat",
    "saturday": "sat",
    "sun": "sun",
    "sunday": "sun",
}
_WEEKDAY_TO_INDEX = {
    "mon": 0,
    "tue": 1,
    "wed": 2,
    "thu": 3,
    "fri": 4,
    "sat": 5,
    "sun": 6,
}


def _coerce_blank(value):
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
    return value


def _normalize_choice(value, *, field_name: str, allowed_values: set[str]) -> Optional[str]:
    value = _coerce_blank(value)
    if value is None:
        return None

    normalized_value = str(value).strip().lower()
    if normalized_value not in allowed_values:
        allowed = ", ".join(sorted(allowed_values))
        raise ValueError(f"{field_name} must be one of: {allowed}")

    return normalized_value


def _coerce_optional_int(value, *, field_name: str, minimum: int = 0) -> Optional[int]:
    value = _coerce_blank(value)
    if value is None:
        return None

    coerced = int(value)
    if coerced < minimum:
        raise ValueError(f"{field_name} must be greater than or equal to {minimum}")

    return coerced


def _coerce_optional_float(
    value,
    *,
    field_name: str,
    minimum: float = 0.0,
    maximum: Optional[float] = None,
) -> Optional[float]:
    value = _coerce_blank(value)
    if value is None:
        return None

    coerced = float(value)
    if coerced < minimum:
        raise ValueError(f"{field_name} must be greater than or equal to {minimum}")
    if maximum is not None and coerced > maximum:
        raise ValueError(f"{field_name} must be less than or equal to {maximum}")

    return coerced


def normalize_policy_type(value) -> Optional[str]:
    return _normalize_choice(
        value,
        field_name="policy_type",
        allowed_values=POLICY_TYPES,
    )


def normalize_policy_assignment_mode(value) -> Optional[str]:
    return _normalize_choice(
        value,
        field_name="policy_assignment_mode",
        allowed_values=POLICY_ASSIGNMENT_MODES,
    )


def normalize_order_schedule_type(value) -> Optional[str]:
    return _normalize_choice(
        value,
        field_name="order_schedule_type",
        allowed_values=ORDER_SCHEDULE_TYPES,
    )


def normalize_cadence_source(value) -> Optional[str]:
    return _normalize_choice(
        value,
        field_name="cadence_source",
        allowed_values=CADENCE_SOURCES,
    )


def normalize_weekday_codes(value) -> Optional[list[str]]:
    value = _coerce_blank(value)
    if value is None:
        return None

    raw_values: Sequence = value.split(",") if isinstance(value, str) else value
    normalized_values: list[str] = []
    seen_values: set[str] = set()
    invalid_values: list[str] = []

    for raw_value in raw_values:
        raw_value = _coerce_blank(raw_value)
        if raw_value is None:
            continue

        normalized_value = _DAY_ALIASES.get(str(raw_value).strip().lower())
        if normalized_value is None:
            invalid_values.append(str(raw_value))
            continue

        if normalized_value not in seen_values:
            normalized_values.append(normalized_value)
            seen_values.add(normalized_value)

    if invalid_values:
        raise ValueError(
            "Invalid weekday values: " + ", ".join(sorted(invalid_values))
        )

    return normalized_values or None


def normalize_ingredient_policy_settings(payload: dict) -> dict:
    normalized: dict = {}

    if "policy_type" in payload:
        normalized["policy_type"] = normalize_policy_type(payload.get("policy_type"))
    if "policy_assignment_mode" in payload:
        normalized["policy_assignment_mode"] = normalize_policy_assignment_mode(
            payload.get("policy_assignment_mode")
        )
    if "target_service_level" in payload:
        normalized["target_service_level"] = _coerce_optional_float(
            payload.get("target_service_level"),
            field_name="target_service_level",
            minimum=0.0,
            maximum=0.9999,
        )
    if "service_level_z" in payload:
        normalized["service_level_z"] = _coerce_optional_float(
            payload.get("service_level_z"),
            field_name="service_level_z",
            minimum=0.0,
        )
    if "policy_override_reason" in payload:
        normalized["policy_override_reason"] = _coerce_blank(
            payload.get("policy_override_reason")
        )

    policy_type = normalized.get(
        "policy_type",
        normalize_policy_type(payload.get("policy_type"))
        if "policy_type" in payload
        else None,
    )
    policy_assignment_mode = normalized.get(
        "policy_assignment_mode",
        normalize_policy_assignment_mode(payload.get("policy_assignment_mode"))
        if "policy_assignment_mode" in payload
        else None,
    )
    target_service_level = normalized.get(
        "target_service_level",
        _coerce_optional_float(
            payload.get("target_service_level"),
            field_name="target_service_level",
            minimum=0.0,
            maximum=0.9999,
        )
        if "target_service_level" in payload
        else None,
    )
    service_level_z = normalized.get(
        "service_level_z",
        _coerce_optional_float(
            payload.get("service_level_z"),
            field_name="service_level_z",
            minimum=0.0,
        )
        if "service_level_z" in payload
        else None,
    )
    policy_override_reason = normalized.get(
        "policy_override_reason",
        _coerce_blank(payload.get("policy_override_reason"))
        if "policy_override_reason" in payload
        else None,
    )

    has_policy_metadata = any(
        value is not None
        for value in (
            policy_assignment_mode,
            target_service_level,
            service_level_z,
            policy_override_reason,
        )
    )
    if policy_type is None and has_policy_metadata:
        raise ValueError(
            "policy_type is required when policy assignment or service-level settings are provided"
        )
    if policy_type is not None and target_service_level is None and service_level_z is None:
        raise ValueError(
            "target_service_level or service_level_z is required when policy_type is set"
        )

    return normalized


def normalize_supplier_cadence_settings(payload: dict) -> dict:
    normalized: dict = {}

    if "review_period_days" in payload:
        normalized["review_period_days"] = _coerce_optional_int(
            payload.get("review_period_days"),
            field_name="review_period_days",
        )
    if "order_schedule_type" in payload:
        normalized["order_schedule_type"] = normalize_order_schedule_type(
            payload.get("order_schedule_type")
        )
    if "allowed_order_days" in payload:
        normalized["allowed_order_days"] = normalize_weekday_codes(
            payload.get("allowed_order_days")
        )
    if "allowed_delivery_days" in payload:
        normalized["allowed_delivery_days"] = normalize_weekday_codes(
            payload.get("allowed_delivery_days")
        )
    if "cadence_source" in payload:
        normalized["cadence_source"] = normalize_cadence_source(
            payload.get("cadence_source")
        )
    if "cadence_confidence_score" in payload:
        normalized["cadence_confidence_score"] = _coerce_optional_float(
            payload.get("cadence_confidence_score"),
            field_name="cadence_confidence_score",
            minimum=0.0,
            maximum=1.0,
        )

    order_schedule_type = normalized.get(
        "order_schedule_type",
        normalize_order_schedule_type(payload.get("order_schedule_type")),
    )
    allowed_order_days = normalized.get(
        "allowed_order_days",
        normalize_weekday_codes(payload.get("allowed_order_days")),
    )
    if order_schedule_type == "fixed_days_of_week" and not allowed_order_days:
        raise ValueError(
            "allowed_order_days is required when order_schedule_type is fixed_days_of_week"
        )

    return normalized


@dataclass(frozen=True)
class CadenceResolution:
    order_schedule_type: str
    review_period_days: int
    allowed_order_days: tuple[str, ...]
    allowed_delivery_days: tuple[str, ...]
    next_order_date: Optional[date]
    next_delivery_date: Optional[date]
    days_until_next_order: int
    protection_window_days: int
    warnings: tuple[str, ...]


def _next_matching_date(anchor_date: date, weekday_codes: Sequence[str]) -> Optional[date]:
    if not weekday_codes:
        return None

    target_indexes = {_WEEKDAY_TO_INDEX[code] for code in weekday_codes}
    for day_offset in range(0, 8):
        candidate = anchor_date + timedelta(days=day_offset)
        if candidate.weekday() in target_indexes:
            return candidate
    return None


def resolve_cadence(
    *,
    as_of_date: Optional[date],
    lead_time_days: Optional[int],
    review_period_days: Optional[int] = None,
    order_schedule_type: Optional[str] = None,
    allowed_order_days: Optional[Sequence[str] | str] = None,
    allowed_delivery_days: Optional[Sequence[str] | str] = None,
) -> CadenceResolution:
    today = as_of_date or date.today()
    warnings: list[str] = []

    normalized_order_schedule_type = normalize_order_schedule_type(order_schedule_type)
    normalized_order_days = tuple(normalize_weekday_codes(allowed_order_days) or [])
    normalized_delivery_days = tuple(normalize_weekday_codes(allowed_delivery_days) or [])

    normalized_review_period = _coerce_optional_int(
        review_period_days,
        field_name="review_period_days",
    ) or 0
    normalized_lead_time = max(int(lead_time_days or 0), 0)

    if normalized_order_schedule_type is None:
        warnings.append(
            "no supplier cadence schedule configured; treating cadence as ad_hoc"
        )
        normalized_order_schedule_type = (
            "fixed_days_of_week" if normalized_order_days else "ad_hoc"
        )

    if normalized_order_schedule_type == "fixed_days_of_week" and not normalized_order_days:
        warnings.append(
            "fixed_days_of_week schedule requires allowed_order_days; falling back to ad_hoc"
        )
        normalized_order_schedule_type = "ad_hoc"

    if normalized_order_schedule_type == "fixed_days_of_week":
        next_order_date = _next_matching_date(today, normalized_order_days)
        next_review_anchor = _next_matching_date(
            (next_order_date or today) + timedelta(days=1),
            normalized_order_days,
        )
        if next_order_date and next_review_anchor:
            normalized_review_period = max(
                normalized_review_period,
                (next_review_anchor - next_order_date).days,
            )
        else:
            normalized_review_period = max(normalized_review_period, 7)
    elif normalized_order_schedule_type == "every_n_days":
        normalized_review_period = max(normalized_review_period, 1)
        next_order_date = today + timedelta(days=normalized_review_period)
    else:
        next_order_date = today

    next_delivery_date = next_order_date + timedelta(days=normalized_lead_time)
    if normalized_delivery_days:
        next_delivery_date = _next_matching_date(next_delivery_date, normalized_delivery_days)

    days_until_next_order = max((next_order_date - today).days, 0)
    delivery_gap_days = max((next_delivery_date - next_order_date).days, normalized_lead_time)
    protection_window_days = (
        days_until_next_order + delivery_gap_days + normalized_review_period
    )

    return CadenceResolution(
        order_schedule_type=normalized_order_schedule_type,
        review_period_days=normalized_review_period,
        allowed_order_days=normalized_order_days,
        allowed_delivery_days=normalized_delivery_days,
        next_order_date=next_order_date,
        next_delivery_date=next_delivery_date,
        days_until_next_order=days_until_next_order,
        protection_window_days=protection_window_days,
        warnings=tuple(warnings),
    )