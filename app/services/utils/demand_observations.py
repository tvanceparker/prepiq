"""Explicit import completeness, closed dates, and censored-demand observations.

Restaurant.settings['sales_history_coverage'] declares an inclusive imported
window (start_date/end_date). 'sales_observations' maps ISO dates to complete,
closed, missing, stockout, or unavailable. Coverage is an operator/importer
assertion; a sale row alone never proves a full business day was imported.
"""
from datetime import date, timedelta
from app.repositories.restaurants_repo import RestaurantRepository


class DemandObservations:
    def __init__(self, settings=None):
        settings = settings if isinstance(settings, dict) else {}
        coverage = settings.get('sales_history_coverage') or {}
        try:
            self.start = date.fromisoformat(coverage['start_date'])
            self.end = date.fromisoformat(coverage['end_date'])
        except (KeyError, ValueError, TypeError):
            self.start = self.end = None
        self.days = settings.get('sales_observations') or {}
        if not isinstance(self.days, dict):
            self.days = {}

    @classmethod
    async def load(cls, db, restaurant_id):
        restaurant = await RestaurantRepository(db, restaurant_id).get_by_id(restaurant_id)
        return cls(getattr(restaurant, 'settings', None))

    def status(self, day):
        explicit = self.days.get(day.isoformat())
        if explicit in {'complete', 'closed', 'missing', 'stockout', 'unavailable'}:
            return explicit
        if self.start and self.start <= day <= self.end:
            return 'complete'
        return 'unknown'

    def quality(self, start, end):
        counts = {}
        day = start
        while day <= end:
            status = self.status(day)
            counts[status] = counts.get(status, 0) + 1
            day += timedelta(days=1)
        valid = all(status in {'complete', 'closed'} for status in counts)
        return {'start_date': start.isoformat(), 'end_date': end.isoformat(), 'day_status_counts': counts,
                'review_required': not valid,
                'warnings': [] if valid else ['Import completeness or uncensored demand is unverified; review forecast-driven prep and orders']}
