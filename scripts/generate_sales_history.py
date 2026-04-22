#!/usr/bin/env python3
"""
Generate synthetic 6-month sales history for restaurants 3 (Basic), 4 (Pro), and 5 (Master).
Patterns are sourced from notes/restaurant_*.md.

Usage examples:
  PYTHONPATH=. .venv/bin/python scripts/generate_sales_history.py
  PYTHONPATH=. .venv/bin/python scripts/generate_sales_history.py --restaurants 3 4 --start 2025-06-25 --end 2025-12-24

Notes:
- Existing sales for targeted restaurants are deleted before insert.
- Sale timestamps are generated in the restaurant's local timezone and stored as naive datetimes.
- Adjust volumes/mixes in the CONFIG dict below if menu items change.
"""
import argparse
import asyncio
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Sequence
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.db.session import AsyncSessionLocal


@dataclass
class MenuWeight:
    menu_item_id: int
    weight: int


@dataclass
class RestaurantConfig:
    restaurant_id: int
    timezone: str
    weekday_volume: Sequence[int]  # (min, max)
    weekend_volume: Sequence[int]  # (min, max)
    channel_weights: Dict[str, int]
    menu_weights: List[MenuWeight]
    lunch_window: Sequence[int]  # [start_hour, start_min, end_hour, end_min]
    dinner_window: Sequence[int]


CONFIG: Dict[int, RestaurantConfig] = {
    # Basic tier (restaurant_id=3)
    3: RestaurantConfig(
        restaurant_id=3,
        timezone="America/Boise",
        weekday_volume=(40, 60),
        weekend_volume=(50, 75),  # +25%
        channel_weights={"in-house": 70, "takeout": 20, "doordash": 10},
        menu_weights=[
            MenuWeight(301, 30),  # Canyon Smash Burger
            MenuWeight(302, 25),  # Hand-Cut Fries
            MenuWeight(303, 15),  # Huckleberry Lemonade
            MenuWeight(304, 15),  # BBQ Bacon Burger
            MenuWeight(305, 10),  # Onion Rings
            MenuWeight(306, 5),   # Chocolate Shake
        ],
        lunch_window=(12, 0, 13, 30),
        dinner_window=(18, 0, 20, 0),
    ),
    # Full tier sample (restaurant_id=4)
    4: RestaurantConfig(
        restaurant_id=4,
        timezone="America/Boise",
        weekday_volume=(80, 120),
        weekend_volume=(100, 155),  # +30%
        channel_weights={"in-house": 60, "takeout": 25, "doordash": 15},
        # Map menu mix from notes onto actual menu_item_ids in seed
        menu_weights=[
            MenuWeight(401, 35),  # Street Tacos (acts as Carne Asada Taco)
            MenuWeight(402, 30),  # Carne Asada Burrito (acts as Pollo Adobado Taco share)
            MenuWeight(403, 20),  # Chicken Quesadilla (acts as Carnitas Burrito share)
            MenuWeight(404, 15),  # Taco Salad (acts as Chips & Guac share)
        ],
        lunch_window=(11, 30, 13, 30),
        dinner_window=(17, 30, 20, 30),
    ),
    # Full tier sample (restaurant_id=5)
    5: RestaurantConfig(
        restaurant_id=5,
        timezone="America/Boise",
        weekday_volume=(60, 90),
        weekend_volume=(80, 120),  # +35%
        channel_weights={"in-house": 55, "takeout": 25, "doordash": 20},
        menu_weights=[
            MenuWeight(501, 30),  # Prime Ribeye
            MenuWeight(502, 25),  # Pan-Roasted Duck
            MenuWeight(503, 30),  # Herb-Crusted Lamb (as Truffle Chicken share)
            MenuWeight(504, 15),  # Pan-Seared Sea Bass (as Garlic Fries share)
        ],
        lunch_window=(11, 30, 13, 30),
        dinner_window=(18, 0, 21, 0),
    ),
}


def weighted_choice(choices: List[MenuWeight]) -> int:
    total = sum(c.weight for c in choices)
    r = random.uniform(0, total)
    upto = 0
    for choice in choices:
        if upto + choice.weight >= r:
            return choice.menu_item_id
        upto += choice.weight
    return choices[-1].menu_item_id  # fallback


def weighted_channel(channels: Dict[str, int]) -> str:
    items = list(channels.items())
    total = sum(w for _, w in items)
    r = random.uniform(0, total)
    upto = 0
    for name, weight in items:
        if upto + weight >= r:
            return name
        upto += weight
    return items[-1][0]


def sample_time(d: date, window: Sequence[int], tz: ZoneInfo) -> datetime:
    sh, sm, eh, em = window
    start = datetime.combine(d, time(sh, sm), tzinfo=tz)
    end = datetime.combine(d, time(eh, em), tzinfo=tz)
    delta_minutes = int((end - start).total_seconds() // 60)
    offset = random.randint(0, max(delta_minutes, 1))
    return start + timedelta(minutes=offset)


def generate_sales_for_day(cfg: RestaurantConfig, current: date) -> List[dict]:
    tz = ZoneInfo(cfg.timezone)
    is_weekend = current.weekday() >= 5  # 5=Sat,6=Sun
    low, high = cfg.weekend_volume if is_weekend else cfg.weekday_volume
    volume = random.randint(low, high)

    rows = []
    for _ in range(volume):
        # 60/40 split lunch vs dinner for time placement
        if random.random() < 0.6:
            ts = sample_time(current, cfg.lunch_window, tz)
        else:
            ts = sample_time(current, cfg.dinner_window, tz)

        rows.append({
            "restaurant_id": cfg.restaurant_id,
            "sale_timestamp": ts.replace(tzinfo=None),  # store naive localized time
            "menu_item_id": weighted_choice(cfg.menu_weights),
            "quantity_sold": random.choice([1, 1, 1, 2, 2, 3]),
            "sales_channel": weighted_channel(cfg.channel_weights),
        })
    return rows


async def seed_restaurant(db, cfg: RestaurantConfig, start: date, end: date):
    await db.execute(text("DELETE FROM sales WHERE restaurant_id = :rid"), {"rid": cfg.restaurant_id})

    batch: List[dict] = []
    current = start
    insert_sql = text(
        """
        INSERT INTO sales (restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel)
        VALUES (:restaurant_id, :sale_timestamp, :menu_item_id, :quantity_sold, :sales_channel)
        """
    )

    while current <= end:
        batch.extend(generate_sales_for_day(cfg, current))
        # Chunk inserts to avoid huge executemany payloads
        if len(batch) >= 2000:
            await db.execute(insert_sql, batch)
            batch.clear()
        current += timedelta(days=1)

    if batch:
        await db.execute(insert_sql, batch)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--restaurants", nargs="*", type=int, default=[3, 4, 5], help="Restaurant IDs to seed")
    parser.add_argument("--start", type=str, default="2025-06-25", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", type=str, default="2025-12-24", help="End date (YYYY-MM-DD)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    random.seed(args.seed)
    start_date = date.fromisoformat(args.start)
    end_date = date.fromisoformat(args.end)

    unknown = [rid for rid in args.restaurants if rid not in CONFIG]
    if unknown:
        raise SystemExit(f"Unsupported restaurant IDs: {unknown}")

    async with AsyncSessionLocal() as db:
        for rid in args.restaurants:
            cfg = CONFIG[rid]
            print(f"Generating sales for restaurant {rid} from {start_date} to {end_date}...")
            await seed_restaurant(db, cfg, start_date, end_date)
        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
