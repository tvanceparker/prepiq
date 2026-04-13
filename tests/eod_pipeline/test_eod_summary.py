from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.eod_service import EODService


class TestEODRunSummary:
    @pytest.mark.asyncio
    async def test_get_eod_run_summary_returns_success_with_counts(
        self,
        mock_db_session,
        restaurant_id,
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        run_date = date.today()

        ledger = MagicMock(
            run_date=run_date,
            running=False,
            finalized=True,
            started_at=datetime.utcnow() - timedelta(minutes=4),
            finished_at=datetime.utcnow(),
            sales_deducted=True,
            forecast_completed=True,
            reorder_completed=True,
            po_written=True,
            durations={
                "sales_deducted": 1200,
                "forecast_completed": 2300,
                "reorder_completed": 800,
                "po_written": 600,
            },
            errors=[],
        )
        forecast_ledger = MagicMock(
            finalized=True,
            finished_at=datetime.utcnow(),
            errors=[],
            menu_items_processed=14,
        )
        discrepancy = MagicMock(
            alert_id=11,
            ingredient_id=401,
            batch_recipe_id=None,
            item_name="Tomatoes",
            message="Insufficient inventory for ingredient 401",
            shortfall_quantity=Decimal("4.25"),
            unit="lb",
        )

        service.ledger_repo.get_latest = AsyncMock(return_value=ledger)
        service.forecast_run_ledger_repo.get_one_by = AsyncMock(return_value=forecast_ledger)
        service.po_suggestion_repo.list_by_run_date = AsyncMock(return_value=[MagicMock(), MagicMock(), MagicMock()])
        service.discrepancy_repo.get_open_by_reference = AsyncMock(return_value=[discrepancy])
        service.inventory_usage_log_repo.count_for_reference = AsyncMock(return_value=9)
        service.purchase_order_repo.count_eod_auto_orders_for_run_date = AsyncMock(return_value=2)

        summary = await service.get_eod_run_summary()

        assert summary is not None
        assert summary["is_historical"] is False
        assert summary["status"] == "success"
        assert summary["forecast"]["forecast_status"] == "ready"
        assert summary["forecast"]["forecast_authority"] == "finalized_eod"
        assert summary["forecast"]["forecast_usage_action"] == "allow"
        assert summary["downstream"]["forecast_action"] == "allow"
        assert summary["downstream"]["reorder_action"] == "review"
        assert summary["downstream"]["purchase_orders_action"] == "review"
        assert "manual review" in summary["downstream"]["message"].lower()
        assert summary["counts"]["sales_usage_log_count"] == 9
        assert summary["counts"]["forecast_menu_items_processed"] == 14
        assert summary["counts"]["purchase_order_suggestion_count"] == 3
        assert summary["counts"]["purchase_orders_created"] == 2
        assert summary["counts"]["open_discrepancy_count"] == 1
        assert summary["repair_targets"][0]["ingredient_id"] == 401
        assert summary["guidance"]["headline"] == "The run finished, but there is follow-up work before you close the loop."
        assert any("Inventory Review" in step for step in summary["guidance"]["steps"])
        assert any("draft purchase orders" in step for step in summary["guidance"]["steps"])

    @pytest.mark.asyncio
    async def test_get_eod_run_summary_marks_partial_and_degraded_forecast(
        self,
        mock_db_session,
        restaurant_id,
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        run_date = date.today() - timedelta(days=1)

        ledger = MagicMock(
            run_date=run_date,
            running=False,
            finalized=True,
            started_at=datetime.utcnow() - timedelta(minutes=6),
            finished_at=datetime.utcnow() - timedelta(minutes=1),
            sales_deducted=True,
            forecast_completed=True,
            reorder_completed=True,
            po_written=False,
            durations={},
            errors=[{"stage": "po_write", "message": "Supplier record missing", "ts": datetime.utcnow().isoformat()}],
        )
        forecast_ledger = MagicMock(
            finalized=True,
            finished_at=datetime.utcnow() - timedelta(minutes=2),
            errors=[{"stage": "forecast", "message": "Recovered with fallback"}],
            menu_items_processed=5,
        )

        service.ledger_repo.get_latest = AsyncMock(return_value=ledger)
        service.forecast_run_ledger_repo.get_one_by = AsyncMock(return_value=forecast_ledger)
        service.po_suggestion_repo.list_by_run_date = AsyncMock(return_value=[])
        service.discrepancy_repo.get_open_by_reference = AsyncMock(return_value=[])
        service.inventory_usage_log_repo.count_for_reference = AsyncMock(return_value=0)
        service.purchase_order_repo.count_eod_auto_orders_for_run_date = AsyncMock(return_value=0)

        summary = await service.get_eod_run_summary()

        assert summary is not None
        assert summary["is_historical"] is False
        assert summary["status"] == "partial"
        assert summary["forecast"]["forecast_status"] == "degraded"
        assert summary["forecast"]["forecast_authority"] == "finalized_eod"
        assert summary["forecast"]["forecast_usage_action"] == "review"
        assert summary["downstream"]["forecast_action"] == "review"
        assert summary["downstream"]["reorder_action"] == "review"
        assert summary["downstream"]["purchase_orders_action"] == "block"
        assert "blocked" in summary["downstream"]["message"].lower()
        assert summary["errors"][0]["stage"] == "po_write"
        assert summary["counts"]["open_discrepancy_count"] == 0
        assert summary["guidance"]["headline"] == "Manual review is required before trusting every downstream output."
        assert any("provisional" in step for step in summary["guidance"]["steps"])
        assert any("purchase-order creation errors" in step for step in summary["guidance"]["steps"])

    @pytest.mark.asyncio
    async def test_get_eod_run_summary_marks_historical_run_for_review(
        self,
        mock_db_session,
        restaurant_id,
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        latest_run_date = date.today()
        historical_run_date = latest_run_date - timedelta(days=2)

        latest_ledger = MagicMock(run_date=latest_run_date)
        historical_ledger = MagicMock(
            run_date=historical_run_date,
            running=False,
            finalized=True,
            started_at=datetime.utcnow() - timedelta(minutes=5),
            finished_at=datetime.utcnow() - timedelta(minutes=1),
            sales_deducted=True,
            forecast_completed=True,
            reorder_completed=True,
            po_written=True,
            durations={},
            errors=[],
        )
        forecast_ledger = MagicMock(
            finalized=True,
            finished_at=datetime.utcnow() - timedelta(minutes=2),
            errors=[],
            menu_items_processed=6,
        )

        service.ledger_repo.get_latest = AsyncMock(return_value=latest_ledger)
        service.ledger_repo.get_by_date = AsyncMock(return_value=historical_ledger)
        service.forecast_run_ledger_repo.get_one_by = AsyncMock(return_value=forecast_ledger)
        service.po_suggestion_repo.list_by_run_date = AsyncMock(return_value=[MagicMock()])
        service.discrepancy_repo.get_open_by_reference = AsyncMock(return_value=[])
        service.inventory_usage_log_repo.count_for_reference = AsyncMock(return_value=4)
        service.purchase_order_repo.count_eod_auto_orders_for_run_date = AsyncMock(return_value=1)

        summary = await service.get_eod_run_summary(run_date=historical_run_date)

        assert summary is not None
        assert summary["is_historical"] is True
        assert summary["status"] == "success"
        assert summary["status_message"] == "Historical EOD run finalized successfully."
        assert summary["forecast"]["forecast_status"] == "ready"
        assert summary["forecast"]["forecast_usage_action"] == "review"
        assert "historical business date" in (summary["forecast"]["forecast_usage_message"] or "")
        assert summary["downstream"]["forecast_action"] == "review"
        assert summary["downstream"]["reorder_action"] == "review"
        assert summary["downstream"]["purchase_orders_action"] == "review"
        assert "historical downstream outputs" in summary["downstream"]["message"].lower()
        assert "Historical outputs are available" in summary["guidance"]["headline"]
        assert any("historical record" in step for step in summary["guidance"]["steps"])