from app.utils.business_date import sales_day
from app.services.utils.demand_observations import DemandObservations
from app.services.utils.forecast_snapshot import encode, restore
from app.utils.job_lock import serialized_job
from app.services.utils.recipe_usage import RecipeUsageExpander
from typing import Any, Dict, List, Optional, Tuple

import asyncio
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
import math

import numpy as np
import pandas as pd
from statistics import mean

from sqlalchemy.ext.asyncio import AsyncSession

import h2o
from h2o.estimators import H2OGradientBoostingEstimator

from app.core.logging import logger
from app.repositories.alerts_repo import AlertRepository
from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.daily_forecast_accuracy_repo import (
    DailyForecastAccuracyRepository,
)
from app.repositories.forecast_accuracy_repo import ForecastAccuracyRepository
from app.repositories.forecast_breakdown_repo import ForecastBreakdownRepository
from app.repositories.forecast_run_ledger_repo import ForecastRunLedgerRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.sales_repo import SalesRepository
from app.services.utils.metrics import mape
from app.services.utils.model_path import load_model, save_model
from app.services.utils.unit_conversion import convert_unit, normalize_unit
from app.utils.logger_helpers import log_method

class ForecastingEngine:
    """
    Advanced forecasting engine used by Full tier restaurants.
    Provides:
      * H2O-based model training with accuracy tracking & retraining rules
      * Forecast persistence to forecasts/forecast_breakdown tables
      * Forecast accuracy + daily accuracy writes
      * Weather-data enrichment and future weather forecasting inputs
      * Ingredient and batch recipe breakdowns for reorder planning

    Legacy helpers (preprocess_data, train_model, etc.) are retained for backward
    compatibility with existing utilities/tests but are not used by the primary
    forecasting pipeline any longer.
    """

    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        subscription_tier: Optional[str] = None,
        model: Any | None = None,
    ) -> None:
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier

        # Core repositories
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.batch_recipe_ingredients_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.ingredient_repo = IngredientRepository(db, restaurant_id)

        # Forecasting + accuracy repositories
        self.forecast_repo = ForecastRepository(db, restaurant_id)
        self.forecast_breakdown_repo = ForecastBreakdownRepository(db, restaurant_id)
        self.forecast_accuracy_repo = ForecastAccuracyRepository(db, restaurant_id)
        self.daily_forecast_accuracy_repo = DailyForecastAccuracyRepository(
            db, restaurant_id
        )
        self.forecast_run_ledger_repo = ForecastRunLedgerRepository(db, restaurant_id)

        # Meta + alerts
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.alert_repo = AlertRepository(db, restaurant_id)

        # Advanced pipeline state
        self.accuracy_metrics: Dict[int, Dict[str, Optional[float]]] = {}
        self.forecast_origin = None
        self.observations = None
        self.history_quality = None
        self.latest_menu_item_forecasts: Dict[
            int, Dict[str, List[Tuple[date, float]]]
        ] = {}
        self.latest_batch_breakdown: List[Dict[str, Any]] = []
        self.latest_ingredient_breakdown: List[Dict[str, Any]] = []
        self.latest_aggregated_ingredient_demand: Dict[int, Dict[str, Any]] = {}
        self.menu_item_confidence: Dict[int, Optional[float]] = {}
        self.latest_forecast_model_metadata: Dict[int, Dict[str, Any]] = {}

    async def initialize(self) -> None:
        """Retained for compatibility with callers; advanced pipeline requires no warm-up."""
        logger.debug("[FORECAST] initialize() noop for restaurant %s", self.restaurant_id)

    # ------------------------------------------------------------------
    # Alerting & Accuracy helpers (used by advanced pipeline)
    # ------------------------------------------------------------------
    async def _raise_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = "warning",
        meta: Optional[Dict[str, Any]] = None,
        employee_id: Optional[int] = None,
    ) -> None:
        await self.alert_repo.create(
            {
                "restaurant_id": self.restaurant_id,
                "employee_id": employee_id,
                "role": "system",
                "alert_type": alert_type,
                "message": message,
                "severity": severity,
                "meta": meta or {},
            }
        )

    @log_method("Evaluating and Recording Daily Forecast Accuracy (Advanced)")
    async def evaluate_and_record_daily_forecast_accuracy(self, evaluation_date: date) -> None:
        forecast_breakdowns = await self.forecast_breakdown_repo.get_forecasts_for_date(
            evaluation_date
        )
        if not forecast_breakdowns:
            logger.debug(
                "[ACCURACY] No forecast breakdowns found for %s", evaluation_date
            )
            return

        observations = await DemandObservations.load(self.db, self.restaurant_id)
        if observations.status(evaluation_date) not in {"complete", "closed"}:
            logger.info("[ACCURACY] Skipping unverified business date %s", evaluation_date)
            return
        sales_for_day = await self.sales_repo.get_by_date(evaluation_date)
        actual_by_item: Dict[int, int] = defaultdict(int)
        for sale in sales_for_day:
            actual_by_item[sale.menu_item_id] += sale.quantity_sold

        for breakdown in forecast_breakdowns:
            issued = await self.forecast_repo.get_by_id(breakdown.forecast_id)
            if not issued or not issued.created_at or issued.created_at.date() >= evaluation_date:
                continue
            predicted_quantity = breakdown.forecasted_quantity
            actual_quantity = actual_by_item.get(breakdown.menu_item_id, 0)

            forecast_error = predicted_quantity - actual_quantity
            error_percentage = mape(predicted_quantity, actual_quantity)

            exists = await self.daily_forecast_accuracy_repo.exists_for_breakdown(
                breakdown.breakdown_id
            )
            if exists:
                continue

            accuracy_data = {
                "breakdown_id": breakdown.breakdown_id,
                "restaurant_id": breakdown.restaurant_id,
                "menu_item_id": breakdown.menu_item_id,
                "forecast_date": breakdown.forecast_date,
                "predicted_quantity": predicted_quantity,
                "actual_quantity": int(actual_quantity),
                "forecast_error": forecast_error,
                "error_percentage": round(float(error_percentage), 2),
            }

            logger.info("[ACCURACY] Daily Accuracy: %s", accuracy_data)
            await self.daily_forecast_accuracy_repo.create(accuracy_data)

    @log_method("Evaluating Forecast Accuracy (Advanced)")
    async def evaluate_and_record_accuracy(self, forecast_date: date) -> None:
        check_until = forecast_date - timedelta(days=1)
        past_forecasts = await self.forecast_repo.get_forecasts_ending_before(
            check_until
        )
        if not past_forecasts:
            logger.debug(
                "[ACCURACY] No forecasts ending before %s to evaluate.", check_until
            )
            return

        logger.info(
            "[ACCURACY] Evaluating %s forecasts ending before %s...",
            len(past_forecasts),
            check_until,
        )

        observations = await DemandObservations.load(self.db, self.restaurant_id)
        for forecast in past_forecasts:
            forecast_id = forecast.forecast_id
            existing_accuracy = await self.forecast_accuracy_repo.get_by_forecast_id(
                forecast_id
            )
            if existing_accuracy:
                continue

            breakdowns = await self.forecast_breakdown_repo.get_by_forecast(forecast_id)
            if not breakdowns:
                continue

            forecast_dates = [b.forecast_date for b in breakdowns]
            start_date = min(forecast_dates)
            end_date = max(forecast_dates)
            sales_window = await self.sales_repo.get_sales_between_dates(
                start_date=start_date,
                end_date=end_date,
            )
            actual_by_day: Dict[date, int] = defaultdict(int)
            for sale in sales_window:
                if sale.menu_item_id == forecast.menu_item_id:
                    actual_by_day[sales_day(sale)] += sale.quantity_sold

            abs_percentage_errors = []
            squared_errors = []
            actuals: List[float] = []
            predictions: List[float] = []

            total_actual = 0
            total_predicted = 0

            for b in breakdowns:
                forecast_day = b.forecast_date
                if observations.status(forecast_day) not in {"complete", "closed"} or not forecast.created_at or forecast.created_at.date() >= forecast_day:
                    continue
                predicted_qty = b.forecasted_quantity
                actual_qty = actual_by_day.get(forecast_day, 0)
                total_actual += actual_qty
                total_predicted += predicted_qty

                error = mape(predicted_qty, actual_qty)
                abs_percentage_errors.append(float(error))
                squared_errors.append((actual_qty - predicted_qty) ** 2)
                actuals.append(actual_qty)
                predictions.append(predicted_qty)

            if not actuals:
                continue
            mean_smape = mean(abs_percentage_errors) if abs_percentage_errors else 0.0
            mean_actual = mean(actuals) if actuals else 0
            ss_res = sum(squared_errors)
            ss_tot = sum((a - mean_actual) ** 2 for a in actuals) if actuals else 0
            r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

            accuracy_data = {
                "forecast_id": forecast_id,
                "restaurant_id": forecast.restaurant_id,
                "menu_item_id": forecast.menu_item_id,
                "forecast_version": forecast.forecast_version or 1,
                "forecast_period_start": forecast.forecast_period_start,
                "forecast_period_end": forecast.forecast_period_end,
                "predicted_quantity": int(total_predicted),
                "actual_quantity": int(total_actual),
                "forecast_error": int(abs(total_predicted - total_actual)),
                "error_percentage": round(mean_smape, 2),
            }

            logger.info("[ACCURACY] Forecast accuracy data: %s", accuracy_data)
            await self.forecast_accuracy_repo.create(accuracy_data)

    @log_method("Compute Forecast Accuracy Metrics (Advanced)")
    async def _compute_forecast_accuracy_metrics(self, menu_item_id: int) -> Dict[str, Any]:
        latest_forecast = await self.forecast_repo.get_latest_forecast_for_item(
            menu_item_id
        )
        if not latest_forecast:
            return {}

        forecast_id = latest_forecast.forecast_id
        breakdowns = await self.forecast_breakdown_repo.get_by_forecast(forecast_id)
        observations = await DemandObservations.load(self.db, self.restaurant_id)
        breakdowns = [b for b in breakdowns if b.forecast_date <= (self.forecast_origin or date.today())
                      and observations.status(b.forecast_date) in {"complete", "closed"}
                      and latest_forecast.created_at and latest_forecast.created_at.date() < b.forecast_date]
        if not breakdowns:
            return {}

        forecast_df = pd.DataFrame(
            [
                {
                    "forecast_date": b.forecast_date,
                    "predicted_quantity": b.forecasted_quantity,
                }
                for b in breakdowns
            ]
        )

        sales_data = await self.sales_repo.get_sales_by_menu_item(menu_item_id)
        sales_df = pd.DataFrame(
            [
                {
                    "sale_date": sales_day(s),
                    "quantity_sold": s.quantity_sold,
                }
                for s in sales_data
            ], columns=["sale_date", "quantity_sold"]
        )
        sales_df = sales_df.groupby("sale_date")["quantity_sold"].sum().reset_index()

        merged = pd.merge(
            forecast_df,
            sales_df,
            how="left",
            left_on="forecast_date",
            right_on="sale_date",
        )
        merged["quantity_sold"] = merged["quantity_sold"].fillna(0)

        y_true = merged["quantity_sold"]
        y_pred = merged["predicted_quantity"]

        if y_true.empty or y_pred.empty:
            return {}

        nonzero_mask = y_true != 0
        if nonzero_mask.sum() == 0:
            computed_mape = None
        else:
            computed_mape = (
                abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])
            ).mean()

        try:
            from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        except ImportError:  # pragma: no cover
            return {
                "mape": computed_mape,
                "r2": None,
                "mae": None,
                "mse": None,
                "rmse": None,
            }

        r2 = r2_score(y_true, y_pred) if len(y_true) >= 2 else None
        mae = mean_absolute_error(y_true, y_pred)
        mse = mean_squared_error(y_true, y_pred)
        rmse = mse ** 0.5

        return {
            "mape": computed_mape,
            "r2": r2,
            "mae": mae,
            "mse": mse,
            "rmse": rmse,
            "bias": float((y_pred - y_true).mean()),
            "wape": float(abs(y_pred - y_true).sum() / abs(y_true).sum()) if abs(y_true).sum() else None,
            "metric_units": {"mape": "fraction", "wape": "fraction", "mae": "servings", "bias": "servings"},
        }

    def _derive_confidence_score(
        self, metrics: Optional[Dict[str, Optional[float]]]
    ) -> Optional[float]:
        if not metrics:
            return None

        components: List[float] = []

        mape_value = metrics.get("mape")
        if mape_value is not None and not np.isnan(mape_value):
            components.append(max(0.0, min(1.0, 1 - float(mape_value))))

        r2_value = metrics.get("r2")
        if r2_value is not None and not np.isnan(r2_value):
            normalized_r2 = float(r2_value)
            if normalized_r2 < 0:
                normalized_r2 = (normalized_r2 + 1.0) / 2.0
            components.append(max(0.0, min(1.0, normalized_r2)))

        if not components:
            return None

        return round(sum(components) / len(components), 3)

    async def _get_menu_item_sales_history(
        self, menu_item_id: int, lookback_days: int = 90
    ) -> List[Any]:
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=(self.forecast_origin or date.today()) - timedelta(days=lookback_days),
            end_date=(self.forecast_origin or date.today()),
        )
        return [sale for sale in sales if sale.menu_item_id == menu_item_id]

    async def _summarize_sales_history(self, sales_history: List[Any]) -> Dict[str, Any]:
        daily_sales = await self._prepare_sales_dataframe(sales_history)
        if daily_sales.empty:
            return {
                "history_days": 0,
                "nonzero_days": 0,
                "recent_nonzero_days": 0,
                "intermittent_ratio": 1.0,
                "mean_daily_demand": 0.0,
                "mean_nonzero_demand": 0.0,
                "recent_mean_demand": 0.0,
                "max_daily_demand": 0.0,
                "total_units": 0.0,
                "has_recent_demand": False,
            }

        quantity_series = pd.to_numeric(
            daily_sales["quantity_sold"], errors="coerce"
        ).fillna(0.0)
        nonzero_series = quantity_series[quantity_series > 0]
        recent_series = quantity_series.tail(min(len(quantity_series), 14))
        recent_nonzero_series = recent_series[recent_series > 0]

        history_days = int(len(quantity_series))
        nonzero_days = int(len(nonzero_series))

        return {
            "history_days": history_days,
            "nonzero_days": nonzero_days,
            "recent_nonzero_days": int(len(recent_nonzero_series)),
            "intermittent_ratio": (
                round(1 - (nonzero_days / history_days), 4) if history_days else 1.0
            ),
            "mean_daily_demand": float(quantity_series.mean()) if history_days else 0.0,
            "mean_nonzero_demand": float(nonzero_series.mean()) if nonzero_days else 0.0,
            "recent_mean_demand": float(recent_series.mean()) if len(recent_series) else 0.0,
            "max_daily_demand": float(quantity_series.max()) if history_days else 0.0,
            "total_units": float(quantity_series.sum()) if history_days else 0.0,
            "has_recent_demand": bool(len(recent_nonzero_series) > 0),
        }

    def _select_non_gbm_strategy(
        self,
        history_summary: Dict[str, Any],
        *,
        model_source: Optional[str] = None,
        selection_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        nonzero_days = int(history_summary.get("nonzero_days") or 0)
        recent_nonzero_days = int(history_summary.get("recent_nonzero_days") or 0)
        intermittent_ratio = float(history_summary.get("intermittent_ratio") or 1.0)

        if nonzero_days <= 0:
            return {
                "model_type_used": "fallback",
                "model_source": model_source or "cold_start_fallback",
                "selection_reason": selection_reason
                or "No sales history is available, so the forecast falls back to zero-demand output.",
            }

        if intermittent_ratio >= 0.6 or recent_nonzero_days <= 3:
            return {
                "model_type_used": "intermittent",
                "model_source": model_source or "intermittent_profile",
                "selection_reason": selection_reason
                or "Demand is sparse across the lookback window, so the intermittent path is used.",
            }

        return {
            "model_type_used": "baseline",
            "model_source": model_source or "historical_baseline",
            "selection_reason": selection_reason
            or "A usable GBM model is not available, so the baseline history-driven forecast is used.",
        }

    async def select_forecast_strategy(
        self,
        menu_item_id: int,
        horizon_days: int = 14,
        *,
        model: Any | None = None,
        model_source: Optional[str] = None,
        metrics: Optional[Dict[str, Optional[float]]] = None,
        sales_history: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        del horizon_days

        sales_history = (
            sales_history
            if sales_history is not None
            else await self._get_menu_item_sales_history(menu_item_id)
        )
        history_summary = await self._summarize_sales_history(sales_history)

        if model is not None:
            return {
                "model_type_used": "gbm_primary",
                "model_source": model_source or "loaded_h2o",
                "selection_reason": "A trained H2O GBM model is available and remains the primary forecast path.",
                "metrics": metrics or {},
                "history_summary": history_summary,
            }

        strategy = self._select_non_gbm_strategy(
            history_summary,
            model_source=model_source,
        )
        strategy["metrics"] = metrics or {}
        strategy["history_summary"] = history_summary
        return strategy

    def _build_future_dates(self, horizon_days: int) -> List[date]:
        return [(self.forecast_origin or date.today()) + timedelta(days=offset + 1) for offset in range(horizon_days)]

    @staticmethod
    def _generate_zero_forecast(future_dates: List[date]) -> List[Dict[str, Any]]:
        return [
            {"forecast_date": forecast_date, "predicted_quantity": 0.0}
            for forecast_date in future_dates
        ]

    async def _generate_baseline_forecast(
        self,
        menu_item_id: int,
        horizon_days: int,
        *,
        sales_history: Optional[List[Any]] = None,
        future_dates: Optional[List[date]] = None,
    ) -> List[Dict[str, Any]]:
        sales_history = (
            sales_history
            if sales_history is not None
            else await self._get_menu_item_sales_history(menu_item_id)
        )
        future_dates = future_dates or self._build_future_dates(horizon_days)

        daily_sales = await self._prepare_sales_dataframe(sales_history)
        if daily_sales.empty:
            return self._generate_zero_forecast(future_dates)

        quantity_series = pd.to_numeric(
            daily_sales["quantity_sold"], errors="coerce"
        ).fillna(0.0)
        weekday_means = quantity_series.groupby(quantity_series.index.dayofweek).mean().to_dict()
        last_14_mean = float(quantity_series.tail(min(len(quantity_series), 14)).mean())
        last_7_mean = float(quantity_series.tail(min(len(quantity_series), 7)).mean())
        recent_mean = (last_7_mean * 0.6) + (last_14_mean * 0.4)

        baseline_result: List[Dict[str, Any]] = []
        for forecast_date in future_dates:
            day_of_week = pd.Timestamp(forecast_date).dayofweek
            weekday_mean = float(weekday_means.get(day_of_week, recent_mean))
            prediction = max(0.0, (weekday_mean * 0.65) + (recent_mean * 0.35))
            baseline_result.append(
                {
                    "forecast_date": forecast_date,
                    "predicted_quantity": prediction,
                }
            )

        logger.info(
            "[FORECAST] Baseline forecast for menu_item %s: %s",
            menu_item_id,
            baseline_result,
        )
        return baseline_result

    async def _generate_intermittent_forecast(
        self,
        menu_item_id: int,
        horizon_days: int,
        *,
        sales_history: Optional[List[Any]] = None,
        future_dates: Optional[List[date]] = None,
    ) -> List[Dict[str, Any]]:
        sales_history = (
            sales_history
            if sales_history is not None
            else await self._get_menu_item_sales_history(menu_item_id)
        )
        future_dates = future_dates or self._build_future_dates(horizon_days)

        daily_sales = await self._prepare_sales_dataframe(sales_history)
        if daily_sales.empty:
            return self._generate_zero_forecast(future_dates)

        quantity_series = pd.to_numeric(
            daily_sales["quantity_sold"], errors="coerce"
        ).fillna(0.0)
        nonzero_series = quantity_series[quantity_series > 0]
        if nonzero_series.empty:
            return self._generate_zero_forecast(future_dates)

        avg_nonzero_demand = float(nonzero_series.mean())
        avg_interval = float(len(quantity_series)) / float(len(nonzero_series))
        daily_rate = avg_nonzero_demand / max(avg_interval, 1.0)
        occurrence_probability_by_dow = (
            (quantity_series > 0)
            .groupby(quantity_series.index.dayofweek)
            .mean()
            .to_dict()
        )
        size_by_dow = nonzero_series.groupby(nonzero_series.index.dayofweek).mean().to_dict()
        default_occurrence_probability = float(len(nonzero_series)) / float(len(quantity_series))
        cap_quantity = max(float(nonzero_series.iloc[-1]), avg_nonzero_demand * 1.5)

        intermittent_result: List[Dict[str, Any]] = []
        for forecast_date in future_dates:
            day_of_week = pd.Timestamp(forecast_date).dayofweek
            occurrence_probability = float(
                occurrence_probability_by_dow.get(
                    day_of_week,
                    default_occurrence_probability,
                )
            )
            mean_size = float(size_by_dow.get(day_of_week, avg_nonzero_demand))
            prediction = (occurrence_probability * mean_size * 0.6) + (daily_rate * 0.4)
            intermittent_result.append(
                {
                    "forecast_date": forecast_date,
                    "predicted_quantity": max(0.0, min(prediction, cap_quantity)),
                }
            )

        logger.info(
            "[FORECAST] Intermittent forecast for menu_item %s: %s",
            menu_item_id,
            intermittent_result,
        )
        return intermittent_result

    async def _generate_primary_gbm_forecast(
        self,
        menu_item_id: int,
        horizon_days: int,
        *,
        model: Any | None,
        future_dates: Optional[List[date]] = None,
    ) -> List[Dict[str, Any]]:
        if model is None:
            return []

        future_dates = future_dates or self._build_future_dates(horizon_days)
        df = pd.DataFrame({"date": future_dates})
        df["date"] = pd.to_datetime(df["date"])
        df["day_of_week"] = df["date"].dt.dayofweek
        df["day"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["year"] = df["date"].dt.year

        features_df = df[["day_of_week", "day", "month", "year"]].copy()

        try:
            # Calendar predictors have identical information at training and
            # every inference horizon. Observed future sales/errors/weather are
            # excluded until origin-stamped external feature snapshots exist.
            required_names = getattr(model, "_model_json", {}).get("output", {}).get("names", [])
            if required_names and set(required_names) - {"day_of_week", "day", "month", "year", "quantity_sold"}:
                logger.warning("[FORECAST] Legacy model feature contract rejected for menu_item %s", menu_item_id)
                return []
            h2o_frame = h2o.H2OFrame(features_df)
            predictions = model.predict(h2o_frame).as_data_frame().values.flatten()
            result = [
                {
                    "forecast_date": forecast_date,
                    "predicted_quantity": max(0.0, float(prediction)),
                }
                for forecast_date, prediction in zip(future_dates, predictions)
            ]
            logger.info(
                "[FORECAST] H2O forecast for menu_item %s: %s",
                menu_item_id,
                result,
            )
            return result
        except Exception as exc:
            logger.error(
                "Error generating forecast with H2O model for %s: %s",
                menu_item_id,
                exc,
            )
            return []

    async def generate_forecast_with_metadata(
        self,
        menu_item_id: int,
        horizon_days: int = 14,
        *,
        strategy_metadata: Optional[Dict[str, Any]] = None,
        model: Any | None = None,
        sales_history: Optional[List[Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        sales_history = (
            sales_history
            if sales_history is not None
            else await self._get_menu_item_sales_history(menu_item_id)
        )
        strategy = (
            dict(strategy_metadata)
            if strategy_metadata is not None
            else await self.select_forecast_strategy(
                menu_item_id,
                horizon_days=horizon_days,
                model=model,
                sales_history=sales_history,
            )
        )
        future_dates = self._build_future_dates(horizon_days)

        model_type_used = strategy.get("model_type_used")
        if model_type_used == "gbm_primary":
            forecast_rows = await self._generate_primary_gbm_forecast(
                menu_item_id,
                horizon_days,
                model=model,
                future_dates=future_dates,
            )
            if forecast_rows:
                return forecast_rows, strategy

            fallback_strategy = self._select_non_gbm_strategy(
                strategy.get("history_summary")
                or await self._summarize_sales_history(sales_history),
                model_source="gbm_error_fallback",
                selection_reason="Primary H2O GBM forecasting failed, so the engine fell back to a non-GBM path.",
            )
            fallback_strategy["metrics"] = strategy.get("metrics") or {}
            fallback_strategy["history_summary"] = (
                strategy.get("history_summary")
                or await self._summarize_sales_history(sales_history)
            )
            strategy = fallback_strategy
            model_type_used = strategy.get("model_type_used")

        if model_type_used == "baseline":
            return (
                await self._generate_baseline_forecast(
                    menu_item_id,
                    horizon_days,
                    sales_history=sales_history,
                    future_dates=future_dates,
                ),
                strategy,
            )

        if model_type_used == "intermittent":
            return (
                await self._generate_intermittent_forecast(
                    menu_item_id,
                    horizon_days,
                    sales_history=sales_history,
                    future_dates=future_dates,
                ),
                strategy,
            )

        return self._generate_zero_forecast(future_dates), strategy

    def _json_safe_value(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {
                str(key): self._json_safe_value(item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [self._json_safe_value(item) for item in value]
        if isinstance(value, tuple):
            return [self._json_safe_value(item) for item in value]
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, np.integer):
            return int(value)
        if isinstance(value, np.floating):
            value = float(value)
        if isinstance(value, float):
            if math.isnan(value) or not math.isfinite(value):
                return None
            return round(value, 6)
        return value

    def _serialize_forecast_strategy_metadata(
        self,
        strategy_metadata: Optional[Dict[str, Any]],
        confidence_score: Optional[float],
    ) -> Optional[Dict[str, Any]]:
        if not strategy_metadata and confidence_score is None:
            return None

        serialized = self._json_safe_value(strategy_metadata or {})
        if not isinstance(serialized, dict):
            serialized = {}
        if confidence_score is not None:
            serialized["confidence_score"] = self._json_safe_value(confidence_score)
        return serialized or None

    def _build_persisted_forecast_strategy(
        self, forecast: Any
    ) -> Dict[str, Any]:
        strategy = {}
        raw_metadata = getattr(forecast, "model_metadata", None)
        if isinstance(raw_metadata, dict):
            strategy.update(raw_metadata)

        model_type_used = getattr(forecast, "model_type_used", None)
        if model_type_used:
            strategy.setdefault("model_type_used", model_type_used)

        model_source = getattr(forecast, "model_source", None)
        if model_source:
            strategy.setdefault("model_source", model_source)

        confidence_score = getattr(forecast, "confidence_score", None)
        if confidence_score is not None:
            strategy["confidence_score"] = float(confidence_score)

        return strategy

    @log_method("Should Retrain Forecast Model")
    async def should_retrain_model(
        self, menu_item_id: int, threshold_mape: float, threshold_r2: float
    ) -> bool:
        model = load_model(self.restaurant_id, menu_item_id, as_of_date=self.forecast_origin or date.today(), feature_version="calendar_v1")
        if model is None:
            logger.info(
                "[FORECAST] No persisted model found for menu_item %s; checking H2O availability for retraining",
                menu_item_id,
            )
            try:
                if not h2o.connection():
                    h2o.init()
                logger.info(
                    "[FORECAST] H2O available for menu_item %s; retraining is required because no model exists",
                    menu_item_id,
                )
            except Exception as exc:
                logger.warning(
                    "[FORECAST] H2O unavailable for menu_item %s; using fallback forecast instead of retraining: %s",
                    menu_item_id,
                    exc,
                )
                return False
            return True

        metrics = await self._compute_forecast_accuracy_metrics(menu_item_id)
        if not metrics:
            logger.info(
                "[FORECAST] No accuracy metrics available for menu_item %s; retraining is required",
                menu_item_id,
            )
            return True

        current_mape = metrics.get("mape")
        current_r2 = metrics.get("r2")

        retrain_needed = bool(
            (current_mape is None or current_mape > threshold_mape)
            or (current_r2 is None or current_r2 < threshold_r2)
        )

        if not retrain_needed:
            logger.info(
                "[FORECAST] Reusing persisted model for menu_item %s mape=%s r2=%s thresholds=(%s,%s)",
                menu_item_id,
                current_mape,
                current_r2,
                threshold_mape,
                threshold_r2,
            )
            return False

        try:
            if not h2o.connection():
                h2o.init()
            logger.info(
                "[FORECAST] H2O available for menu_item %s; retraining triggered mape=%s r2=%s thresholds=(%s,%s)",
                menu_item_id,
                current_mape,
                current_r2,
                threshold_mape,
                threshold_r2,
            )
        except Exception as exc:
            logger.warning(
                "[FORECAST] H2O unavailable for menu_item %s; skipping retrain and reusing existing model/fallback: %s",
                menu_item_id,
                exc,
            )
            return False

        return True

    @log_method("Train Forecast Model (H2O)")
    async def train_menu_item_model(
        self, menu_item_id: int, lookback_days: int = 90
    ) -> Tuple[Optional[Any], Dict[str, Optional[float]]]:
        logger.info(
            "[FORECAST] Training H2O model for menu_item %s lookback_days=%s",
            menu_item_id,
            lookback_days,
        )
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=(self.forecast_origin or date.today()) - timedelta(days=lookback_days),
            end_date=(self.forecast_origin or date.today()),
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            logger.warning(
                "[FORECAST] No sales history available for menu_item %s; skipping H2O training",
                menu_item_id,
            )
            return None, {"mape": None, "r2": None}

        feature_df = await self._build_feature_matrix(menu_item_id, lookback_days)
        if feature_df is None or feature_df.empty:
            logger.warning(
                "[FORECAST] Empty feature matrix for menu_item %s; skipping H2O training",
                menu_item_id,
            )
            return None, {"mape": None, "r2": None}

        logger.info(
            "[FORECAST] Feature matrix ready for menu_item %s rows=%s columns=%s",
            menu_item_id,
            len(feature_df),
            list(feature_df.columns),
        )

        MIN_ROWS_FOR_H2O = 20
        if len(feature_df) < MIN_ROWS_FOR_H2O:
            logger.warning(
                "Insufficient data to train H2O model for menu_item %s: %s rows < %s",
                menu_item_id,
                len(feature_df),
                MIN_ROWS_FOR_H2O,
            )
            return None, {"mape": None, "r2": None}

        feature_df["date"] = pd.to_datetime(feature_df["date"])
        feature_df = feature_df.sort_values("date").reset_index(drop=True)
        feature_df["day_of_week"] = feature_df["date"].dt.dayofweek.astype(int)
        feature_df["day"] = feature_df["date"].dt.day
        feature_df["month"] = feature_df["date"].dt.month
        feature_df["year"] = feature_df["date"].dt.year

        split_idx = int(len(feature_df) * 0.8)
        train_df = feature_df.iloc[:split_idx].reset_index(drop=True)
        valid_df = feature_df.iloc[split_idx:].reset_index(drop=True)

        base_features = ["day_of_week", "day", "month", "year"]
        extra_feats: List[str] = []
        X_train = train_df[base_features + extra_feats]
        y_train = train_df["quantity_sold"]
        X_valid = valid_df[base_features + extra_feats]
        y_valid = valid_df["quantity_sold"]

        numeric_features = [feature for feature in base_features + extra_feats if feature != "day_of_week"]
        for frame in (X_train, X_valid):
            for column in numeric_features:
                if column in frame.columns:
                    frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0.0)
        y_train = pd.to_numeric(y_train, errors="coerce").fillna(0.0)
        y_valid = pd.to_numeric(y_valid, errors="coerce").fillna(0.0)

        if not h2o.cluster().is_running():
            h2o.init()

        logger.info(
            "[FORECAST] Starting H2O GBM training for menu_item %s train_rows=%s valid_rows=%s",
            menu_item_id,
            len(train_df),
            len(valid_df),
        )

        train_h2o = h2o.H2OFrame(pd.concat([X_train.reset_index(drop=True), y_train.reset_index(drop=True)], axis=1))
        valid_h2o = h2o.H2OFrame(pd.concat([X_valid.reset_index(drop=True), y_valid.reset_index(drop=True)], axis=1))

        train_h2o["day_of_week"] = train_h2o["day_of_week"].asfactor()
        valid_h2o["day_of_week"] = valid_h2o["day_of_week"].asfactor()
        for column in numeric_features:
            if column in train_h2o.columns:
                train_h2o[column] = train_h2o[column].asnumeric()
            if column in valid_h2o.columns:
                valid_h2o[column] = valid_h2o[column].asnumeric()
        train_h2o["quantity_sold"] = train_h2o["quantity_sold"].asnumeric()
        valid_h2o["quantity_sold"] = valid_h2o["quantity_sold"].asnumeric()

        model = H2OGradientBoostingEstimator(
            ntrees=100,
            stopping_rounds=5,
            stopping_metric="RMSE",
            stopping_tolerance=0.001,
            seed=42,
        )

        try:
            model.train(
                x=base_features + extra_feats,
                y="quantity_sold",
                training_frame=train_h2o,
                validation_frame=valid_h2o,
            )
        except Exception as exc:  # pragma: no cover
            logger.error(
                "Error training H2O model for menu_item %s: %s",
                menu_item_id,
                exc,
            )
            return None, {"mape": None, "r2": None}

        preds = model.predict(valid_h2o).as_data_frame().values.flatten()
        true_y = valid_h2o["quantity_sold"].as_data_frame().values.flatten()

        if len(preds) != len(true_y):
            raise ValueError(
                f"Prediction shape {preds.shape} != true_y shape {true_y.shape}"
            )

        percentage_errors = np.abs(
            (true_y - preds) / np.where(true_y == 0, np.nan, true_y)
        ) * 100
        mape_metric = float(np.nanmean(percentage_errors))
        r2_metric = float(model.r2(valid=True))

        save_model(self.restaurant_id, menu_item_id, model, trained_through=self.forecast_origin or date.today(), feature_version="calendar_v1")
        logger.info(
            "[FORECAST] Completed H2O training for menu_item %s mape=%s r2=%s",
            menu_item_id,
            round(mape_metric, 4),
            round(r2_metric, 4),
        )
        return model, {"mape": mape_metric, "r2": r2_metric}

    @log_method("Build Feature Matrix (Advanced)")
    async def _build_feature_matrix(
        self, menu_item_id: int, lookback_days: int = 90
    ) -> pd.DataFrame:
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=(self.forecast_origin or date.today()) - timedelta(days=lookback_days),
            end_date=(self.forecast_origin or date.today()),
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            return pd.DataFrame()

        frame = await self._prepare_sales_dataframe(item_sales)
        daily = frame.reset_index().rename(columns={"index": "date"})
        if self.observations is not None:
            daily = daily[daily["date"].apply(lambda day: self.observations.status(day.date()) in {"complete", "closed"})]
        return daily

    @log_method("Ensure Weather For Range (Advanced)")
    async def ensure_weather_for_range(
        self, start_date: date, end_date: date, concurrency: int = 4
    ) -> None:
        try:
            from app.repositories.weather_data_repo import WeatherDataRepository
            from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date

            rest = await self.restaurant_repo.get_by_id(self.restaurant_id)
            if not rest:
                return
            lat = getattr(rest, "latitude", None)
            lon = getattr(rest, "longitude", None)
            if lat is None or lon is None:
                return

            weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
            existing = await weather_repo.get_range(
                self.restaurant_id, start_date, end_date
            )
            existing_dates = {w.weather_date for w in existing}
            missing = [
                d
                for d in pd.date_range(start_date, end_date).date
                if d not in existing_dates
            ]

            if not missing:
                return

            sema = asyncio.Semaphore(concurrency)
            tasks = []

            async def _task(day: date) -> None:
                async with sema:
                    try:
                        payload = await fetch_weather_for_date(float(lat), float(lon), day)
                        if payload:
                            await weather_repo.upsert_for_restaurant_date(
                                self.restaurant_id, day, payload
                            )
                            if getattr(self.db, "commit", None):
                                await self.db.flush()
                    except Exception as exc:
                        logger.debug(
                            "[WEATHER] Failed to fetch weather for %s: %s",
                            day,
                            exc,
                        )
                        return

            for missing_day in missing:
                tasks.append(asyncio.create_task(_task(missing_day)))

            if tasks:
                await asyncio.gather(*tasks)

        except Exception as exc:  # pragma: no cover
            logger.debug(
                "[WEATHER] ensure_weather_for_range aborted for %s-%s: %s",
                start_date,
                end_date,
                exc,
            )
            return

    @log_method("Generate Forecast (Advanced)")
    async def generate_forecast(
        self, menu_item_id: int, horizon_days: int = 14
    ) -> List[Dict[str, Any]]:
        forecast_rows, strategy_metadata = await self.generate_forecast_with_metadata(
            menu_item_id,
            horizon_days=horizon_days,
            model=load_model(self.restaurant_id, menu_item_id, as_of_date=self.forecast_origin or date.today(), feature_version="calendar_v1"),
        )
        self.latest_forecast_model_metadata[menu_item_id] = strategy_metadata
        return forecast_rows

    @log_method("Write Forecast Results (Advanced)")
    async def write_forecast_results(
        self,
        menu_item_id: int,
        forecast_data: List[Dict[str, Any]],
        confidence_score: Optional[float],
        strategy_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not forecast_data:
            return

        period_start = forecast_data[0]["forecast_date"]
        period_end = forecast_data[-1]["forecast_date"]

        daily_quantities = [Decimal(str(entry["predicted_quantity"])) for entry in forecast_data]
        total_adjusted_quantity = int(round(sum(daily_quantities)))

        resolved_confidence = (
            confidence_score
            if confidence_score is not None
            else self.menu_item_confidence.get(menu_item_id)
        )
        resolved_strategy = strategy_metadata or self.latest_forecast_model_metadata.get(
            menu_item_id
        )
        resolved_strategy = (
            resolved_strategy if isinstance(resolved_strategy, dict) else {}
        )

        forecast_payload = {
            "menu_item_id": menu_item_id,
            "restaurant_id": self.restaurant_id,
            "forecast_period_start": period_start,
            "forecast_period_end": period_end,
            "confidence_score": resolved_confidence,
            "adjusted_quantity": total_adjusted_quantity,
            "used_in_order_generation": 0,
            "forecast_version": 1,
            "model_type_used": resolved_strategy.get("model_type_used"),
            "model_source": resolved_strategy.get("model_source"),
            "model_metadata": self._serialize_forecast_strategy_metadata(
                resolved_strategy,
                resolved_confidence,
            ),
        }

        existing = await self.forecast_repo.get_by_period_and_menu_item(
            menu_item_id, period_start, period_end
        )
        if existing:
            next_version = await self.forecast_repo.get_next_forecast_version(menu_item_id)
            forecast_payload["forecast_version"] = next_version

        forecast = await self.forecast_repo.create(forecast_payload)
        forecast_id = forecast.forecast_id

        for entry, daily_quantity in zip(forecast_data, daily_quantities):
            breakdown_payload = {
                "forecast_id": forecast_id,
                "restaurant_id": self.restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_date": entry["forecast_date"],
                "forecasted_quantity": daily_quantity,
            }
            await self.forecast_breakdown_repo.create(breakdown_payload)
        return {"forecast_id": forecast_id, "forecast_version": forecast_payload["forecast_version"]}

    @log_method("Prepare Sales DataFrame")
    async def _prepare_sales_dataframe(self, sales_history: List[Any]) -> pd.DataFrame:
        if not sales_history:
            return pd.DataFrame(columns=["quantity_sold"])

        records = [
            {
                "sale_timestamp": sales_day(row),
                "quantity_sold": getattr(row, "quantity_sold", row.quantity_sold),
            }
            for row in sales_history
        ]

        df = pd.DataFrame(records)
        df["sale_date"] = pd.to_datetime(df["sale_timestamp"]).dt.date
        df = df.groupby("sale_date")["quantity_sold"].sum().sort_index()
        df.index = pd.to_datetime(df.index)
        df = df.reindex(pd.date_range(df.index.min(), self.forecast_origin or df.index.max(), freq="D"), fill_value=0)
        return df.to_frame()

    # ------------------------------------------------------------------
    # Ingredient/batch breakdown utilities (retained from legacy engine)
    # ------------------------------------------------------------------
    async def generate_batch_recipe_breakdown(
        self, forecast_breakdown: Dict[int, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        batch_breakdown: Dict[date, Dict[int, Decimal]] = defaultdict(
            lambda: defaultdict(Decimal)
        )
        batch_units: Dict[date, Dict[int, str]] = defaultdict(dict)

        for menu_item_id, data in forecast_breakdown.items():
            daily_breakdown = data.get("daily_breakdown", [])
            for forecast_date, predicted_quantity in daily_breakdown:
                predicted_qty_decimal = Decimal(str(predicted_quantity))

                menu_item_recipes = await self.menu_item_recipe_repo.get_by_menu_item(
                    menu_item_id
                )

                for mir in menu_item_recipes:
                    batch_requirements = await self._expand_recipe_batch_requirements(
                        mir.recipe_id,
                        predicted_qty_decimal,
                    )
                    for batch_recipe_id, total_qty in batch_requirements.items():
                        batch_breakdown[forecast_date][batch_recipe_id] += total_qty
                        if batch_recipe_id not in batch_units[forecast_date]:
                            batch_recipe = await self.batch_recipe_repo.get_by_id(
                                batch_recipe_id
                            )
                            batch_units[forecast_date][batch_recipe_id] = (
                                getattr(batch_recipe, "yield_unit", None) or "count"
                            )

        result: List[Dict[str, Any]] = []
        for forecast_date, batches in batch_breakdown.items():
            for batch_recipe_id, qty in batches.items():
                result.append(
                    {
                        "batch_recipe_id": batch_recipe_id,
                        "forecast_date": forecast_date,
                        "required_quantity": qty,
                        "unit": batch_units[forecast_date].get(batch_recipe_id, "count"),
                    }
                )
        return result

    async def generate_ingredient_breakdown(
        self,
        forecast_breakdown: List[Dict[str, Any]],
        batch_recipe_breakdown: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        ingredient_map: Dict[date, Dict[Tuple[int, str, int], Decimal]] = defaultdict(
            lambda: defaultdict(Decimal)
        )
        ingredient_ids_used: set[int] = set()

        for entry in forecast_breakdown:
            menu_item_id = entry["menu_item_id"]
            forecast_date = entry["forecast_date"]
            predicted_quantity = Decimal(str(entry["predicted_quantity"]))

            recipe_ids = await self.menu_item_recipe_repo.get_recipe_ids_for_menu_item(
                menu_item_id
            )

            for recipe_id in recipe_ids:
                ingredient_requirements = await self._expand_recipe_ingredient_requirements(
                    recipe_id,
                    predicted_quantity,
                )
                for ingredient_id, total_qty in ingredient_requirements.items():
                    ingredient_ids_used.add(ingredient_id)
                    ingredient_map[forecast_date][
                        (ingredient_id, "menu_item", menu_item_id)
                    ] += total_qty

        for batch in batch_recipe_breakdown:
            batch_recipe_id = batch["batch_recipe_id"]
            forecast_date = batch["forecast_date"]
            required_qty = Decimal(str(batch["required_quantity"]))

            batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
            batch_yield_unit = getattr(batch_recipe, "yield_unit", None) or "count"
            batch_required_unit = batch.get("unit") or batch_yield_unit
            if normalize_unit(batch_required_unit) != normalize_unit(batch_yield_unit):
                try:
                    required_qty = convert_unit(
                        required_qty,
                        batch_required_unit,
                        batch_yield_unit,
                    )
                except ValueError:
                    raise

            ingredient_requirements = await self._expand_batch_ingredient_requirements(
                batch_recipe_id,
                required_qty,
            )
            for ingredient_id, total_qty in ingredient_requirements.items():
                ingredient_ids_used.add(ingredient_id)
                ingredient_map[forecast_date][
                    (ingredient_id, "batch_recipe", batch_recipe_id)
                ] += total_qty

        ingredient_units: Dict[int, str] = {}
        for ingredient_id in ingredient_ids_used:
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            ingredient_units[ingredient_id] = ingredient.unit or "count"

        result: List[Dict[str, Any]] = []
        for forecast_date, ingredients in ingredient_map.items():
            for (ingredient_id, source_type, source_id), qty in ingredients.items():
                result.append(
                    {
                        "ingredient_id": ingredient_id,
                        "forecast_date": forecast_date,
                        "quantity": qty,
                        "source_type": source_type,
                        "source_id": source_id,
                        "unit": ingredient_units.get(ingredient_id, "count"),
                    }
                )

        return result

    def _recipe_expander(self, leaf_types=("ingredient", "batch")):
        return RecipeUsageExpander(self.recipe_ingredient_repo, self.ingredient_repo, self.batch_recipe_repo, leaf_types)

    async def _expand_recipe_batch_requirements(self, recipe_id, multiplier, visited=None):
        _, batches = await self._recipe_expander(("batch",)).expand(recipe_id, multiplier, visited)
        return batches

    async def _expand_recipe_ingredient_requirements(self, recipe_id, multiplier, visited=None):
        ingredients, _ = await self._recipe_expander(("ingredient",)).expand(recipe_id, multiplier, visited)
        return ingredients

    async def _expand_batch_ingredient_requirements(
        self,
        batch_recipe_id: int,
        required_quantity: Decimal,
        visited: Optional[set[int]] = None,
    ) -> Dict[int, Decimal]:
        visited = visited or set()
        if batch_recipe_id in visited:
            raise ValueError(
                f"Batch graph cycle detected while expanding batch recipe {batch_recipe_id}"
            )

        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
        if not batch_recipe:
            raise ValueError(
                f"Batch recipe {batch_recipe_id} not found while expanding ingredient requirements"
            )

        yield_qty = Decimal(str(batch_recipe.yield_quantity or 0))
        if not yield_qty.is_finite() or yield_qty <= 0:
            raise ValueError(
                f"Batch recipe {batch_recipe_id} has invalid yield quantity {batch_recipe.yield_quantity}"
            )

        visited.add(batch_recipe_id)
        ingredient_requirements: Dict[int, Decimal] = defaultdict(Decimal)
        components = await self.batch_recipe_ingredients_repo.get_by_batch_recipe_id(
            batch_recipe_id
        )

        for component in components:
            component_type = getattr(component, "ingredient_type", None)
            component_type = getattr(component_type, "value", component_type)
            if component_type not in {"ingredient", "batch"}:
                component_type = (
                    "ingredient"
                    if getattr(component, "ingredient_id", None) is not None
                    else "batch"
                )
            component_quantity = Decimal(str(component.quantity_used or 0))
            reference_id = getattr(component, "reference_id", None)
            if reference_id is None:
                reference_id = getattr(component, "ingredient_id", None)
            if not reference_id or not component_quantity.is_finite() or component_quantity < 0:
                raise ValueError("Invalid batch component quantity or reference")
            if component_quantity == 0:
                continue

            if component_type == "ingredient":
                ingredient = await self.ingredient_repo.get_by_id(reference_id)
                if not ingredient:
                    raise ValueError(f"Missing ingredient {reference_id}")

                ingredient_unit = getattr(ingredient, "unit", None) or component.unit or "count"
                if normalize_unit(component.unit or ingredient_unit) != normalize_unit(
                    ingredient_unit
                ):
                    try:
                        component_quantity = convert_unit(
                            component_quantity,
                            component.unit,
                            ingredient_unit,
                        )
                    except ValueError:
                        raise

                ingredient_requirements[int(reference_id)] += (
                    component_quantity / yield_qty
                ) * required_quantity
                continue

            nested_batch = await self.batch_recipe_repo.get_by_id(reference_id)
            if not nested_batch:
                raise ValueError(f"Missing child batch {reference_id}")

            nested_batch_unit = getattr(nested_batch, "yield_unit", None) or component.unit or "count"
            if normalize_unit(component.unit or nested_batch_unit) != normalize_unit(
                nested_batch_unit
            ):
                try:
                    component_quantity = convert_unit(
                        component_quantity,
                        component.unit,
                        nested_batch_unit,
                    )
                except ValueError:
                    raise

            nested_required_quantity = (component_quantity / yield_qty) * required_quantity
            nested_requirements = await self._expand_batch_ingredient_requirements(
                int(reference_id),
                nested_required_quantity,
                visited.copy(),
            )
            for ingredient_id, quantity in nested_requirements.items():
                ingredient_requirements[ingredient_id] += quantity

        return ingredient_requirements

    async def generate_batch_prep_suggestions(
        self,
        forecast_breakdown: Optional[Dict[int, Dict[str, Any]]] = None,
        horizon_days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Produce batch preparation suggestions for the upcoming horizon.

        Args:
            forecast_breakdown: Mapping of menu item ids to dictionaries that contain
                a ``daily_breakdown`` list of ``(date, predicted_quantity)`` tuples.
                When ``None`` we fall back to the latest menu item forecasts captured
                during ``run_forecasting_pipeline``.
            horizon_days: Number of days forward to consider when creating the prep
                plan. Defaults to 7.

        Returns:
            A list of dictionaries describing batch recipes, the target prep date,
            and the quantity to stage for that date.
        """

        if forecast_breakdown is None:
            if not self.latest_menu_item_forecasts:
                logger.info(
                    "[BATCH PREP] No forecast context available; returning empty suggestions."
                )
                return []

            forecast_breakdown = {
                menu_item_id: {
                    "daily_breakdown": data.get("daily_breakdown", []),
                }
                for menu_item_id, data in self.latest_menu_item_forecasts.items()
            }

        batch_breakdown = await self.generate_batch_recipe_breakdown(forecast_breakdown)
        if not batch_breakdown:
            logger.info(
                "[BATCH PREP] No batch recipe demand identified for next %s days.",
                horizon_days,
            )
            return []

        cutoff = (self.forecast_origin or date.today()) + timedelta(days=horizon_days)
        suggestions: List[Dict[str, Any]] = []
        for entry in batch_breakdown:
            forecast_date = entry.get("forecast_date")
            if forecast_date is None or forecast_date > cutoff:
                continue

            suggestions.append(
                {
                    "batch_recipe_id": entry.get("batch_recipe_id"),
                    "forecast_date": forecast_date,
                    "required_quantity": entry.get("required_quantity"),
                }
            )

        logger.info(
            "[BATCH PREP] Generated %s batch prep suggestions through %s.",
            len(suggestions),
            cutoff,
        )
        return suggestions

    async def aggregate_ingredient_demand_for_reorder(
        self, forecast_breakdown: List[Dict[str, Any]], days: int
    ) -> Dict[int, Dict[str, Any]]:
        today = (self.forecast_origin or date.today())
        cutoff_date = today + timedelta(days=days)

        aggregated: Dict[int, Dict[str, Any]] = defaultdict(
            lambda: {"total_quantity": Decimal(0), "unit": None, "daily_breakdown": []}
        )

        for entry in forecast_breakdown:
            forecast_date = entry["forecast_date"]
            if forecast_date > cutoff_date:
                continue

            ingredient_id = entry["ingredient_id"]
            qty = Decimal(entry["quantity"])

            aggregated[ingredient_id]["total_quantity"] += qty
            aggregated[ingredient_id]["daily_breakdown"].append((forecast_date, qty))

        for payload in aggregated.values():
            daily = defaultdict(Decimal)
            for day, quantity in payload["daily_breakdown"]:
                daily[day] += quantity
            payload["daily_breakdown"] = sorted(daily.items())

        for ingredient_id in aggregated:
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            aggregated[ingredient_id]["unit"] = ingredient.unit or "count"

        return aggregated

    async def _recover_persisted_aggregated_forecast(
        self,
        forecast_date: date,
        horizon_days: int,
        reorder_horizon_days: int,
    ) -> Dict[int, Dict[str, Any]]:
        end_date = forecast_date + timedelta(days=max(horizon_days - 1, 0))
        rows = await self.forecast_breakdown_repo.get_latest_by_date_range(
            start_date=forecast_date,
            end_date=end_date,
        )
        if not rows:
            return {}

        menu_item_forecast: Dict[int, Dict[str, Any]] = defaultdict(
            lambda: {"daily_breakdown": []}
        )
        for row in rows:
            menu_item_forecast[row.menu_item_id]["daily_breakdown"].append(
                (row.forecast_date, row.forecasted_quantity)
            )

        for data in menu_item_forecast.values():
            data["daily_breakdown"].sort(key=lambda item: item[0])

        for menu_item_id, data in menu_item_forecast.items():
            latest_forecast = await self.forecast_repo.get_latest_forecast_for_item(
                menu_item_id
            )
            if not latest_forecast:
                continue

            confidence_score = getattr(latest_forecast, "confidence_score", None)
            if confidence_score is not None:
                data["confidence_score"] = float(confidence_score)
                self.menu_item_confidence[menu_item_id] = float(confidence_score)

            strategy_metadata = self._build_persisted_forecast_strategy(
                latest_forecast
            )
            if strategy_metadata:
                data["forecast_strategy"] = strategy_metadata
                self.latest_forecast_model_metadata[menu_item_id] = strategy_metadata

        batch_data = await self.generate_batch_recipe_breakdown(menu_item_forecast)
        ingredient_data = await self.generate_ingredient_breakdown(
            convert_forecast_dict_to_list(menu_item_forecast),
            batch_data,
        )
        aggregated = await self.aggregate_ingredient_demand_for_reorder(
            ingredient_data,
            reorder_horizon_days,
        )

        self.latest_menu_item_forecasts = dict(menu_item_forecast)
        self.latest_batch_breakdown = batch_data
        self.latest_ingredient_breakdown = ingredient_data
        self.latest_aggregated_ingredient_demand = aggregated
        return aggregated

    async def _reset_ledger_for_rerun(self, ledger: Any) -> None:
        ledger.running = False
        ledger.finalized = False
        ledger.accuracy_evaluated = False
        ledger.daily_accuracy_evaluated = False
        ledger.forecasts_generated = False
        ledger.batch_breakdown_calculated = False
        ledger.ingredient_breakdown_calculated = False
        ledger.menu_items_processed = 0
        ledger.menu_items_total = 0
        ledger.current_step = None
        ledger.started_at = None
        ledger.finished_at = None
        ledger.durations = {}
        ledger.errors = []
        await self.db.flush()

    def log_forecast_metadata(
        self, forecast_version: int, used_in_order_generation: bool
    ) -> None:
        logger.debug(
            "[FORECAST] Metadata - version: %s used_in_order_generation: %s",
            forecast_version,
            used_in_order_generation,
        )

    @log_method("Run Forecasting Pipeline (Advanced)")
    @serialized_job("forecast")
    async def run_forecasting_pipeline(
        self,
        forecast_date: Optional[date] = None,
        horizon_days: int = 30,
        reorder_horizon_days: int = 30,
        threshold_mape: float = 0.20,
        threshold_r2: float = 0.70,
        commit: bool = True,
    ) -> Dict[int, Dict[str, Any]]:
        forecast_date = forecast_date or date.today()
        horizon_days = max(horizon_days, reorder_horizon_days)
        self.forecast_origin = forecast_date
        stage_start_time = datetime.utcnow()

        # Get or create ledger for this run
        ledger = await self.forecast_run_ledger_repo.get_or_create(forecast_date)

        # Holding the connection-owned lock proves any prior running flag is stale.
        ledger.running = False
        ledger.errors = []
        snapshot = getattr(ledger, "result_snapshot", None)
        if ledger.finalized and isinstance(snapshot, dict) and snapshot.get("version") == 1:
            restored = restore(snapshot)
            if restored.get("horizon_days") != horizon_days or restored.get("reorder_horizon_days") != reorder_horizon_days:
                raise ValueError("Forecast snapshot horizon differs; explicitly regenerate this run")
            self.latest_menu_item_forecasts = restored["menus"]
            self.latest_batch_breakdown = restored["batches"]
            self.latest_ingredient_breakdown = restored["ingredients"]
            self.latest_material_plan = restored.get("material_plan", {})
            self.latest_aggregated_ingredient_demand = restored["aggregated"]
            return restored["aggregated"]

        if ledger.finalized or ledger.forecasts_generated:
            await self._reset_ledger_for_rerun(ledger)

        try:
            # Mark as running
            await self.forecast_run_ledger_repo.mark_running(ledger)
            logger.info(
                "[FORECAST] Starting pipeline for restaurant %s on %s",
                self.restaurant_id,
                forecast_date,
            )

            self.observations = await DemandObservations.load(self.db, self.restaurant_id)
            # Validate sales data exists
            sales_exist = await self.sales_repo.sales_exist_for_dates([forecast_date])
            if not sales_exist and self.observations.status(forecast_date) not in {"complete", "closed"}:
                message = (
                    f"No sales data found for {forecast_date} for restaurant {self.restaurant_id}"
                )
                await self._raise_alert(
                    alert_type="MissingSalesData",
                    message=message,
                    severity="urgent",
                )
                logger.error("[FORECAST] %s", message)
                await self.forecast_run_ledger_repo.record_error(
                    ledger, "validation", message
                )
                ledger.running = False
                if commit:
                    await self.db.commit()
                raise ValueError(message)

            # Stage 1: Evaluate accuracy (skip if already done)
            if not ledger.accuracy_evaluated:
                stage_start = datetime.utcnow()
                await self.evaluate_and_record_accuracy(forecast_date)
                duration_ms = int((datetime.utcnow() - stage_start).total_seconds() * 1000)
                await self.forecast_run_ledger_repo.mark_stage_complete(
                    ledger, "accuracy_evaluated", duration_ms
                )
                await self.db.flush()
                logger.info("[FORECAST] Accuracy evaluation completed in %dms", duration_ms)

            # Stage 2: Evaluate daily accuracy (skip if already done)
            if not ledger.daily_accuracy_evaluated:
                stage_start = datetime.utcnow()
                await self.evaluate_and_record_daily_forecast_accuracy(forecast_date)
                duration_ms = int((datetime.utcnow() - stage_start).total_seconds() * 1000)
                await self.forecast_run_ledger_repo.mark_stage_complete(
                    ledger, "daily_accuracy_evaluated", duration_ms
                )
                await self.db.flush()
                logger.info("[FORECAST] Daily accuracy evaluation completed in %dms", duration_ms)

            # Stage 3: Generate forecasts (skip if already done)
            menu_item_forecast: Dict[int, Dict[str, Any]] = {}
            
            stage_start = datetime.utcnow()
                
            menu_items = await self.menu_item_repo.get_active_menu_items()
            if not menu_items:
                logger.warning(
                    "[FORECAST] No active menu items found for restaurant %s",
                    self.restaurant_id,
                )
                raise ValueError("No active menu items found")

            # Update total count
            await self.forecast_run_ledger_repo.update_progress(
                ledger, 0, len(menu_items)
            )
            await self.db.flush()

            for idx, item in enumerate(menu_items):
                menu_item_id = item.menu_item_id
                retrain = await self.should_retrain_model(
                    menu_item_id, threshold_mape, threshold_r2
                )
                logger.info(
                    "[FORECAST] Menu item %s retrain_decision=%s",
                    menu_item_id,
                    retrain,
                )

                if retrain:
                    model, metrics = await self.train_menu_item_model(menu_item_id)
                    self.accuracy_metrics[menu_item_id] = metrics or {}
                    model_source = (
                        "trained_h2o"
                        if model is not None
                        else "fallback_after_failed_train"
                    )
                    logger.info(
                        "[FORECAST] Menu item %s model_source=%s metrics=%s",
                        menu_item_id,
                        model_source,
                        self.accuracy_metrics[menu_item_id],
                    )
                else:
                    model = load_model(self.restaurant_id, menu_item_id, as_of_date=self.forecast_origin or date.today(), feature_version="calendar_v1")
                    metrics = await self._compute_forecast_accuracy_metrics(menu_item_id)
                    self.accuracy_metrics[menu_item_id] = metrics or {}
                    model_source = (
                        "loaded_h2o"
                        if model is not None
                        else "fallback_without_model"
                    )
                    logger.info(
                        "[FORECAST] Menu item %s model_source=%s metrics=%s",
                        menu_item_id,
                        model_source,
                        self.accuracy_metrics[menu_item_id],
                    )

                sales_history = await self._get_menu_item_sales_history(menu_item_id)
                strategy_metadata = await self.select_forecast_strategy(
                    menu_item_id,
                    horizon_days=horizon_days,
                    model=model,
                    model_source=model_source,
                    metrics=self.accuracy_metrics.get(menu_item_id),
                    sales_history=sales_history,
                )
                forecast_rows, strategy_metadata = await self.generate_forecast_with_metadata(
                    menu_item_id,
                    horizon_days=horizon_days,
                    strategy_metadata=strategy_metadata,
                    model=model,
                    sales_history=sales_history,
                )
                if not forecast_rows:
                    raise ValueError(f"No usable forecast for active menu item {menu_item_id}")

                confidence_score = self._derive_confidence_score(
                    self.accuracy_metrics.get(menu_item_id)
                )
                self.menu_item_confidence[menu_item_id] = confidence_score
                strategy_metadata = dict(strategy_metadata)
                strategy_metadata["confidence_score"] = confidence_score
                strategy_metadata["feature_contract"] = "calendar_v1"
                strategy_metadata["forecast_origin"] = forecast_date.isoformat()
                first_observed = min((sales_day(sale) for sale in sales_history), default=forecast_date)
                quality = self.observations.quality(first_observed, forecast_date)
                strategy_metadata["history_quality"] = quality
                self.latest_forecast_model_metadata[menu_item_id] = strategy_metadata

                logger.info(
                    "[FORECAST] Menu item %s strategy=%s model_source=%s reason=%s",
                    menu_item_id,
                    strategy_metadata.get("model_type_used"),
                    strategy_metadata.get("model_source"),
                    strategy_metadata.get("selection_reason"),
                )

                persisted_header = await self.write_forecast_results(
                    menu_item_id,
                    forecast_rows,
                    confidence_score,
                    strategy_metadata,
                )

                menu_item_forecast[menu_item_id] = {
                    **(persisted_header or {}),
                    "daily_breakdown": [
                        (row["forecast_date"], row["predicted_quantity"]) for row in forecast_rows
                    ],
                    "confidence_score": confidence_score,
                    "forecast_strategy": strategy_metadata,
                }

                # Update progress
                await self.forecast_run_ledger_repo.update_progress(
                    ledger, idx + 1, len(menu_items)
                )
                await self.db.flush()

            duration_ms = int((datetime.utcnow() - stage_start).total_seconds() * 1000)
            await self.forecast_run_ledger_repo.mark_stage_complete(
                ledger, "forecasts_generated", duration_ms
            )
            await self.db.flush()
            logger.info("[FORECAST] Forecast generation completed in %dms", duration_ms)

            if not menu_item_forecast:
                logger.warning(
                    "[FORECAST] No forecasts generated for restaurant %s",
                    self.restaurant_id,
                )
                raise ValueError("No usable forecasts were generated")

            # Stage 4: Generate batch breakdown (skip if already done)
            batch_data = []
            stage_start = datetime.utcnow()
            batch_data = await self.generate_batch_recipe_breakdown(menu_item_forecast)
            self.latest_batch_breakdown = batch_data
            duration_ms = int((datetime.utcnow() - stage_start).total_seconds() * 1000)
            await self.forecast_run_ledger_repo.mark_stage_complete(
                ledger, "batch_breakdown_calculated", duration_ms
            )
            await self.db.flush()
            logger.info("[FORECAST] Batch breakdown completed in %dms", duration_ms)

            # Stage 5: Generate ingredient breakdown (skip if already done)
            ingredient_data = []
            aggregated = {}
            stage_start = datetime.utcnow()
            flat_forecast_list = convert_forecast_dict_to_list(menu_item_forecast)
            direct_ingredients = await self.generate_ingredient_breakdown(flat_forecast_list, [])
            from app.services.prep_planning_service import PrepPlanningService
            material_plan = await PrepPlanningService(self.db, self.restaurant_id).build(batch_data, direct_ingredients)
            self.latest_material_plan = material_plan
            ingredient_data = material_plan["ingredients"]
            aggregated = await self.aggregate_ingredient_demand_for_reorder(
                ingredient_data, reorder_horizon_days
            )
            self.latest_ingredient_breakdown = ingredient_data
            self.latest_aggregated_ingredient_demand = aggregated
            duration_ms = int((datetime.utcnow() - stage_start).total_seconds() * 1000)
            await self.forecast_run_ledger_repo.mark_stage_complete(
                ledger, "ingredient_breakdown_calculated", duration_ms
            )
            await self.db.flush()
            logger.info("[FORECAST] Ingredient breakdown completed in %dms", duration_ms)

            if ledger.errors:
                raise ValueError("One or more forecast items failed; inspect the run errors before retrying")

            # The persisted outputs freeze quantities, units, recipe expansion and model metadata.
            ledger.result_snapshot = encode({"version": 1, "run_date": forecast_date,
                "horizon_days": horizon_days, "reorder_horizon_days": reorder_horizon_days,
                "menus": menu_item_forecast, "batches": batch_data,
                "ingredients": ingredient_data, "aggregated": aggregated, "material_plan": material_plan,
                "history_quality": {"review_required": any(data["forecast_strategy"].get("history_quality", {}).get("review_required", False) for data in menu_item_forecast.values()),
                    "items": {item_id: data["forecast_strategy"].get("history_quality") for item_id, data in menu_item_forecast.items()}}})
            self.latest_menu_item_forecasts = menu_item_forecast
            await self.forecast_run_ledger_repo.finalize(ledger)
            if commit:
                await self.db.commit()

            total_duration_ms = int((datetime.utcnow() - stage_start_time).total_seconds() * 1000)
            logger.info(
                "[FORECAST] Pipeline completed for %s on %s in %dms",
                self.restaurant_id,
                forecast_date,
                total_duration_ms,
            )

            return aggregated

        except Exception as e:
            # Rollback on error and record in ledger
            await self.db.rollback()
            error_message = f"Pipeline failed: {str(e)}"
            logger.exception("[FORECAST] %s", error_message)
            
            try:
                ledger = await self.forecast_run_ledger_repo.get_or_create(forecast_date)
                await self.forecast_run_ledger_repo.record_error(
                    ledger, "pipeline_execution", error_message
                )
                ledger.running = False
                ledger.finalized = False
                if commit:
                    await self.db.commit()
            except Exception as ledger_error:
                logger.exception("[FORECAST] Failed to record error in ledger: %s", ledger_error)
            
            raise

    async def derive_ingredient_usage_from_sales(
        self, days: int = 30
    ) -> Dict[int, Dict[date, Decimal]]:
        end_date = self.forecast_origin or date.today()
        start_date = end_date - timedelta(days=max(days - 1, 0))
        sales = await self.sales_repo.get_sales_between_dates(start_date, end_date)

        fake_forecast: Dict[int, Dict[date, int]] = defaultdict(lambda: defaultdict(int))
        for sale in sales:
            fake_forecast[sale.menu_item_id][sales_day(sale)] += sale.quantity_sold

        forecast_breakdown: List[Dict[str, Any]] = []
        for menu_item_id, date_map in fake_forecast.items():
            for forecast_date, predicted_quantity in date_map.items():
                forecast_breakdown.append(
                    {
                        "menu_item_id": menu_item_id,
                        "forecast_date": forecast_date,
                        "predicted_quantity": predicted_quantity,
                    }
                )

        batch_breakdown = await self.generate_batch_recipe_breakdown(
            {mid: {"daily_breakdown": list(date_qty.items())} for mid, date_qty in fake_forecast.items()}
        )

        ingredient_usage = await self.generate_ingredient_breakdown(
            forecast_breakdown, batch_breakdown
        )

        usage_by_ingredient: Dict[int, Dict[date, Decimal]] = defaultdict(
            lambda: defaultdict(Decimal)
        )
        for entry in ingredient_usage:
            ingredient_id = entry["ingredient_id"]
            forecast_date = entry["forecast_date"]
            quantity = Decimal(entry["quantity"])
            usage_by_ingredient[ingredient_id][forecast_date] += quantity

        return usage_by_ingredient


def convert_forecast_dict_to_list(
    forecast_dict: Dict[int, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    flat: List[Dict[str, Any]] = []
    for menu_item_id, data in forecast_dict.items():
        for forecast_date, qty in data.get("daily_breakdown", []):
            flat.append(
                {
                    "menu_item_id": menu_item_id,
                    "forecast_date": forecast_date,
                    "predicted_quantity": qty,
                }
            )
    return flat
