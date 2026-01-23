#!/usr/bin/env python3
"""
Incrementally add sales data for restaurants 3, 4, and 5 based on the last
sale_timestamp currently in the database.

Usage examples:
  PYTHONPATH=. .venv/bin/python scripts/update_sales_history.py
  PYTHONPATH=. .venv/bin/python scripts/update_sales_history.py --restaurants 3 4 --end 2026-01-31
  PYTHONPATH=. .venv/bin/python scripts/update_sales_history.py --include-today

Notes:
- Uses patterns from scripts/generate_sales_history.py.
- If a restaurant has no sales rows, it seeds from the configured default start date.
"""
import argparse
import asyncio
import random
from datetime import date, datetime, timedelta
from typing import Dict, List
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.weather_data_repo import WeatherDataRepository
from scripts.generate_sales_history import CONFIG, RestaurantConfig, generate_sales_for_day


DEFAULT_START = date(2025, 6, 25)


def resolve_end_date(cfg: RestaurantConfig, end_arg: str | None, exclude_today: bool) -> date:
    if end_arg:
        return date.fromisoformat(end_arg)
    tz = ZoneInfo(cfg.timezone)
    today_local = datetime.now(tz).date()
    return today_local - timedelta(days=1) if exclude_today else today_local


async def get_last_sale_date(db, restaurant_id: int) -> date | None:
    result = await db.execute(
        text("SELECT MAX(sale_timestamp) FROM sales WHERE restaurant_id = :rid"),
        {"rid": restaurant_id},
    )
    last_ts = result.scalar()
    if not last_ts:
        return None
    return last_ts.date()


async def insert_sales_batch(db, rows: List[dict]) -> None:
    if not rows:
        return
    insert_sql = text(
        """
        INSERT INTO sales (restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel)
        VALUES (:restaurant_id, :sale_timestamp, :menu_item_id, :quantity_sold, :sales_channel)
        """
    )
    await db.execute(insert_sql, rows)


async def seed_restaurant_incremental(
    db,
    cfg: RestaurantConfig,
    start_override: date | None,
    end_date: date,
) -> tuple[int, date | None, date | None]:
    last_date = await get_last_sale_date(db, cfg.restaurant_id)
    if last_date:
        start_date = last_date + timedelta(days=1)
    else:
        start_date = start_override or DEFAULT_START

    if start_override and start_override > start_date:
        start_date = start_override

    if end_date < start_date:
        return 0, None, None

    total_rows = 0
    batch: List[dict] = []
    current = start_date
    while current <= end_date:
        day_rows = generate_sales_for_day(cfg, current)
        batch.extend(day_rows)
        total_rows += len(day_rows)
        if len(batch) >= 2000:
            await insert_sales_batch(db, batch)
            batch.clear()
        current += timedelta(days=1)

    if batch:
        await insert_sales_batch(db, batch)

    return total_rows, start_date, end_date


async def update_weather_for_range(
    db,
    restaurant_id: int,
    start_date: date,
    end_date: date,
) -> int:
    rest_repo = RestaurantRepository(db, restaurant_id)
    restaurant = await rest_repo.get_own_id()
    if not restaurant or restaurant.latitude is None or restaurant.longitude is None:
        print(f"  weather: skipping restaurant {restaurant_id} (missing coordinates)")
        return 0

    weather_repo = WeatherDataRepository(db, restaurant_id)
    updated = 0
    cur = start_date
    while cur <= end_date:
        payload = await fetch_weather_for_date(restaurant.latitude, restaurant.longitude, cur)
        if payload:
            await weather_repo.upsert_for_restaurant_date(restaurant_id, cur, payload)
            updated += 1
        cur += timedelta(days=1)
    return updated


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--restaurants", nargs="*", type=int, default=[3, 4, 5])
    parser.add_argument("--start", type=str, default=None, help="Override start date (YYYY-MM-DD)")
    parser.add_argument("--end", type=str, default=None, help="End date (YYYY-MM-DD), defaults to today")
    parser.add_argument("--exclude-today", action="store_true", help="Exclude today (end date becomes yesterday)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    random.seed(args.seed)

    unknown = [rid for rid in args.restaurants if rid not in CONFIG]
    if unknown:
        raise SystemExit(f"Unsupported restaurant IDs: {unknown}")

    start_override = date.fromisoformat(args.start) if args.start else None

    async with AsyncSessionLocal() as db:
        for rid in args.restaurants:
            cfg = CONFIG[rid]
            end_date = resolve_end_date(cfg, args.end, args.exclude_today)
            print(
                f"Updating sales for restaurant {rid}: "
                f"start_override={start_override or 'auto'}, end={end_date}"
            )
            inserted, start_date, end_date = await seed_restaurant_incremental(
                db, cfg, start_override, end_date
            )
            print(f"  inserted {inserted} rows")
            if start_date and end_date:
                updated_weather = await update_weather_for_range(db, rid, start_date, end_date)
                print(f"  weather upserts: {updated_weather} days")
        await db.commit()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
