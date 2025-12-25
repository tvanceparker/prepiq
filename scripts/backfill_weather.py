#!/usr/bin/env python3
import asyncio
from datetime import date, timedelta
from typing import List, Optional, Tuple, Dict

from app.db.session import AsyncSessionLocal

from app.repositories.restaurants_repo import RestaurantRepository
from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date
from app.repositories.weather_data_repo import WeatherDataRepository


async def _fetch_and_upsert(
    sema: asyncio.Semaphore,
    restaurant,
    cur: date,
):
    """Fetch and upsert a single day using an isolated DB session to avoid flush conflicts."""
    async with sema:
        try:
            if restaurant.latitude is None or restaurant.longitude is None:
                return

            payload = await fetch_weather_for_date(restaurant.latitude, restaurant.longitude, cur)
            if not payload:
                return

            async with AsyncSessionLocal() as db:
                weather_repo = WeatherDataRepository(db, restaurant.restaurant_id)
                await weather_repo.upsert_for_restaurant_date(restaurant.restaurant_id, cur, payload)
                await db.commit()
        except Exception as e:
            print(f"error fetching/upserting for {restaurant.restaurant_id} {cur}: {e}")


async def _infer_range(
    restaurants,
    db,
    lookback_days: int,
) -> Tuple[date, date, Dict[int, Tuple[Optional[date], Optional[date]]]]:
    """Infer start/end dates from existing data, falling back to a default lookback."""
    per_restaurant_bounds: Dict[int, Tuple[Optional[date], Optional[date]]] = {}

    earliest: Optional[date] = None
    today = date.today()

    for restaurant in restaurants:
        repo = WeatherDataRepository(db, restaurant.restaurant_id)
        min_d, max_d = await repo.get_bounds()
        per_restaurant_bounds[restaurant.restaurant_id] = (min_d, max_d)

        if min_d is not None:
            earliest = min_d if earliest is None else min(earliest, min_d)

    start = earliest if earliest else today - timedelta(days=lookback_days)
    end = today - timedelta(days=1)
    return start, end, per_restaurant_bounds


async def backfill(
    start_date: Optional[date],
    end_date: Optional[date],
    concurrency: int = 4,
    lookback_days: int = 365,
    restaurant_ids: Optional[List[int]] = None,
):
    """Backfill weather for all restaurants between start_date and end_date.
    Uses a semaphore to limit concurrent requests to the Open-Meteo API.
    If start/end are not provided, the range is inferred from existing data (oldest record found),
    falling back to `lookback_days` if no data exists.
    Optionally limit to a subset of restaurant_ids.
    """
    async with AsyncSessionLocal() as db:
        rest_repo = RestaurantRepository(db, None)
        restaurants = await rest_repo.get_all_restaurants()

        if restaurant_ids:
            restaurants = [r for r in restaurants if r.restaurant_id in set(restaurant_ids)]

        inferred_start, inferred_end, bounds = await _infer_range(restaurants, db, lookback_days)

        start = start_date or inferred_start
        end = end_date or inferred_end

        today = date.today()
        if end >= today:
            end = today - timedelta(days=1)

        print("Weather coverage per restaurant (min_date -> max_date):")
        for rid, (min_d, max_d) in bounds.items():
            print(f"  {rid}: {min_d} -> {max_d}")
        print(f"Backfilling range: {start} to {end}")

        if start > end:
            print("No work to do: start date is after end date.")
            return

        sema = asyncio.Semaphore(concurrency)
        tasks: List[asyncio.Task] = []

        for r in restaurants:
            if r.latitude is None or r.longitude is None:
                print(f"Skipping restaurant {r.restaurant_id} (missing coordinates)")
                continue
            cur = start
            while cur <= end:
                tasks.append(
                    asyncio.create_task(
                        _fetch_and_upsert(
                            sema,
                            r,
                            cur,
                        )
                    )
                )
                cur += timedelta(days=1)

        if tasks:
            await asyncio.gather(*tasks)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--start', required=False, help='ISO date (YYYY-MM-DD) to start backfill')
    parser.add_argument('--end', required=False, help='ISO date (YYYY-MM-DD) to end backfill (defaults to yesterday)')
    parser.add_argument('--concurrency', required=False, type=int, default=4, help='Number of concurrent requests to Open-Meteo')
    parser.add_argument('--lookback-days', required=False, type=int, default=365, help='Fallback lookback when no existing data is present')
    parser.add_argument('--restaurants', required=False, nargs='+', type=int, help='Limit backfill to specific restaurant IDs')
    args = parser.parse_args()

    s = date.fromisoformat(args.start) if args.start else None
    e = date.fromisoformat(args.end) if args.end else None

    asyncio.run(backfill(s, e, concurrency=args.concurrency, lookback_days=args.lookback_days, restaurant_ids=args.restaurants))
