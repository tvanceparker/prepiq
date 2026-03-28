from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.eod_purchase_order_suggestion_orm import EODPurchaseOrderSuggestion
from app.repositories.base_repository import BaseRepository


class EODPurchaseOrderSuggestionRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(
            db,
            EODPurchaseOrderSuggestion,
            restaurant_id,
            pk_field="suggestion_id",
        )

    async def list_by_run_date(self, run_date) -> List[EODPurchaseOrderSuggestion]:
        stmt = (
            select(EODPurchaseOrderSuggestion)
            .where(
                EODPurchaseOrderSuggestion.restaurant_id == self.restaurant_id,
                EODPurchaseOrderSuggestion.run_date == run_date,
            )
            .order_by(
                EODPurchaseOrderSuggestion.supplier_id,
                EODPurchaseOrderSuggestion.ingredient_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def replace_for_run_date(
        self,
        run_date,
        suggestions: List[Dict[str, Any]],
    ) -> List[EODPurchaseOrderSuggestion]:
        await self.db.execute(
            delete(EODPurchaseOrderSuggestion).where(
                EODPurchaseOrderSuggestion.restaurant_id == self.restaurant_id,
                EODPurchaseOrderSuggestion.run_date == run_date,
            )
        )

        created: List[EODPurchaseOrderSuggestion] = []
        for suggestion in suggestions:
            row = EODPurchaseOrderSuggestion(
                restaurant_id=self.restaurant_id,
                run_date=run_date,
                supplier_id=suggestion["supplier_id"],
                ingredient_id=suggestion["ingredient_id"],
                ingredient_supplier_id=suggestion["ingredient_supplier_id"],
                lead_demand=Decimal(str(suggestion.get("lead_demand", 0))),
                shelf_demand=Decimal(str(suggestion.get("shelf_demand", 0))),
                forecast_unit=suggestion.get("forecast_unit"),
                converted_quantity_needed=Decimal(
                    str(suggestion.get("converted_quantity_needed", 0))
                ),
                suggested_packs_to_order=int(
                    suggestion.get("suggested_packs_to_order", 0) or 0
                ),
                total_quantity_ordered=Decimal(
                    str(suggestion.get("total_quantity_ordered", 0))
                ),
                supplier_unit=suggestion.get("supplier_unit") or "count",
                inventory_unit=suggestion.get("inventory_unit"),
                lead_time_days=int(suggestion.get("lead_time_days", 0) or 0),
                shelf_life_days=int(suggestion.get("shelf_life_days", 0) or 0),
                pack_size=int(suggestion.get("pack_size", 1) or 1),
                quantity_per_pack_item=Decimal(
                    str(suggestion.get("quantity_per_pack_item", 1))
                ),
                min_order_quantity=Decimal(
                    str(suggestion.get("min_order_quantity", 0))
                ),
            )
            self.db.add(row)
            created.append(row)

        await self.db.flush()
        return created

    async def mark_written_for_supplier(
        self,
        run_date,
        supplier_id: int,
        purchase_order_id: int,
    ) -> None:
        rows = await self.list_by_run_date(run_date)
        written_at = datetime.utcnow()
        for row in rows:
            if row.supplier_id != supplier_id:
                continue
            row.purchase_order_id = purchase_order_id
            row.written_at = written_at
        await self.db.flush()
