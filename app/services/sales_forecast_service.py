from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.sales_repo import SalesRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.repositories.forecast_accuracy_repo import ForecastAccuracyRepository
from app.repositories.forecast_breakdown_repo import ForecastBreakdownRepository
from app.repositories.daily_forecast_accuracy_repo import (
    DailyForecastAccuracyRepository,
)
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.schemas.sales_forecast_dto import SaleUpdateDTO, SaleCreateDTO
from typing import List, Dict, Optional, Literal, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from collections import defaultdict
import asyncio
from app.utils.logger_helpers import log_method
from app.core.logging import logger 
import json


class SalesForecastService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.sale_repo = SalesRepository(db, restaurant_id)
        self.menu_repo = MenuItemRepository(db, restaurant_id)
        self.forecast_repo = ForecastRepository(db, restaurant_id)
        self.forecast_accuracy_repo = ForecastAccuracyRepository(db, restaurant_id)
        self.forecast_breakdown_repo = ForecastBreakdownRepository(db, restaurant_id)
        self.daily_forecast_accuracy_repo = DailyForecastAccuracyRepository(
            db, restaurant_id
        )
        self.activity_log_repo = ActivityLogRepository(db,restaurant_id,employee_id)

    async def log_activity(self, action: str, details: Any = None):
        """
        Create an activity log entry safely.
        Converts details to JSON string if possible, else uses str().
        Adds timestamp to the log.
        """
        try:
            if details is None:
                details_str = ""
            else:
                try:
                    details_str = json.dumps(details, default=lambda o: o.__dict__, indent=2)
                except (TypeError, ValueError):
                    details_str = str(details)

            log_entry = {
                "action": action,
                "details": details_str,
                "created_at": datetime.utcnow().isoformat() + "Z"
            }

            await self.activity_log_repo.create(log_entry)
            logger.info(f"Activity logged: {action}")
        except Exception as e:
            logger.error(f"Failed to log activity '{action}': {e}", exc_info=True)


    #BASIC UPCOMING FORECAST
    @log_method("Get Upcoming Forecast Table(Basic)")
    async def get_upcoming_forecast_table_basic(self, start_date: date, end_date: date):
        forecast_rows = await self.forecast_breakdown_repo.get_latest_by_date_range(start_date, end_date)

        # Step 1: Get unique menu item IDs
        menu_item_ids = list({row.menu_item_id for row in forecast_rows})

        # Step 2: Batch fetch menu items
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)

        # Step 3: Build lookup
        menu_lookup = {item.menu_item_id: item for item in menu_items if getattr(item, "is_active", True)}

        # Step 4: Aggregate results
        agg = defaultdict(lambda: {"forecasted_quantity": 0})
        for row in forecast_rows:
            item = menu_lookup.get(row.menu_item_id)
            if item:
                key = (row.forecast_date, row.menu_item_id)
                agg[key]["date"] = row.forecast_date
                agg[key]["menu_item_id"] = row.menu_item_id
                agg[key]["menu_item_name"] = item.name
                agg[key]["forecasted_quantity"] += row.forecasted_quantity

        return list(agg.values())

    @log_method("Get Upcoming Forecast Totals(Basic)")
    async def get_upcoming_forecast_totals_basic(self, start_date: date, end_date: date, mode: str = "per_day"):
        forecast_rows = await self.forecast_breakdown_repo.get_latest_by_date_range(start_date, end_date)

        # Cache menu item prices
        item_prices = {}
        results = defaultdict(lambda: {"forecasted_quantity": 0, "forecasted_revenue": Decimal("0.00")})

        for row in forecast_rows:
            if row.menu_item_id not in item_prices:
                item = await self.menu_repo.get_by_id(row.menu_item_id)
                item_prices[row.menu_item_id] = Decimal(str(item.price)) if item else Decimal("0.00")

            price = item_prices[row.menu_item_id]
            results[row.forecast_date]["forecasted_quantity"] += row.forecasted_quantity
            results[row.forecast_date]["forecasted_revenue"] += row.forecasted_quantity * price

        if mode == "total":
            total_quantity = sum(r["forecasted_quantity"] for r in results.values())
            total_revenue = sum(r["forecasted_revenue"] for r in results.values())
            return {
                "forecasted_quantity": total_quantity,
                "forecasted_revenue": float(round(total_revenue, 2))
            }

        return [
            {
                "date": forecast_date,
                "forecasted_quantity": data["forecasted_quantity"],
                "forecasted_revenue": float(round(data["forecasted_revenue"], 2))
            }
            for forecast_date, data in sorted(results.items())
        ]
    @log_method("Get Top Forecasted Items(Basic)")
    async def get_top_forecasted_items_basic(self, start_date: date, end_date: date, limit: int = 5):
        forecast_rows = await self.forecast_breakdown_repo.get_latest_by_date_range(start_date, end_date)

        totals = defaultdict(int)
        for row in forecast_rows:
            totals[row.menu_item_id] += row.forecasted_quantity

        sorted_items = sorted(totals.items(), key=lambda x: x[1], reverse=True)
        results = []

        for menu_item_id, quantity in sorted_items:
            if len(results) >= limit:
                break
            item = await self.menu_repo.get_by_id(menu_item_id)
            if item and getattr(item, "is_active", True):
                results.append({
                    "menu_item_id": menu_item_id,
                    "name": item.name,
                    "forecasted_quantity": quantity,
                })

        return results
    
    
    #BASIC MENU MIX
    @log_method("Get Sales Breakdown(Basic)")
    async def get_sales_breakdown(self, start_date: date, end_date: date, by_revenue=False):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)
        
        menu_item_ids = list({s.menu_item_id for s in sales})
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {item.menu_item_id: item for item in menu_items if getattr(item, "is_active", True)}

        # Group by item+channel
        grouped = defaultdict(lambda: defaultdict(float))  # [menu_item_id][channel] = quantity/revenue

        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue
            metric = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            metric = round(metric, 2)
            grouped[sale.menu_item_id][sale.sales_channel] += metric

        # Total for percent calc
        total_metric = sum(sum(channels.values()) for channels in grouped.values()) or 1

        results = []
        for menu_item_id, channels in grouped.items():
            item = menu_lookup[menu_item_id]
            for channel, metric in channels.items():
                results.append({
                    "menu_item_id": menu_item_id,
                    "menu_item_name": item.name,
                    "category": item.category,
                    "sales_channel": channel,
                    "metric": metric,
                    "percent_of_total": round(metric / total_metric * 100, 2),
                })
        return results
    @log_method("Get Sales over Time(Basic)")
    async def get_sales_over_time(self, start_date: date, end_date: date, by_revenue=False):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        menu_item_ids = list({s.menu_item_id for s in sales})
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {item.menu_item_id: item for item in menu_items if getattr(item, "is_active", True)}

        grouped = defaultdict(lambda: defaultdict(float))  # [sale_date][menu_item_id] = metric

        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue
            metric = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            metric = round(metric, 2)

            date_key = sale.sale_timestamp.date()
            grouped[date_key][sale.menu_item_id] += metric

        results = []
        for sale_date, items in grouped.items():
            for menu_item_id, metric in items.items():
                item = menu_lookup[menu_item_id]
                results.append({
                    "sale_date": sale_date.isoformat(),
                    "menu_item_id": menu_item_id,
                    "menu_item_name": item.name,
                    "metric": metric,
                })
        return results
    @log_method("Get Top Bottom Items(Basic)")
    async def get_top_bottom_items(self, start_date: date, end_date: date, by_revenue=False, top=True, count=3):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        menu_item_ids = list({s.menu_item_id for s in sales})
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {item.menu_item_id: item for item in menu_items if getattr(item, "is_active", True)}

        metrics = defaultdict(float)
        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue
            metric = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            metric = round(metric, 2)
            metrics[sale.menu_item_id] += metric

        sorted_items = sorted(metrics.items(), key=lambda x: x[1], reverse=top)[:count]

        results = []
        for menu_item_id, metric in sorted_items:
            item = menu_lookup[menu_item_id]
            results.append({
                "menu_item_id": menu_item_id,
                "menu_item_name": item.name,
                "metric": metric,
            })
        return results
    
    #BASIC FORECAST ACCURACY
    @log_method("Get Daily Accuracy Chart")
    async def get_daily_accuracy_chart_data(self, start_date: date, end_date: date):
        rows = await self.daily_forecast_accuracy_repo.get_latest_by_date_range(start_date, end_date)
        menu_items = await self.menu_repo.get_by_ids({r.menu_item_id for r in rows})
        menu_lookup = {m.menu_item_id: m.name for m in menu_items}

        return [
            {
                "date": r.forecast_date,
                "menu_item_id": r.menu_item_id,
                "menu_item_name": menu_lookup.get(r.menu_item_id, "Unknown"),
                "error_percentage": r.error_percentage,
                "forecast_error": r.forecast_error
            }
            for r in rows
        ]
    
    @log_method("Get Forecast Accuracy Table")
    async def get_forecast_accuracy_table(self, start_date: date, end_date: date) -> List[dict]:
        # Fetch overlapping forecast_accuracy records (summary) TODO Get some other kind of thing here for summaries
        summary_rows = await self.forecast_accuracy_repo.get_overlapping_date_range(start_date, end_date)

        # Fetch daily_forecast_accuracy records (daily breakdown)
        daily_rows = await self.daily_forecast_accuracy_repo.get_latest_by_date_range(start_date, end_date)

        # Combine all menu item IDs
        menu_item_ids = {r.menu_item_id for r in summary_rows} | {r.menu_item_id for r in daily_rows}
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {m.menu_item_id: m.name for m in menu_items}

        result = []

        # Summary rows
        for row in summary_rows:
            result.append({
                "date": None,
                "forecast_period_start": row.forecast_period_start,
                "forecast_period_end": row.forecast_period_end,
                "menu_item_id": row.menu_item_id,
                "menu_item_name": menu_lookup.get(row.menu_item_id, "Unknown"),
                "forecasted": row.predicted_quantity,
                "actual": row.actual_quantity,
                "forecast_error": row.forecast_error,
                "error_percentage": row.error_percentage,
                "source": "summary"
            })

        # Daily rows
        for row in daily_rows:
            result.append({
                "date": row.forecast_date,
                "forecast_period_start": None,
                "forecast_period_end": None,
                "menu_item_id": row.menu_item_id,
                "menu_item_name": menu_lookup.get(row.menu_item_id, "Unknown"),
                "forecasted": row.predicted_quantity,
                "actual": row.actual_quantity,
                "forecast_error": row.forecast_error,
                "error_percentage": row.error_percentage,
                "source": "daily"
            })

        return result


    #TODO TODO Fix or get rid of this function, shows the wrong thing if data is repeated. plus dont need it anyways just for me 

    async def compute_accuracy_from_raw_data(self, start_date: date, end_date: date):
        forecasts = await self.forecast_breakdown_repo.get_latest_by_date_range(start_date, end_date)
        sales = await self.sale_repo.get_sales_grouped_by_day(start_date, end_date)

        print(f"Loaded {len(forecasts)} forecasts and {len(sales)} sales")

        menu_ids = {f.menu_item_id for f in forecasts} | {s.menu_item_id for s in sales}
        menu_items = await self.menu_repo.get_by_ids(menu_ids)
        menu_lookup = {m.menu_item_id: m.name for m in menu_items}

        # Group forecast and sales
        forecast_map = defaultdict(int)
        for f in forecasts:
            forecast_map[(f.forecast_date, f.menu_item_id)] += f.forecasted_quantity

        sales_map = defaultdict(int)
        for s in sales:
            date_only = s.sale_date
            sales_map[(date_only, s.menu_item_id)] += s.quantity_sold

        # Combine + compute error
        results = []
        keys = set(forecast_map.keys()) | set(sales_map.keys())

        for (day, item_id) in keys:
            predicted = forecast_map.get((day, item_id), 0)
            actual = sales_map.get((day, item_id), 0)
            error = abs(predicted - actual)
            error_pct = (error / actual) * 100 if actual != 0 else None

            results.append({
                "date": day,
                "menu_item_id": item_id,
                "menu_item_name": menu_lookup.get(item_id, "Unknown"),
                "forecasted": predicted,
                "actual": actual,
                "error": error,
                "error_percentage": error_pct,
            })
        return results

    #BASIC SALES PATTERNS
    @log_method("Get Sales Over Time")
    async def get_sales_over_time_by_item(self, start_date: date, end_date: date, by_revenue: bool = False):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        grouped = defaultdict(lambda: defaultdict(float))  # [sale_date][menu_item_id] = value

        menu_item_ids = list({s.menu_item_id for s in sales})
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {item.menu_item_id: item for item in menu_items if getattr(item, "is_active", True)}

        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue

            date_key = sale.sale_timestamp.date()
            value = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            grouped[date_key][item.menu_item_id] += value

        result = []
        for sale_date, items in grouped.items():
            for menu_item_id, value in items.items():
                result.append({
                    "date": sale_date,
                    "menu_item_id": menu_item_id,
                    "menu_item_name": menu_lookup[menu_item_id].name,
                    "value": round(value, 2),
                })

        return result

    @log_method("Get Sales Heatmap")
    async def get_sales_heatmap_data(
        self,
        start_date: date,
        end_date: date,
        by_revenue: bool = False,
        normalize: bool = False,  # NEW
    ):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        menu_item_ids = {s.menu_item_id for s in sales}
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {m.menu_item_id: m for m in menu_items if getattr(m, "is_active", True)}

        per_day_total = defaultdict(float)
        per_item = defaultdict(lambda: defaultdict(float))      # [menu_item_id][date]
        per_category = defaultdict(lambda: defaultdict(float))  # [category][date]

        for s in sales:
            item = menu_lookup.get(s.menu_item_id)
            if not item:
                continue

            sale_date = s.sale_timestamp.date()
            value = float(s.quantity_sold) * float(item.price) if by_revenue else float(s.quantity_sold)

            per_day_total[sale_date] += value
            per_item[item.menu_item_id][sale_date] += value
            per_category[item.category or "Uncategorized"][sale_date] += value

        # --- Normalize by_menu_item values ---
        normalized_per_item = defaultdict(dict)
        if normalize:
            for menu_item_id, date_map in per_item.items():
                values = list(date_map.values())
                min_val, max_val = min(values), max(values)
                range_val = max_val - min_val
                for date, val in date_map.items():
                    norm_val = (val - min_val) / range_val if range_val > 0 else 0.0
                    normalized_per_item[menu_item_id][date] = norm_val

        # --- Normalize by_category values ---
        normalized_per_category = defaultdict(dict)
        if normalize:
            for category, date_map in per_category.items():
                values = list(date_map.values())
                min_val, max_val = min(values), max(values)
                range_val = max_val - min_val
                for date, val in date_map.items():
                    norm_val = (val - min_val) / range_val if range_val > 0 else 0.0
                    normalized_per_category[category][date] = norm_val

        result = {
            "overall": [
                {"date": date, "value": round(value, 2)}
                for date, value in sorted(per_day_total.items())
            ],
            "by_menu_item": [],
            "by_category": [],
        }

        for menu_item_id, date_map in per_item.items():
            item = menu_lookup[menu_item_id]
            for date, value in date_map.items():
                entry = {
                    "menu_item_id": item.menu_item_id,
                    "menu_item_name": item.name,
                    "date": date,
                    "value": round(value, 2),
                }
                if normalize:
                    entry["normalized_value"] = round(normalized_per_item[menu_item_id][date], 4)
                result["by_menu_item"].append(entry)

        for category, date_map in per_category.items():
            for date, value in date_map.items():
                entry = {
                    "category": category,
                    "date": date,
                    "value": round(value, 2),
                }
                if normalize:
                    entry["normalized_value"] = round(normalized_per_category[category][date], 4)
                result["by_category"].append(entry)

        return result


    @log_method("Get Weekday Sales")
    async def get_weekday_sales_avg(self, start_date: date, end_date: date, by_revenue: bool = False):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        menu_item_ids = {s.menu_item_id for s in sales}
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {m.menu_item_id: m for m in menu_items if getattr(m, "is_active", True)}

        daily_totals = defaultdict(float)  # [date] = value
        weekday_totals = defaultdict(list)  # [weekday] = [values]

        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue

            date_key = sale.sale_timestamp.date()
            value = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            daily_totals[date_key] += value

        for date_key, value in daily_totals.items():
            weekday = date_key.weekday()  # 0 = Monday
            weekday_totals[weekday].append(value)

        results = []
        for weekday in range(7):
            values = weekday_totals.get(weekday, [])
            avg = sum(values) / len(values) if values else 0.0

            #Convert Python wekday Mon=0 to JS weekday Sun=0
            js_weekday = (weekday + 1) % 7

            results.append({
                "weekday": js_weekday,
                "average_value": round(avg, 2)
            })

        return results

    @log_method("Get Sales Channel")
    async def get_sales_channel_breakdown(self, start_date: date, end_date: date, by_revenue: bool = False):
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        menu_item_ids = {s.menu_item_id for s in sales}
        menu_items = await self.menu_repo.get_by_ids(menu_item_ids)
        menu_lookup = {m.menu_item_id: m for m in menu_items if getattr(m, "is_active", True)}

        channel_totals = defaultdict(float)
        total_value = 0.0

        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue

            value = float(sale.quantity_sold) * float(item.price) if by_revenue else float(sale.quantity_sold)
            channel_totals[sale.sales_channel] += value
            total_value += value

        results = []
        for channel, value in channel_totals.items():
            percent = (value / total_value) * 100 if total_value > 0 else 0.0
            results.append({
                "sales_channel": channel,
                "value": round(value, 2),
                "percent_of_total": round(percent, 2),
            })

        return results
    @log_method("Get sales data")
    async def get_sales_data(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        menu_item_ids: Optional[List[int]] = None,
        sales_channels: Optional[List[str]] = None,
    ) -> List[dict]:
        sales = await self.sale_repo.get_sales_between_dates(start_date, end_date)

        # Filter sales by menu_item_ids if given
        if menu_item_ids is not None:
            sales = [s for s in sales if s.menu_item_id in menu_item_ids]

        # Filter sales by sales_channels if given
        if sales_channels is not None:
            sales = [s for s in sales if s.sales_channel in sales_channels]

        menu_item_ids_in_sales = {s.menu_item_id for s in sales}
        menu_items = await self.menu_repo.get_by_ids(list(menu_item_ids_in_sales))
        menu_lookup = {m.menu_item_id: m for m in menu_items if getattr(m, "is_active", True)}

        results = []
        for sale in sales:
            item = menu_lookup.get(sale.menu_item_id)
            if not item:
                continue
            revenue = float(sale.quantity_sold) * float(item.price)
            results.append({
                "sale_id": sale.sale_id,
                "sale_timestamp": sale.sale_timestamp.isoformat(),
                "menu_item_id": item.menu_item_id,
                "menu_item_name": item.name,
                "quantity_sold": sale.quantity_sold,
                "sales_channel": sale.sales_channel,
                "revenue": revenue,
            })

        return results
    @log_method("Get Sales Excel")
    async def export_sales_excel(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        menu_item_ids: Optional[List[int]] = None,
        sales_channels: Optional[List[str]] = None,
    ):
        import io
        from openpyxl import Workbook
        from fastapi.responses import StreamingResponse

        sales_data = await self.get_sales_data(
            start_date=start_date,
            end_date=end_date,
            menu_item_ids=menu_item_ids,
            sales_channels=sales_channels,
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Sales Explorer Data"
        ws.append(["Date", "Menu Item", "Quantity Sold", "Channel", "Revenue"])

        for row in sales_data:
            ws.append([
                row["sale_timestamp"],
                row["menu_item_name"],
                row["quantity_sold"],
                row["sales_channel"],
                row["revenue"],
            ])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        headers = {
            "Content-Disposition": 'attachment; filename="sales_explorer_data.xlsx"'
        }

        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )

    @log_method("Update Sales Data")
    async def update_sale(self, sale_id: int, dto: SaleUpdateDTO):
        dto.restaurant_id = self.restaurant_id
        update_data = dto.model_dump(exclude_unset=True)
        return await self.sale_repo.update(sale_id, update_data)

    @log_method("Create Sale")
    async def create_sale(self, dto: SaleCreateDTO):
        dto.restaurant_id = self.restaurant_id
        return await self.sale_repo.create(dto)