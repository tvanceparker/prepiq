from app.services.utils.unit_conversion import convert_unit, normalize_unit


VALID_COMPONENT_TYPES = {"ingredient", "batch", "recipe"}
BATCH_COMPONENT_TYPES = {"ingredient", "batch"}


def normalize_component_type(component_type: str | None) -> str:
    normalized = (component_type or "ingredient").strip().lower()
    if normalized not in VALID_COMPONENT_TYPES:
        raise ValueError(
            f"Unsupported ingredient_type '{component_type}'. Expected one of: ingredient, batch, recipe."
        )
    return normalized


def normalize_batch_component_type(component_type: str | None) -> str:
    normalized = normalize_component_type(component_type)
    if normalized not in BATCH_COMPONENT_TYPES:
        raise ValueError(
            "Batch recipe components only support ingredient or batch references."
        )
    return normalized


def units_are_compatible(candidate_unit: str | None, source_unit: str | None) -> bool:
    if not candidate_unit or not source_unit:
        return True

    normalized_candidate = normalize_unit(candidate_unit)
    normalized_source = normalize_unit(source_unit)

    if normalized_candidate == normalized_source:
        return True

    for from_unit, to_unit in (
        (normalized_candidate, normalized_source),
        (normalized_source, normalized_candidate),
    ):
        try:
            convert_unit(1, from_unit, to_unit)
            return True
        except ValueError:
            continue

    return False