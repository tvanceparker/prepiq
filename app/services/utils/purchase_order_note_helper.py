import json
from datetime import date
from typing import Any, Dict, List, Optional


def build_purchase_order_review_context(
    *,
    source_type: str,
    explanation_items: Optional[List[Dict[str, Any]]] = None,
    source_run_date: Optional[date] = None,
) -> Dict[str, Any]:
    return {
        "source_type": source_type,
        "source_run_date": source_run_date.isoformat() if source_run_date else None,
        "explanation_items": explanation_items or [],
    }


def build_purchase_order_explanation_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ingredient_id": item["ingredient_id"],
        "ingredient_name": item.get("ingredient_name") or f"Ingredient {item['ingredient_id']}",
        "supplier_id": item.get("supplier_id"),
        "supplier_name": item.get("supplier_name"),
        "quantity_to_order": item.get("quantity_to_order", item.get("total_quantity_ordered")),
        "packs_to_order": item.get("packs_to_order", item.get("suggested_packs_to_order")),
        "unit": item.get("unit", item.get("supplier_unit")),
        "line_total": item.get("line_total"),
        "lead_time_days": item.get("lead_time_days"),
        "lead_demand": item.get("lead_demand"),
        "shelf_demand": item.get("shelf_demand"),
        "explanation": item.get("explanation"),
    }


def serialize_purchase_order_notes(
    *,
    user_note: Optional[str] = None,
    system_note: Optional[str] = None,
    review_context: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    cleaned_user_note = (user_note or "").strip() or None
    cleaned_system_note = (system_note or "").strip() or None

    if not cleaned_user_note and not cleaned_system_note and not review_context:
        return None
    if cleaned_user_note and not cleaned_system_note and not review_context:
        return cleaned_user_note

    envelope = {
        "version": 1,
        "user_note": cleaned_user_note,
        "system_note": cleaned_system_note,
        "review_context": review_context,
    }
    return json.dumps(envelope, separators=(",", ":"))


def parse_purchase_order_notes(raw_notes: Optional[str]) -> Dict[str, Any]:
    if not raw_notes:
        return {"user_note": None, "system_note": None, "review_context": None}

    try:
        parsed = json.loads(raw_notes)
    except (TypeError, ValueError):
        return {"user_note": raw_notes, "system_note": None, "review_context": None}

    if not isinstance(parsed, dict) or parsed.get("version") != 1:
        return {"user_note": raw_notes, "system_note": None, "review_context": None}

    review_context = parsed.get("review_context")
    if not isinstance(review_context, dict):
        review_context = None

    return {
        "user_note": parsed.get("user_note"),
        "system_note": parsed.get("system_note"),
        "review_context": review_context,
    }