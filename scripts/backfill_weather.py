#!/usr/bin/env python3
import asyncio
from datetime import date, timedelta
from typing import List

from app.db.session import AsyncSessionLocal
from app.repositories.restaurants_repo import RestaurantRepository
from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date
from app.repositories.weather_data_repo import WeatherDataRepository


async def _fetch_and_upsert(sema: asyncio.Semaphore, weather_repo: WeatherDataRepository, restaurant, cur: date):
    async with sema:
        try:
            payload = await fetch_weather_for_date(restaurant.latitude, restaurant.longitude, cur)
            if payload:
                await weather_repo.upsert_for_restaurant_date(restaurant.restaurant_id, cur, payload)
        except Exception as e:
            print(f"error fetching/upserting for {restaurant.restaurant_id} {cur}: {e}")


async def backfill(start_date: date, end_date: date, concurrency: int = 4):
    """Backfill weather for all restaurants between start_date and end_date.
    Uses a semaphore to limit concurrent requests to the Open-Meteo API.
    """
    async with AsyncSessionLocal() as db:
        rest_repo = RestaurantRepository(db, None)
        weather_repo = WeatherDataRepository(db, None)

        restaurants = await rest_repo.list_all()

        sema = asyncio.Semaphore(concurrency)
        tasks: List[asyncio.Task] = []

        for r in restaurants:
            cur = start_date
            while cur <= end_date:
                tasks.append(asyncio.create_task(_fetch_and_upsert(sema, weather_repo, r, cur)))
                cur += timedelta(days=1)

        if tasks:
            await asyncio.gather(*tasks)


if __name__ == '__main__':
    # default backfill last 90 days
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--start', required=False)
    parser.add_argument('--end', required=False)
    parser.add_argument('--concurrency', required=False, type=int, default=4)
    args = parser.parse_args()

    if args.start and args.end:
        s = date.fromisoformat(args.start)
        e = date.fromisoformat(args.end)
    else:
        s = date.today() - timedelta(days=90)
        e = date.today() - timedelta(days=1)

    asyncio.run(backfill(s, e, concurrency=args.concurrency))
