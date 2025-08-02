from datetime import datetime, timedelta
import pytz
import asyncio
from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.services.eod_service import EODService
from app.db.models.restaurants_orm import Restaurant
from sqlalchemy import select
import json

async def run_eod_jobs():
    async with AsyncSessionLocal() as session:
        now_utc = datetime.utcnow()

        stmt = select(Restaurant)
        result = await session.execute(stmt)
        restaurants = result.scalars().all()
        for r in restaurants:
            if not r.eod_run_when_closed:
                continue

            if not r.hours_of_operation or not r.timezone:
                continue

            # Parse timezone
            try:
                tz = pytz.timezone(r.timezone)
            except Exception as e:
                logger.error(f"[EOD Job Error] Invalid timezone for restaurant {r.restaurant_id}: {e}")
                continue

            # Parse hours_of_operation JSON string into Python list/dict
            try:
                hours_of_operation = json.loads(r.hours_of_operation)
            except Exception as e:
                logger.error(f"[EOD Job Error] Failed to parse hours_of_operation for restaurant {r.restaurant_id}: {e}")
                continue

            now_local = datetime.now(tz)
            today_name = now_local.strftime("%A")

            # Find today's hours dictionary by matching day name
            today_hours = next((h for h in hours_of_operation if h.get("day") == today_name), None)
            if not today_hours or today_hours.get("is_closed"):
                continue

            close_str = today_hours.get("close_time") or today_hours.get("close")
            if not close_str:
                continue

            try:
                close_time_obj = datetime.strptime(close_str, "%H:%M").time()
                close_dt = tz.localize(datetime.combine(now_local.date(), close_time_obj))
                run_at = close_dt + timedelta(minutes=r.eod_run_after_close_mins or 60)

                # EOD date is the date of the close time (could be the previous calendar day if past midnight)
                eod_date = close_dt.date()

                # Only run if current time >= scheduled run time AND EOD hasn't been run for that date yet
                if now_local >= run_at and (r.last_eod_run_date != eod_date):
                    print(f"Running EOD for restaurant {r.restaurant_id} for date {eod_date}...")

                    eod_service = EODService(session, r.restaurant_id, r.subscription_tier)
                    try:
                        logger.info(f"[EOD] Trying Job for restaurant")
                        await eod_service.finalize_end_of_day_summary(eod_date)
                        logger.info(f"[EOD] job for restaurant {r.restaurant_id} completed.")
                    except Exception as e:
                        logger.error(f"[EOD] Job Error finalize_end_of_day_summary failed for restaurant {r.restaurant_id}: {e}")
                        continue

                    # Update last_eod_run_date on successful EOD run
                    r.last_eod_run_date = eod_date
                    session.add(r)
                    await session.commit()

            except Exception as e:
                logger.error(f"[EOD] Job Error: {e}")
