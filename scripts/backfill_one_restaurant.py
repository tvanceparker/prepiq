#!/usr/bin/env python3
"""Backfill weather for a single restaurant using raw DB calls (aiomysql) to avoid importing ORM models.

This script:
 - reads `restaurants` for lat/lon
 - calls Open-Meteo adapter for each date
 - upserts into `weather_data` using INSERT ... ON DUPLICATE KEY UPDATE
"""
import asyncio
import os
from datetime import date, timedelta
from typing import Any, Dict

import aiomysql
from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date


async def upsert_weather_row(pool: aiomysql.Pool, restaurant_id: int, weather_date: date, payload: Dict[str, Any]):
    sql = """
    INSERT INTO weather_data (restaurant_id, weather_date, temperature, precipitation_mm, precipitation_type, humidity, wind_speed, wind_deg, weather_condition, source, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    ON DUPLICATE KEY UPDATE
      temperature = VALUES(temperature),
      precipitation_mm = VALUES(precipitation_mm),
      precipitation_type = VALUES(precipitation_type),
      humidity = VALUES(humidity),
      wind_speed = VALUES(wind_speed),
      wind_deg = VALUES(wind_deg),
      weather_condition = VALUES(weather_condition),
      source = VALUES(source),
      created_at = NOW();
    """

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                sql,
                (
                    restaurant_id,
                    weather_date.isoformat(),
                    payload.get("temperature"),
                    payload.get("precipitation_mm"),
                    payload.get("precipitation_type"),
                    payload.get("humidity"),
                    payload.get("wind_speed"),
                    payload.get("wind_deg"),
                    payload.get("weather_condition"),
                    payload.get("source"),
                ),
            )
            await conn.commit()


async def backfill_restaurant(restaurant_id: int, start_date: date, end_date: date, concurrency: int = 2):
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "prepiq")

    # Connect with aiomysql directly
    pool = await aiomysql.create_pool(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, db=DB_NAME, autocommit=False)
    try:
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT restaurant_id, address, city, state, zip_code, latitude, longitude FROM restaurants WHERE restaurant_id = %s", (restaurant_id,))
                row = await cur.fetchone()

        if not row:
            print(f"restaurant {restaurant_id} not found")
            return

        lat = row.get("latitude")
        lon = row.get("longitude")
        if lat is None or lon is None:
            print(f"restaurant {restaurant_id} missing lat/lon; currently we use lat/lon not address")
            return

        sema = asyncio.Semaphore(concurrency)
        tasks = []
        cur_date = start_date
        while cur_date <= end_date:
            async def _task(d):
                async with sema:
                    payload = await fetch_weather_for_date(float(lat), float(lon), d)
                    if payload:
                        await upsert_weather_row(pool, restaurant_id, d, payload)
                        print(f"upserted {restaurant_id} {d}")
                    else:
                        print(f"no payload for {restaurant_id} {d}")

            tasks.append(asyncio.create_task(_task(cur_date)))
            cur_date += timedelta(days=1)

        if tasks:
            await asyncio.gather(*tasks)

    finally:
        pool.close()
        await pool.wait_closed()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--restaurant_id', required=True, type=int)
    parser.add_argument('--start', required=False)
    parser.add_argument('--end', required=False)
    parser.add_argument('--concurrency', required=False, type=int, default=2)
    args = parser.parse_args()

    if args.start and args.end:
        s = date.fromisoformat(args.start)
        e = date.fromisoformat(args.end)
    else:
        s = date.today() - timedelta(days=90)
        e = date.today() - timedelta(days=1)

    asyncio.run(backfill_restaurant(args.restaurant_id, s, e, concurrency=args.concurrency))
