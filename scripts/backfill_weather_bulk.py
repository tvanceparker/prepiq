#!/usr/bin/env python3
"""Bulk backfill weather data for one or more restaurants using Open-Meteo archive range API.

This script avoids ORM imports and performs one API call per restaurant for the whole date range,
then upserts all daily rows in a single executemany call.
"""
import argparse
import asyncio
import os
from datetime import date
from typing import Any, Dict, List, Optional

import aiohttp
import aiomysql

ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive"

WC_MAP = {
    0: "clear",
    1: "mainly_clear",
    2: "partly_cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing_rime_fog",
    51: "drizzle_light",
    53: "drizzle_moderate",
    55: "drizzle_dense",
    61: "rain_slight",
    63: "rain_moderate",
    65: "rain_heavy",
    71: "snow_slight",
    73: "snow_moderate",
    75: "snow_heavy",
    80: "rain_showers_slight",
    81: "rain_showers_moderate",
    82: "rain_showers_violent",
}


async def fetch_weather_range(lat: float, lon: float, start: date, end: date, retries: int = 3) -> Dict[str, Any]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_mean,precipitation_sum,weathercode",
        "timezone": "UTC",
    }

    backoff = 1.0
    for attempt in range(1, retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(ARCHIVE_BASE, params=params, timeout=30) as resp:
                    resp.raise_for_status()
                    return await resp.json()
        except Exception:
            if attempt == retries:
                return {}
            await asyncio.sleep(backoff)
            backoff *= 2
    return {}


def build_rows(restaurant_id: int, payload: Dict[str, Any]) -> List[tuple]:
    daily = payload.get("daily", {})
    dates = daily.get("time", [])
    temps = daily.get("temperature_2m_mean", [])
    precs = daily.get("precipitation_sum", [])
    codes = daily.get("weathercode", [])

    rows: List[tuple] = []
    for idx, dt_str in enumerate(dates):
        try:
            d = date.fromisoformat(dt_str)
        except Exception:
            continue

        temp = float(temps[idx]) if idx < len(temps) and temps[idx] is not None else None
        precip = float(precs[idx]) if idx < len(precs) and precs[idx] is not None else None
        code = int(codes[idx]) if idx < len(codes) and codes[idx] is not None else None
        condition = WC_MAP.get(code, str(code) if code is not None else None)

        rows.append(
            (
                restaurant_id,
                d.isoformat(),
                temp,
                precip,
                None,
                None,
                None,
                None,
                condition,
                "open-meteo",
            )
        )

    return rows


async def upsert_rows(pool: aiomysql.Pool, rows: List[tuple]):
    if not rows:
        return

    sql = """
    INSERT INTO weather_data
        (restaurant_id, weather_date, temperature, precipitation_mm, precipitation_type, humidity, wind_speed, wind_deg, weather_condition, source, created_at)
    VALUES
        (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
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
            await cur.executemany(sql, rows)
            await conn.commit()


async def backfill(restaurants: List[int], start: date, end: date):
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "prepiq")

    pool = await aiomysql.create_pool(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, db=DB_NAME, autocommit=False)
    try:
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                if restaurants:
                    placeholders = ",".join(["%s"] * len(restaurants))
                    await cur.execute(
                        f"SELECT restaurant_id, latitude, longitude FROM restaurants WHERE restaurant_id IN ({placeholders})",
                        restaurants,
                    )
                else:
                    await cur.execute("SELECT restaurant_id, latitude, longitude FROM restaurants")
                rest_rows = await cur.fetchall()

        for row in rest_rows:
            rid = row.get("restaurant_id")
            lat = row.get("latitude")
            lon = row.get("longitude")
            if lat is None or lon is None:
                print(f"Skipping restaurant {rid} (missing coordinates)")
                continue

            print(f"Fetching range for restaurant {rid} {start} -> {end}")
            payload = await fetch_weather_range(float(lat), float(lon), start, end)
            rows = build_rows(rid, payload)
            await upsert_rows(pool, rows)
            print(f"Upserted {len(rows)} days for restaurant {rid}")

    finally:
        pool.close()
        await pool.wait_closed()


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--restaurants", nargs="*", type=int, default=[3, 4, 5])
    parser.add_argument("--start", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, help="End date (YYYY-MM-DD)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    start_date = date.fromisoformat(args.start)
    end_date = date.fromisoformat(args.end)
    asyncio.run(backfill(args.restaurants, start_date, end_date))
