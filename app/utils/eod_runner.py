from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import json
from sqlalchemy import select
from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.services.eod_service import EODService
from app.db.models.restaurants_orm import Restaurant


def due_business_dates(restaurant, now_utc):
    """Opening date owns overnight trading; delays run after the actual close."""
    tz = ZoneInfo(restaurant.timezone)
    now_local = now_utc.astimezone(tz)
    hours = restaurant.hours_of_operation
    hours = json.loads(hours) if isinstance(hours, str) else hours
    last = restaurant.last_eod_run_date
    start = last + timedelta(days=1) if last else now_local.date() - timedelta(days=1)
    # Large historical backfills require an explicit operator-run audit.
    start = max(start, now_local.date() - timedelta(days=30))
    due = []
    while start <= now_local.date():
        config = next((row for row in hours if row.get('day') == start.strftime('%A')), None)
        if config and not config.get('is_closed'):
            close_text = config.get('close_time') or config.get('close')
            open_text = config.get('open_time') or config.get('open')
            if close_text:
                close_time = datetime.strptime(close_text, '%H:%M').time()
                close_day = start
                if open_text and close_time <= datetime.strptime(open_text, '%H:%M').time():
                    close_day += timedelta(days=1)
                close = datetime.combine(close_day, close_time, tzinfo=tz).replace(fold=1)
                # UTC roundtrip moves nonexistent spring-forward times to the
                # next real local instant; fold=1 chooses the later autumn close.
                run_at = close.astimezone(timezone.utc) + timedelta(minutes=restaurant.eod_run_after_close_mins or 60)
                if now_utc >= run_at and (last is None or start > last):
                    due.append(start)
        start += timedelta(days=1)
    return due


async def run_eod_jobs():
    async with AsyncSessionLocal() as session:
        restaurants = (await session.execute(select(Restaurant))).scalars().all()
        for restaurant in restaurants:
            await session.refresh(restaurant)
            restaurant_id = restaurant.restaurant_id
            if not restaurant.eod_run_when_closed or not restaurant.timezone or not restaurant.hours_of_operation:
                continue
            try:
                dates = due_business_dates(restaurant, datetime.now(timezone.utc))
            except (ValueError, KeyError, TypeError) as exc:
                logger.error('[EOD] Invalid schedule restaurant=%s: %s', restaurant.restaurant_id, exc)
                continue
            for business_date in dates:
                try:
                    await EODService(session, restaurant.restaurant_id, restaurant.subscription_tier).finalize_end_of_day_summary(
                        business_date, trigger_source='scheduler')
                    restaurant.last_eod_run_date = business_date
                    await session.commit()
                except Exception:
                    await session.rollback()
                    logger.exception('[EOD] Failed restaurant=%s business_date=%s', restaurant_id, business_date)
                    break
