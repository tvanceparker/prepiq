# app/repositories/ingredient_forecast_breakdown_repo.py

from datetime import date, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.models.forecasts_orm import Forecast
from app.db.models.ingredient_forecast_breakdown_orm import IngredientForecastBreakdown
from app.repositories.base_repository import BaseRepository


class IngredientForecastBreakdownRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(
            db,
            IngredientForecastBreakdown,
            restaurant_id,
            pk_field="ingredient_breakdown_id",
        )

    async def get_latest_by_date_range_before(
        self,
        start_date: date,
        end_date: date,
        created_at_cutoff: datetime | None = None,
    ):
        breakdown_alias = aliased(IngredientForecastBreakdown)
        forecast_alias = aliased(Forecast)

        subquery_filters = [
            IngredientForecastBreakdown.restaurant_id == self.restaurant_id,
            IngredientForecastBreakdown.forecast_date >= start_date,
            IngredientForecastBreakdown.forecast_date <= end_date,
        ]
        if created_at_cutoff is not None:
            subquery_filters.append(Forecast.created_at <= created_at_cutoff)

        subquery = (
            select(
                IngredientForecastBreakdown.forecast_date,
                IngredientForecastBreakdown.ingredient_id,
                func.max(IngredientForecastBreakdown.forecast_id).label("max_forecast_id"),
            )
            .join(Forecast, Forecast.forecast_id == IngredientForecastBreakdown.forecast_id)
            .where(*subquery_filters)
            .group_by(
                IngredientForecastBreakdown.forecast_date,
                IngredientForecastBreakdown.ingredient_id,
            )
            .subquery()
        )

        query_filters = [
            breakdown_alias.restaurant_id == self.restaurant_id,
            breakdown_alias.forecast_date >= start_date,
            breakdown_alias.forecast_date <= end_date,
        ]
        if created_at_cutoff is not None:
            query_filters.append(forecast_alias.created_at <= created_at_cutoff)

        stmt = (
            select(breakdown_alias)
            .join(forecast_alias, forecast_alias.forecast_id == breakdown_alias.forecast_id)
            .join(
                subquery,
                and_(
                    breakdown_alias.forecast_date == subquery.c.forecast_date,
                    breakdown_alias.ingredient_id == subquery.c.ingredient_id,
                    breakdown_alias.forecast_id == subquery.c.max_forecast_id,
                ),
            )
            .where(*query_filters)
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()
