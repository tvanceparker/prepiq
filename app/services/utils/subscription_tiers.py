from typing import Optional


def normalize_subscription_tier(tier: Optional[str]) -> Optional[str]:
    if tier is None:
        return None

    normalized = tier.strip().lower()
    if normalized == "basic":
        return "basic"
    if normalized in {"full", "pro", "master"}:
        return "full"
    return normalized or None


def is_full_service_tier(tier: Optional[str]) -> bool:
    return normalize_subscription_tier(tier) == "full"