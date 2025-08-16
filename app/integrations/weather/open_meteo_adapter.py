import aiohttp
from datetime import date
from typing import Dict, Any, Optional
import asyncio

BASE = "https://archive-api.open-meteo.com/v1/archive"


async def fetch_weather_for_date(lat: float, lon: float, target_date: date) -> Optional[Dict[str, Any]]:
    """Fetch daily aggregated weather for a single date using Open-Meteo archive API.
    Implements a small retry/backoff to tolerate transient network issues.
    Returns a payload ready to upsert into `weather_data` or None on failure.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": target_date.isoformat(),
        "end_date": target_date.isoformat(),
        "daily": "temperature_2m_mean,precipitation_sum,weathercode",
        "timezone": "UTC",
    }

    max_retries = 3
    backoff = 1.0
    for attempt in range(1, max_retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(BASE, params=params, timeout=30) as resp:
                    resp.raise_for_status()
                    data = await resp.json()
            break
        except Exception:
            if attempt == max_retries:
                return None
            await asyncio.sleep(backoff)
            backoff *= 2

    daily = data.get("daily", {})
    temps = daily.get("temperature_2m_mean", [])
    precs = daily.get("precipitation_sum", [])
    codes = daily.get("weathercode", [])

    temp = None
    precip = None
    code = None
    if temps and temps[0] is not None:
        try:
            temp = float(temps[0])
        except Exception:
            temp = None
    if precs and precs[0] is not None:
        try:
            precip = float(precs[0])
        except Exception:
            precip = None
    if codes and codes[0] is not None:
        try:
            code = int(codes[0])
        except Exception:
            code = None

    # Basic mapping for weathercode to string (Open-Meteo codes)
    wc_map = {
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

    weather_condition = wc_map.get(code, str(code) if code is not None else None)

    return {
        "temperature": temp,
        "precipitation_mm": precip,
        "precipitation_type": None,
        "humidity": None,
        "wind_speed": None,
        "wind_deg": None,
        "weather_condition": weather_condition,
        "source": "open-meteo",
    }


FORECAST_BASE = "https://api.open-meteo.com/v1/forecast"


async def fetch_forecast_for_range(lat: float, lon: float, start_date: date, end_date: date) -> Dict[date, Dict[str, Any]]:
    """Fetch forecasted daily aggregates for a date range from Open-Meteo (no API key).
    Returns a dict mapping date -> payload (same shape as fetch_weather_for_date) and
    performs best-effort retries. Does not persist data.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": "temperature_2m_mean,precipitation_sum,weathercode",
        "timezone": "UTC",
    }

    max_retries = 3
    backoff = 1.0
    data = None
    for attempt in range(1, max_retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(FORECAST_BASE, params=params, timeout=30) as resp:
                    resp.raise_for_status()
                    data = await resp.json()
            break
        except Exception:
            if attempt == max_retries:
                return {}
            await asyncio.sleep(backoff)
            backoff *= 2

    daily = data.get("daily", {}) if data else {}
    temps = daily.get("temperature_2m_mean", [])
    precs = daily.get("precipitation_sum", [])
    codes = daily.get("weathercode", [])
    dates = daily.get("time", [])

    out = {}
    for i, dt_str in enumerate(dates):
        try:
            d = date.fromisoformat(dt_str)
        except Exception:
            continue

        t = None
        p = None
        c = None
        if i < len(temps) and temps[i] is not None:
            try:
                t = float(temps[i])
            except Exception:
                t = None
        if i < len(precs) and precs[i] is not None:
            try:
                p = float(precs[i])
            except Exception:
                p = None
        if i < len(codes) and codes[i] is not None:
            try:
                c = int(codes[i])
            except Exception:
                c = None

        wc_map = {
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

        weather_condition = wc_map.get(c, str(c) if c is not None else None)

        out[d] = {
            "temperature": t,
            "precipitation_mm": p,
            "precipitation_type": None,
            "humidity": None,
            "wind_speed": None,
            "wind_deg": None,
            "weather_condition": weather_condition,
            "source": "open-meteo-forecast",
        }

    return out
