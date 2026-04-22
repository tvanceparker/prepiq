from typing import Optional


def normalize_subscription_tier(tier: Optional[str]) -> Optional[str]:
    """Return the product-facing subscription tier.

    `pro` and `master` are deprecated persisted aliases that normalize to the
    current full tier while stored data is being migrated.
    """
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
