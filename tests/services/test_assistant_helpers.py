import pytest

from app.schemas.assistant_dto import AssistantRetrievalMode
from app.services.helpers.assistant_context_builder import AssistantContextBuilder
from app.services.helpers.assistant_indexing_service import AssistantIndexingService
from app.services.helpers.assistant_query_router import AssistantQueryRouter
from app.services.helpers.assistant_reranker import AssistantReranker


def test_reorder_status_query_routes_to_structured():
    mode = AssistantQueryRouter.classify("what do I need to reorder ttoday")

    assert mode == AssistantRetrievalMode.structured


def test_reorder_explanation_query_routes_to_blended():
    mode = AssistantQueryRouter.classify("how do you come up with how to reorder ingredients?")

    assert mode == AssistantRetrievalMode.blended


def test_policy_query_does_not_match_po_substring():
    mode = AssistantQueryRouter.classify("what policy docs exist?")

    assert mode == AssistantRetrievalMode.document


def test_purchase_order_suggestions_format_includes_items():
    builder = AssistantContextBuilder(db=None, restaurant_id=1, subscription_tier="full", employee_id=1)

    section = builder._format_purchase_order_suggestions(
        {
            "forecast_status": "ready",
            "forecast_status_message": "Using finalized EOD forecast.",
            "forecast_generated_at": "2026-04-22T08:00:00",
            "last_eod_run_date": "2026-04-21",
            "horizon_days": 7,
            "suggestions": [
                {
                    "supplier_id": 10,
                    "supplier_name": "Sawtooth Farms",
                    "items": [
                        {
                            "ingredient_name": "Salmon Fillet",
                            "supplier_name": "Sawtooth Farms",
                            "quantity_to_order": 12.5,
                            "unit": "lb",
                            "current_stock": 1.5,
                            "lead_demand": 7,
                            "shelf_demand": 10,
                            "packs_to_order": 2,
                            "line_total": 145.25,
                            "explanation": {
                                "summary": "Stock is below reorder point.",
                                "why_reorder": {"current_unit": "lb"},
                                "quantity_factors": {"quantity_per_pack": 6.25},
                                "supplier_factors": {
                                    "next_order_date": "2026-04-22",
                                    "next_delivery_date": "2026-04-24",
                                },
                                "assumption_flags": {"cadence_warnings": []},
                            },
                        }
                    ],
                }
            ],
        }
    )

    assert "Suggested items: 1" in section
    assert "Salmon Fillet: order 12.5 lb from Sawtooth Farms" in section
    assert "Current stock: 1.5 lb" in section
    assert "Reason: Stock is below reorder point." in section


def test_empty_purchase_order_suggestions_do_not_claim_no_action():
    builder = AssistantContextBuilder(db=None, restaurant_id=1, subscription_tier="full", employee_id=1)

    section = builder._format_purchase_order_suggestions(
        {
            "forecast_status": "failed",
            "forecast_status_message": "No finalized EOD forecast was available to reuse.",
            "suggestions": [],
            "all_items": [],
        }
    )

    assert "Suggested items: 0" in section
    assert "do not claim the restaurant has nothing to do" in section


def test_reorder_reranker_prefers_replenishment_docs():
    candidates = [
        {
            "path": "docs/API_SURFACES.md",
            "source_type": "docs",
            "heading_trail": ["API Surfaces", "Mounted Route Groups", "`/orders`"],
            "text": "Orders route supports creating and updating orders.",
            "retrieval_score": 0.5,
        },
        {
            "path": "docs/REPLENISHMENT_POLICY_ENGINE.md",
            "source_type": "docs",
            "heading_trail": ["Replenishment Policy Engine"],
            "text": "Reorder decisions use forecast demand, lead time, safety stock, supplier cadence, shelf life, and lots.",
            "retrieval_score": 0.3,
        },
    ]

    reranked = AssistantReranker().rerank("how do you reorder ingredients?", candidates, top_k=2)

    assert reranked[0]["path"] == "docs/REPLENISHMENT_POLICY_ENGINE.md"


@pytest.mark.asyncio
async def test_reindex_builtins_counts_changed_docs_even_with_warning(monkeypatch, tmp_path):
    docs_root = tmp_path / "docs"
    notes_root = tmp_path / "notes"
    docs_root.mkdir()
    notes_root.mkdir()
    (docs_root / "assistant.md").write_text("# Built-in assistant doc", encoding="utf-8")
    (notes_root / "operator.txt").write_text("Operator note", encoding="utf-8")

    service = AssistantIndexingService(db=None, restaurant_id=1, repo_root=str(tmp_path))

    async def fake_index_file_path(*, path, source_type, openai_client):
        if path.name == "assistant.md":
            return True, "Built-in document embeddings were rate-limited; using lexical retrieval."
        return True, None

    monkeypatch.setattr(service, "_index_file_path", fake_index_file_path)

    summary = await service.reindex_builtins(openai_client=object())

    assert summary["scanned_count"] == 2
    assert summary["indexed_count"] == 2
    assert summary["warning_count"] == 1
    assert len(summary["warnings"]) == 1
