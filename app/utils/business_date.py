from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import json


def sales_day(sale):
    explicit = getattr(sale, 'business_date', None)
    return explicit if isinstance(explicit, date) else sale.sale_timestamp.date()


def trading_date(timestamp, restaurant):
    """Timestamp inputs represent UTC unless an offset is supplied."""
    tz_name = getattr(restaurant, 'timezone', None)
    tz = ZoneInfo(tz_name if isinstance(tz_name, str) and tz_name else 'UTC')
    local = (timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=timezone.utc)).astimezone(tz)
    day = local.date()
    hours = getattr(restaurant, 'hours_of_operation', None)
    hours = json.loads(hours) if isinstance(hours, str) else hours
    if isinstance(hours, list):
        previous = day - timedelta(days=1)
        config = next((row for row in hours if row.get('day') == previous.strftime('%A')), None)
        if config and not config.get('is_closed'):
            opened = config.get('open_time') or config.get('open')
            closed = config.get('close_time') or config.get('close')
            if opened and closed:
                open_time = datetime.strptime(opened, '%H:%M').time()
                close_time = datetime.strptime(closed, '%H:%M').time()
                if close_time <= open_time and local.time().replace(tzinfo=None) <= close_time:
                    return previous
    return day
