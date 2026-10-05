"""Lossless JSON representation of forecast outputs, independent of later recipes."""
from datetime import date, datetime
from decimal import Decimal


def encode(value):
    if isinstance(value, Decimal):
        return {'$decimal': str(value)}
    if isinstance(value, (date, datetime)):
        return {'$date': value.isoformat()[:10]}
    if isinstance(value, dict):
        return {str(key): encode(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [encode(item) for item in value]
    return value


def decode(value):
    if isinstance(value, dict):
        if set(value) == {'$decimal'}:
            return Decimal(value['$decimal'])
        if set(value) == {'$date'}:
            return date.fromisoformat(value['$date'])
        return {key: decode(item) for key, item in value.items()}
    if isinstance(value, list):
        return [decode(item) for item in value]
    return value


def restore(snapshot):
    restored = decode(snapshot)
    for name in ('menus', 'aggregated'):
        restored[name] = {int(key): value for key, value in restored.get(name, {}).items()}
        for payload in restored[name].values():
            if 'daily_breakdown' in payload:
                payload['daily_breakdown'] = [tuple(point) for point in payload['daily_breakdown']]
    return restored
