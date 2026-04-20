from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional


class ReorderLotProjectionHelper:
    @staticmethod
    def _to_decimal(value: Any) -> Decimal:
        if value is None:
            return Decimal("0.00")
        return Decimal(str(value)).quantize(Decimal("0.01"))

    @staticmethod
    def _sort_key(lot: Dict[str, Any]) -> Any:
        spoilage_expected_date = lot.get("spoilage_expected_date")
        delivery_date = lot.get("delivery_date")
        lot_id = lot.get("lot_id") or 0
        return (
            spoilage_expected_date is None,
            spoilage_expected_date or date.max,
            delivery_date or date.max,
            lot_id,
        )

    def project_usable_inventory(
        self,
        *,
        lots: List[Dict[str, Any]],
        projection_start_date: date,
        projection_end_date: date,
        daily_demand_points: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        if projection_end_date < projection_start_date:
            projection_end_date = projection_start_date

        demand_by_day: Dict[date, Decimal] = {}
        for demand_day, quantity in daily_demand_points or []:
            if not isinstance(demand_day, date):
                continue
            if demand_day < projection_start_date or demand_day > projection_end_date:
                continue
            demand_by_day[demand_day] = (
                demand_by_day.get(demand_day, Decimal("0.00")) + self._to_decimal(quantity)
            ).quantize(Decimal("0.01"))

        simulated_lots: List[Dict[str, Any]] = []
        total_quantity = Decimal("0.00")

        for lot in sorted(lots, key=self._sort_key):
            starting_quantity = self._to_decimal(lot.get("quantity"))
            if starting_quantity <= 0:
                continue

            simulated_lots.append(
                {
                    "lot_id": lot.get("lot_id"),
                    "delivery_date": lot.get("delivery_date"),
                    "spoilage_expected_date": lot.get("spoilage_expected_date"),
                    "starting_quantity": starting_quantity,
                    "remaining_quantity": starting_quantity,
                    "consumed_quantity": Decimal("0.00"),
                    "projected_waste_quantity": Decimal("0.00"),
                }
            )
            total_quantity += starting_quantity

        lot_consumption_trace: List[Dict[str, Any]] = []
        unmet_demand_quantity = Decimal("0.00")

        current_day = projection_start_date
        while current_day <= projection_end_date:
            for lot in simulated_lots:
                spoilage_expected_date = lot["spoilage_expected_date"]
                remaining_quantity = lot["remaining_quantity"]
                if remaining_quantity <= 0:
                    continue
                if (
                    spoilage_expected_date is not None
                    and spoilage_expected_date < current_day
                ):
                    lot["projected_waste_quantity"] += remaining_quantity
                    lot["remaining_quantity"] = Decimal("0.00")
                    lot_consumption_trace.append(
                        {
                            "date": current_day.isoformat(),
                            "lot_id": lot["lot_id"],
                            "action": "expired",
                            "quantity": remaining_quantity,
                            "remaining_quantity": Decimal("0.00"),
                        }
                    )

            demand_remaining = demand_by_day.get(current_day, Decimal("0.00"))
            if demand_remaining > 0:
                for lot in simulated_lots:
                    if demand_remaining <= 0:
                        break

                    spoilage_expected_date = lot["spoilage_expected_date"]
                    remaining_quantity = lot["remaining_quantity"]
                    if remaining_quantity <= 0:
                        continue
                    if (
                        spoilage_expected_date is not None
                        and spoilage_expected_date < current_day
                    ):
                        continue

                    consumed_quantity = min(remaining_quantity, demand_remaining).quantize(
                        Decimal("0.01")
                    )
                    if consumed_quantity <= 0:
                        continue

                    lot["remaining_quantity"] = (
                        remaining_quantity - consumed_quantity
                    ).quantize(Decimal("0.01"))
                    lot["consumed_quantity"] = (
                        lot["consumed_quantity"] + consumed_quantity
                    ).quantize(Decimal("0.01"))
                    demand_remaining = (demand_remaining - consumed_quantity).quantize(
                        Decimal("0.01")
                    )
                    lot_consumption_trace.append(
                        {
                            "date": current_day.isoformat(),
                            "lot_id": lot["lot_id"],
                            "action": "consume",
                            "quantity": consumed_quantity,
                            "remaining_quantity": lot["remaining_quantity"],
                        }
                    )

            unmet_demand_quantity += demand_remaining
            current_day += timedelta(days=1)

        for lot in simulated_lots:
            spoilage_expected_date = lot["spoilage_expected_date"]
            remaining_quantity = lot["remaining_quantity"]
            if remaining_quantity <= 0:
                continue
            if (
                spoilage_expected_date is not None
                and spoilage_expected_date <= projection_end_date
            ):
                lot["projected_waste_quantity"] += remaining_quantity
                lot["remaining_quantity"] = Decimal("0.00")
                lot_consumption_trace.append(
                    {
                        "date": spoilage_expected_date.isoformat(),
                        "lot_id": lot["lot_id"],
                        "action": "expired_after_window",
                        "quantity": remaining_quantity,
                        "remaining_quantity": Decimal("0.00"),
                    }
                )

        projected_waste_quantity = sum(
            (lot["projected_waste_quantity"] for lot in simulated_lots),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        projected_remaining_quantity = sum(
            (lot["remaining_quantity"] for lot in simulated_lots),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        projected_consumed_quantity = sum(
            (lot["consumed_quantity"] for lot in simulated_lots),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))

        lot_projection_summary = []
        eligible_lot_count = 0
        for lot in simulated_lots:
            usable_quantity = (
                lot["starting_quantity"] - lot["projected_waste_quantity"]
            ).quantize(Decimal("0.01"))
            if usable_quantity > 0:
                eligible_lot_count += 1

            lot_projection_summary.append(
                {
                    "lot_id": lot["lot_id"],
                    "delivery_date": lot["delivery_date"],
                    "spoilage_expected_date": lot["spoilage_expected_date"],
                    "starting_quantity": lot["starting_quantity"],
                    "consumed_quantity": lot["consumed_quantity"],
                    "projected_waste_quantity": lot["projected_waste_quantity"],
                    "remaining_quantity": lot["remaining_quantity"],
                    "usable_quantity": usable_quantity,
                }
            )

        projected_usable_quantity = (
            total_quantity - projected_waste_quantity
        ).quantize(Decimal("0.01"))

        return {
            "quantity": projected_usable_quantity,
            "total_quantity": total_quantity.quantize(Decimal("0.01")),
            "excluded_quantity": projected_waste_quantity,
            "projected_waste_quantity": projected_waste_quantity,
            "projected_remaining_quantity": projected_remaining_quantity,
            "projected_consumed_quantity": projected_consumed_quantity,
            "eligible_lot_count": eligible_lot_count,
            "lot_projection_summary": lot_projection_summary,
            "lot_consumption_trace": lot_consumption_trace,
            "fefo_applied": True,
            "projection_start_date": projection_start_date,
            "projection_end_date": projection_end_date,
            "unmet_demand_quantity": unmet_demand_quantity.quantize(Decimal("0.01")),
        }