from typing import Any, Dict, List, Optional, Tuple

import asyncio
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

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
    Advanced forecasting engine used by Pro/Master tiers.
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
        self.latest_menu_item_forecasts: Dict[
            int, Dict[str, List[Tuple[date, float]]]
        ] = {}
        self.latest_batch_breakdown: List[Dict[str, Any]] = []
        self.latest_ingredient_breakdown: List[Dict[str, Any]] = []
        self.latest_aggregated_ingredient_demand: Dict[int, Dict[str, Any]] = {}
        self.menu_item_confidence: Dict[int, Optional[float]] = {}

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

        sales_for_day = await self.sales_repo.get_by_date(evaluation_date)
        actual_by_item: Dict[int, int] = defaultdict(int)
        for sale in sales_for_day:
            actual_by_item[sale.menu_item_id] += sale.quantity_sold

        for breakdown in forecast_breakdowns:
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
                "predicted_quantity": int(predicted_quantity),
                "actual_quantity": int(actual_quantity),
                "forecast_error": int(forecast_error),
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
                    actual_by_day[sale.sale_timestamp.date()] += sale.quantity_sold

            abs_percentage_errors = []
            squared_errors = []
            actuals: List[float] = []
            predictions: List[float] = []

            total_actual = 0
            total_predicted = 0

            for b in breakdowns:
                forecast_day = b.forecast_date
                predicted_qty = b.forecasted_quantity
                actual_qty = actual_by_day.get(forecast_day, 0)
                total_actual += actual_qty
                total_predicted += predicted_qty

                error = mape(predicted_qty, actual_qty)
                abs_percentage_errors.append(float(error))
                squared_errors.append((actual_qty - predicted_qty) ** 2)
                actuals.append(actual_qty)
                predictions.append(predicted_qty)

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
                    "sale_date": s.sale_timestamp.date(),
                    "quantity_sold": s.quantity_sold,
                }
                for s in sales_data
            ]
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

        r2 = r2_score(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        mse = mean_squared_error(y_true, y_pred)
        rmse = mse ** 0.5

        return {
            "mape": computed_mape,
            "r2": r2,
            "mae": mae,
            "mse": mse,
            "rmse": rmse,
        }

    def _derive_confidence_score(
        self, metrics: Optional[Dict[str, Optional[float]]]
    ) -> Optional[float]:
        if not metrics:
            return None

        components: List[float] = []

        mape_value = metrics.get("mape")
        if mape_value is not None and not np.isnan(mape_value):
            components.append(max(0.0, min(1.0, 1 - (float(mape_value) / 100.0))))

        r2_value = metrics.get("r2")
        if r2_value is not None and not np.isnan(r2_value):
            normalized_r2 = float(r2_value)
            if normalized_r2 < 0:
                normalized_r2 = (normalized_r2 + 1.0) / 2.0
            components.append(max(0.0, min(1.0, normalized_r2)))

        if not components:
            return None

        return round(sum(components) / len(components), 3)

    @log_method("Should Retrain Forecast Model")
    async def should_retrain_model(
        self, menu_item_id: int, threshold_mape: float, threshold_r2: float
    ) -> bool:
        model = load_model(self.restaurant_id, menu_item_id)
        if model is None:
            try:
                if not h2o.connection():
                    h2o.init()
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
            return True

        current_mape = metrics.get("mape")
        current_r2 = metrics.get("r2")

        retrain_needed = bool(
            (current_mape is None or current_mape > threshold_mape)
            or (current_r2 is None or current_r2 < threshold_r2)
        )

        if not retrain_needed:
            return False

        try:
            if not h2o.connection():
                h2o.init()
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
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=lookback_days),
            end_date=date.today(),
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            return None, {"mape": None, "r2": None}

        feature_df = await self._build_feature_matrix(menu_item_id, lookback_days)
        if feature_df is None or feature_df.empty:
            return None, {"mape": None, "r2": None}

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
        train_df = feature_df.iloc[:split_idx]
        valid_df = feature_df.iloc[split_idx:]

        base_features = ["day_of_week", "day", "month", "year"]
        extra_feats: List[str] = []
        for col in [
            "prev_forecasted_quantity",
            "prev_error_percentage",
            "lag_1",
            "lag_7",
            "temp_lag_1",
            "temp_roll_7",
            "precip_lag_1",
        ]:
            if col in feature_df.columns:
                extra_feats.append(col)

        X_train = train_df[base_features + extra_feats]
        y_train = train_df["quantity_sold"]
        X_valid = valid_df[base_features + extra_feats]
        y_valid = valid_df["quantity_sold"]

        if not h2o.cluster().is_running():
            h2o.init()

        train_h2o = h2o.H2OFrame(
            pd.concat([X_train, y_train.reset_index(drop=True)], axis=1)
        )
        valid_h2o = h2o.H2OFrame(
            pd.concat([X_valid, y_valid.reset_index(drop=True)], axis=1)
        )

        train_h2o["day_of_week"] = train_h2o["day_of_week"].asfactor()
        valid_h2o["day_of_week"] = valid_h2o["day_of_week"].asfactor()
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

        save_model(self.restaurant_id, menu_item_id, model)
        return model, {"mape": mape_metric, "r2": r2_metric}

    @log_method("Build Feature Matrix (Advanced)")
    async def _build_feature_matrix(
        self, menu_item_id: int, lookback_days: int = 90
    ) -> pd.DataFrame:
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=lookback_days),
            end_date=date.today(),
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            return pd.DataFrame()

        from datetime import datetime as _dt

        sales_dates = [
            s.sale_timestamp.date() if isinstance(s.sale_timestamp, _dt) else s.sale_timestamp
            for s in item_sales
        ]

        sales_df = pd.DataFrame(
            {
                "date": sales_dates,
                "quantity_sold": [s.quantity_sold for s in item_sales],
            }
        )
        daily = sales_df.groupby("date")["quantity_sold"].sum().reset_index()
        daily["date"] = pd.to_datetime(daily["date"]).dt.date

        try:
            if getattr(self, "db", None):
                await self.ensure_weather_for_range(
                    daily["date"].min(), daily["date"].max()
                )
        except Exception:  # pragma: no cover
            pass

        try:
            breakdowns = await self.forecast_breakdown_repo.get_latest_by_date_range(
                start_date=daily["date"].min(),
                end_date=daily["date"].max(),
            )
        except Exception:
            breakdowns = []

        if breakdowns:
            fb_df = pd.DataFrame(
                [
                    {
                        "date": b.forecast_date,
                        "prev_forecasted_quantity": b.forecasted_quantity,
                        "menu_item_id": b.menu_item_id,
                    }
                    for b in breakdowns
                    if b.menu_item_id == menu_item_id
                ]
            )
            if not fb_df.empty:
                fb_df["date"] = pd.to_datetime(fb_df["date"]).dt.date
                daily = pd.merge(
                    daily, fb_df[["date", "prev_forecasted_quantity"]], on="date", how="left"
                )
            else:
                daily["prev_forecasted_quantity"] = pd.NA
        else:
            daily["prev_forecasted_quantity"] = pd.NA

        try:
            accs = await self.daily_forecast_accuracy_repo.get_by_date_range(
                daily["date"].min(), daily["date"].max()
            )
        except Exception:
            accs = []

        if accs:
            acc_df = pd.DataFrame(
                [
                    {
                        "date": a.forecast_date,
                        "prev_error_percentage": a.error_percentage,
                        "menu_item_id": a.menu_item_id,
                    }
                    for a in accs
                    if a.menu_item_id == menu_item_id
                ]
            )
            if not acc_df.empty:
                acc_df["date"] = pd.to_datetime(acc_df["date"]).dt.date
                daily = pd.merge(
                    daily, acc_df[["date", "prev_error_percentage"]], on="date", how="left"
                )
            else:
                daily["prev_error_percentage"] = pd.NA
        else:
            daily["prev_error_percentage"] = pd.NA

        try:
            from app.repositories.weather_data_repo import WeatherDataRepository

            weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
            weather_rows = await weather_repo.get_range(
                self.restaurant_id,
                daily["date"].min(),
                daily["date"].max(),
            )
        except Exception:
            weather_rows = []

        if weather_rows:
            weather_df = pd.DataFrame(
                [
                    {
                        "date": row.weather_date,
                        "temperature": float(row.temperature)
                        if getattr(row, "temperature", None) is not None
                        else None,
                        "precipitation_mm": float(row.precipitation_mm)
                        if getattr(row, "precipitation_mm", None) is not None
                        else None,
                    }
                    for row in weather_rows
                ]
            )
            weather_df["date"] = pd.to_datetime(weather_df["date"]).dt.date
            daily = pd.merge(daily, weather_df, on="date", how="left")
        else:
            daily["temperature"] = pd.NA
            daily["precipitation_mm"] = pd.NA

        daily["has_weather"] = daily["temperature"].notna().astype(int)
        if "temperature" in daily.columns:
            try:
                daily["temperature"] = pd.to_numeric(daily["temperature"]).astype(float)
                daily["temperature"] = daily["temperature"].fillna(
                    daily["temperature"].mean()
                )
            except Exception:
                daily["temperature"] = daily["temperature"].fillna(0.0)
        if "precipitation_mm" in daily.columns:
            try:
                daily["precipitation_mm"] = pd.to_numeric(
                    daily["precipitation_mm"]
                ).astype(float)
                daily["precipitation_mm"] = daily["precipitation_mm"].fillna(0.0)
            except Exception:
                daily["precipitation_mm"] = daily["precipitation_mm"].fillna(0.0)

        MIN_EXOG_DAYS = 30
        include_weather = int(daily.get("has_weather", pd.Series([])).sum() or 0) >= MIN_EXOG_DAYS
        if include_weather:
            try:
                daily = daily.sort_values("date").reset_index(drop=True)
                daily["temp_lag_1"] = (
                    daily["temperature"].shift(1).fillna(method="bfill").astype(float)
                )
                daily["temp_roll_7"] = (
                    daily["temperature"].rolling(window=7, min_periods=1).mean()
                    .fillna(method="bfill")
                    .astype(float)
                )
                daily["precip_lag_1"] = (
                    daily["precipitation_mm"].shift(1).fillna(0.0).astype(float)
                )
            except Exception:
                daily["temp_lag_1"] = 0.0
                daily["temp_roll_7"] = 0.0
                daily["precip_lag_1"] = 0.0
        else:
            daily["temp_lag_1"] = 0.0
            daily["temp_roll_7"] = 0.0
            daily["precip_lag_1"] = 0.0

        daily = daily.sort_values("date").reset_index(drop=True)
        daily["lag_1"] = daily["quantity_sold"].shift(1).fillna(0).astype(float)
        daily["lag_7"] = daily["quantity_sold"].shift(7).fillna(0).astype(float)

        daily["prev_forecasted_quantity"] = pd.to_numeric(
            daily["prev_forecasted_quantity"].fillna(0)
        ).astype(float)
        daily["prev_error_percentage"] = pd.to_numeric(
            daily["prev_error_percentage"].fillna(0)
        ).astype(float)

        daily["forecast_error"] = (
            daily["quantity_sold"] - daily["prev_forecasted_quantity"]
        ).astype(float)
        daily["forecast_error_pct"] = daily.apply(
            lambda row: (row["forecast_error"] / row["quantity_sold"] * 100.0)
            if row["quantity_sold"] != 0
            else 0.0,
            axis=1,
        )

        daily["rolling_error_7"] = (
            daily["forecast_error"].rolling(window=7, min_periods=1).mean().fillna(0).astype(float)
        )
        daily["prev_forecast_ratio"] = daily.apply(
            lambda r: (
                r["prev_forecasted_quantity"] / (r["lag_7"] + 1e-3)
                if (r["lag_7"] + 1e-3) != 0
                else 0.0
            ),
            axis=1,
        )
        daily["quantity_sold"] = pd.to_numeric(daily["quantity_sold"]).astype(float)

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
                                await self.db.commit()
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
        model = load_model(self.restaurant_id, menu_item_id)

        future_dates = [date.today() + timedelta(days=i) for i in range(horizon_days)]
        df = pd.DataFrame({"date": future_dates})
        df["date"] = pd.to_datetime(df["date"])
        df["day_of_week"] = df["date"].dt.dayofweek
        df["day"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["year"] = df["date"].dt.year

        features_df = df[["day_of_week", "day", "month", "year"]].copy()

        if model is not None:
            try:
                future_weather_map: Dict[date, Dict[str, float]] = {}
                if getattr(self, "db", None):
                    from app.integrations.weather.open_meteo_adapter import (
                        fetch_forecast_for_range,
                    )

                    restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
                    if (
                        restaurant
                        and getattr(restaurant, "latitude", None) is not None
                        and getattr(restaurant, "longitude", None) is not None
                    ):
                        start_dt = date.today()
                        end_dt = date.today() + timedelta(days=horizon_days - 1)
                        future_weather_map = await fetch_forecast_for_range(
                            float(restaurant.latitude),
                            float(restaurant.longitude),
                            start_dt,
                            end_dt,
                        )

                try:
                    from app.repositories.weather_data_repo import WeatherDataRepository

                    weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
                    observed_rows = await weather_repo.get_range(
                        self.restaurant_id,
                        date.today() - timedelta(days=7),
                        date.today(),
                    )
                    observed_rows = sorted(
                        observed_rows, key=lambda r: r.weather_date
                    )
                    past_temps = [
                        float(r.temperature)
                        for r in observed_rows
                        if getattr(r, "temperature", None) is not None
                    ]
                    past_precips = [
                        float(r.precipitation_mm)
                        for r in observed_rows
                        if getattr(r, "precipitation_mm", None) is not None
                    ]
                except Exception:
                    past_temps = []
                    past_precips = []

                future_temps = [
                    future_weather_map.get(d, {}).get("temperature")
                    if future_weather_map
                    else None
                    for d in future_dates
                ]
                future_precips = [
                    future_weather_map.get(d, {}).get("precipitation_mm")
                    if future_weather_map
                    else 0.0
                    for d in future_dates
                ]

                combined_temps = list(past_temps) if past_temps else [0.0]
                temp_lag_1_list: List[float] = []
                temp_roll_7_list: List[float] = []
                for idx, ft in enumerate(future_temps):
                    prev_temp = combined_temps[-1] if combined_temps else 0.0
                    temp_lag_1_list.append(prev_temp)
                    window = (
                        combined_temps + [t for t in future_temps[:idx] if t is not None]
                    )[-7:]
                    temp_roll_7_list.append(
                        float(sum(window) / len(window)) if window else 0.0
                    )
                    combined_temps.append(ft if ft is not None else prev_temp)

                combined_precips = list(past_precips) if past_precips else [0.0]
                precip_lag_1_list: List[float] = []
                for idx, fp in enumerate(future_precips):
                    prev_prec = combined_precips[-1] if combined_precips else 0.0
                    precip_lag_1_list.append(prev_prec)
                    combined_precips.append(fp if fp is not None else 0.0)

                features_df = features_df.reset_index(drop=True)
                features_df["temp_lag_1"] = temp_lag_1_list[: len(features_df)]
                features_df["temp_roll_7"] = temp_roll_7_list[: len(features_df)]
                features_df["precip_lag_1"] = precip_lag_1_list[: len(features_df)]

                h2o_frame = h2o.H2OFrame(features_df)
                preds = model.predict(h2o_frame).as_data_frame().values.flatten()
                result = [
                    {
                        "forecast_date": day,
                        "predicted_quantity": max(0.0, float(pred)),
                    }
                    for day, pred in zip(future_dates, preds)
                ]
                logger.info("[FORECAST] H2O forecast for menu_item %s: %s", menu_item_id, result)
                return result
            except Exception as exc:
                logger.error(
                    "Error generating forecast with H2O model for %s: %s",
                    menu_item_id,
                    exc,
                )

        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=90), end_date=date.today()
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            fallback = [
                {"forecast_date": d, "predicted_quantity": 0.0} for d in future_dates
            ]
            logger.info(
                "[FORECAST] Fallback forecast (no history) for menu_item %s: %s",
                menu_item_id,
                fallback,
            )
            return fallback

        df_sales = pd.DataFrame(
            {
                "date": [s.sale_timestamp.date() for s in item_sales],
                "quantity_sold": [s.quantity_sold for s in item_sales],
            }
        )

        daily = df_sales.groupby("date")["quantity_sold"].sum().reset_index()
        daily["date"] = pd.to_datetime(daily["date"]).dt.date
        daily["dow"] = pd.to_datetime(daily["date"]).dt.dayofweek

        weekday_means = daily.groupby("dow")["quantity_sold"].mean().to_dict()
        last_n_mean = (
            daily.sort_values("date").tail(14)["quantity_sold"].mean()
            if not daily.empty
            else 0.0
        )

        fallback_result = []
        for d in future_dates:
            dow = pd.to_datetime(d).dayofweek
            wm = weekday_means.get(dow, last_n_mean or 0.0)
            pred = 0.6 * wm + 0.4 * (last_n_mean or 0.0)
            fallback_result.append(
                {
                    "forecast_date": d,
                    "predicted_quantity": float(max(pred, 0.0)),
                }
            )

        logger.info(
            "[FORECAST] Fallback blended forecast for menu_item %s: %s",
            menu_item_id,
            fallback_result,
        )
        return fallback_result

    @log_method("Write Forecast Results (Advanced)")
    async def write_forecast_results(
        self, menu_item_id: int, forecast_data: List[Dict[str, Any]], confidence_score: Optional[float]
    ) -> None:
        if not forecast_data:
            return

        period_start = forecast_data[0]["forecast_date"]
        period_end = forecast_data[-1]["forecast_date"]

        daily_rounded = [int(round(entry["predicted_quantity"])) for entry in forecast_data]
        total_adjusted_quantity = sum(daily_rounded)

        resolved_confidence = (
            confidence_score
            if confidence_score is not None
            else self.menu_item_confidence.get(menu_item_id)
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
        }

        existing = await self.forecast_repo.get_by_period_and_menu_item(
            menu_item_id, period_start, period_end
        )
        if existing:
            next_version = await self.forecast_repo.get_next_forecast_version(menu_item_id)
            forecast_payload["forecast_version"] = next_version

        forecast = await self.forecast_repo.create(forecast_payload)
        forecast_id = forecast.forecast_id

        for entry, rounded_qty in zip(forecast_data, daily_rounded):
            breakdown_payload = {
                "forecast_id": forecast_id,
                "restaurant_id": self.restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_date": entry["forecast_date"],
                "forecasted_quantity": rounded_qty,
            }
            await self.forecast_breakdown_repo.create(breakdown_payload)

    @log_method("Prepare Sales DataFrame")
    def _prepare_sales_dataframe(self, sales_history: List[Any]) -> pd.DataFrame:
        if not sales_history:
            return pd.DataFrame(columns=["quantity_sold"])

        records = [
            {
                "sale_timestamp": getattr(row, "sale_timestamp", row.sale_timestamp),
                "quantity_sold": getattr(row, "quantity_sold", row.quantity_sold),
            }
            for row in sales_history
        ]

        df = pd.DataFrame(records)
        df["sale_date"] = pd.to_datetime(df["sale_timestamp"]).dt.date
        df = df.groupby("sale_date")["quantity_sold"].sum().sort_index()
        df = df.asfreq("D", fill_value=0)
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

        result: List[Dict[str, Any]] = []
        for forecast_date, batches in batch_breakdown.items():
            for batch_recipe_id, qty in batches.items():
                result.append(
                    {
                        "batch_recipe_id": batch_recipe_id,
                        "forecast_date": forecast_date,
                        "required_quantity": round(qty, 2),
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
            yield_qty = Decimal(batch_recipe.yield_quantity or 1)

            batch_ingredients = (
                await self.batch_recipe_ingredients_repo.get_by_batch_recipe_id(
                    batch_recipe_id
                )
            )

            for bi in batch_ingredients:
                if getattr(bi, "ingredient_type", None) != "ingredient":
                    continue
                ingredient_id = bi.reference_id
                unit_qty = Decimal(bi.quantity_used or 0)
                ingredient_unit = normalize_unit(bi.unit or "count")
                batch_yield_unit = normalize_unit(batch_recipe.yield_unit or "count")

                try:
                    qty_in_yield_unit = convert_unit(
                        unit_qty, ingredient_unit, batch_yield_unit
                    )
                except ValueError:
                    qty_in_yield_unit = unit_qty

                total_qty = (qty_in_yield_unit / yield_qty) * required_qty
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
                        "quantity": round(qty, 2),
                        "source_type": source_type,
                        "source_id": source_id,
                        "unit": ingredient_units.get(ingredient_id, "count"),
                    }
                )

        return result

    async def _expand_recipe_batch_requirements(
        self,
        recipe_id: int,
        multiplier: Decimal,
        visited: Optional[set[int]] = None,
    ) -> Dict[int, Decimal]:
        visited = visited or set()
        if recipe_id in visited:
            raise ValueError(f"Recipe graph cycle detected while expanding recipe {recipe_id}")

        visited.add(recipe_id)
        recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(recipe_id)
        batch_requirements: Dict[int, Decimal] = defaultdict(Decimal)

        for component in recipe_ingredients:
            component_type = getattr(component, "ingredient_type", "ingredient")
            component_multiplier = Decimal(str(component.quantity_used or 0)) * multiplier
            if component_type == "batch":
                batch_requirements[int(component.reference_id)] += component_multiplier
            elif component_type == "recipe":
                nested_requirements = await self._expand_recipe_batch_requirements(
                    int(component.reference_id),
                    component_multiplier,
                    visited.copy(),
                )
                for batch_recipe_id, qty in nested_requirements.items():
                    batch_requirements[batch_recipe_id] += qty

        return batch_requirements

    async def _expand_recipe_ingredient_requirements(
        self,
        recipe_id: int,
        multiplier: Decimal,
        visited: Optional[set[int]] = None,
    ) -> Dict[int, Decimal]:
        visited = visited or set()
        if recipe_id in visited:
            raise ValueError(f"Recipe graph cycle detected while expanding recipe {recipe_id}")

        visited.add(recipe_id)
        recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(recipe_id)
        ingredient_requirements: Dict[int, Decimal] = defaultdict(Decimal)

        for component in recipe_ingredients:
            component_type = getattr(component, "ingredient_type", "ingredient")
            component_multiplier = Decimal(str(component.quantity_used or 0)) * multiplier

            if component_type == "ingredient":
                ingredient_requirements[int(component.reference_id)] += component_multiplier
            elif component_type == "recipe":
                nested_requirements = await self._expand_recipe_ingredient_requirements(
                    int(component.reference_id),
                    component_multiplier,
                    visited.copy(),
                )
                for ingredient_id, qty in nested_requirements.items():
                    ingredient_requirements[ingredient_id] += qty

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

        cutoff = date.today() + timedelta(days=horizon_days)
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
        today = date.today()
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
    async def run_forecasting_pipeline(
        self,
        forecast_date: Optional[date] = None,
        horizon_days: int = 30,
        reorder_horizon_days: int = 30,
        threshold_mape: float = 0.20,
        threshold_r2: float = 0.70,
    ) -> Dict[int, Dict[str, Any]]:
        forecast_date = forecast_date or datetime.utcnow().date()
        stage_start_time = datetime.utcnow()

        # Get or create ledger for this run
        ledger = await self.forecast_run_ledger_repo.get_or_create(forecast_date)

        # Check if already running
        if ledger.running:
            logger.warning(
                "[FORECAST] Pipeline already running for %s on %s (lock_token: %s)",
                self.restaurant_id,
                forecast_date,
                ledger.lock_token,
            )
            return {}

        # Check if already finalized
        if ledger.finalized:
            recovered = await self._recover_persisted_aggregated_forecast(
                forecast_date=forecast_date,
                horizon_days=horizon_days,
                reorder_horizon_days=reorder_horizon_days,
            )
            if recovered:
                logger.info(
                    "[FORECAST] Reused persisted forecast results for %s on %s",
                    self.restaurant_id,
                    forecast_date,
                )
                return recovered

            logger.info(
                "[FORECAST] Finalized ledger had no reusable persisted forecast rows for %s on %s; resetting for rerun",
                self.restaurant_id,
                forecast_date,
            )
            await self._reset_ledger_for_rerun(ledger)

        try:
            # Mark as running
            await self.forecast_run_ledger_repo.mark_running(ledger)
            logger.info(
                "[FORECAST] Starting pipeline for restaurant %s on %s",
                self.restaurant_id,
                forecast_date,
            )

            # Validate sales data exists
            sales_exist = await self.sales_repo.sales_exist_for_dates([forecast_date])
            if not sales_exist:
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
                await self.forecast_run_ledger_repo.finalize(ledger)
                await self.db.commit()
                return {}

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
            
            if not ledger.forecasts_generated:
                stage_start = datetime.utcnow()
                
                menu_items = await self.menu_item_repo.get_active_menu_items()
                if not menu_items:
                    logger.warning(
                        "[FORECAST] No active menu items found for restaurant %s",
                        self.restaurant_id,
                    )
                    await self.forecast_run_ledger_repo.finalize(ledger)
                    await self.db.commit()
                    return {}

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

                    if retrain:
                        model, metrics = await self.train_menu_item_model(menu_item_id)
                        self.accuracy_metrics[menu_item_id] = metrics or {}
                    else:
                        model = load_model(self.restaurant_id, menu_item_id)
                        metrics = await self._compute_forecast_accuracy_metrics(menu_item_id)
                        self.accuracy_metrics[menu_item_id] = metrics or {}

                    if model is None:
                        logger.debug(
                            "[FORECAST] Using fallback forecast for menu_item %s (model missing)",
                            menu_item_id,
                        )

                    forecast_rows = await self.generate_forecast(menu_item_id, horizon_days)
                    if not forecast_rows:
                        continue

                    confidence_score = self._derive_confidence_score(
                        self.accuracy_metrics.get(menu_item_id)
                    )
                    self.menu_item_confidence[menu_item_id] = confidence_score

                    await self.write_forecast_results(menu_item_id, forecast_rows, confidence_score)

                    menu_item_forecast[menu_item_id] = {
                        "daily_breakdown": [
                            (row["forecast_date"], row["predicted_quantity"]) for row in forecast_rows
                        ],
                        "confidence_score": confidence_score,
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
                await self.forecast_run_ledger_repo.finalize(ledger)
                await self.db.commit()
                return {}

            # Stage 4: Generate batch breakdown (skip if already done)
            batch_data = []
            if not ledger.batch_breakdown_calculated:
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
            if not ledger.ingredient_breakdown_calculated:
                stage_start = datetime.utcnow()
                flat_forecast_list = convert_forecast_dict_to_list(menu_item_forecast)
                ingredient_data = await self.generate_ingredient_breakdown(
                    flat_forecast_list, batch_data
                )
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

            # Finalize ledger
            self.latest_menu_item_forecasts = menu_item_forecast
            await self.forecast_run_ledger_repo.finalize(ledger)
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
                await self.forecast_run_ledger_repo.record_error(
                    ledger, "pipeline_execution", error_message
                )
                await self.forecast_run_ledger_repo.finalize(ledger)
                await self.db.commit()
            except Exception as ledger_error:
                logger.exception("[FORECAST] Failed to record error in ledger: %s", ledger_error)
            
            raise

    async def derive_ingredient_usage_from_sales(
        self, days: int = 30
    ) -> Dict[int, Dict[date, Decimal]]:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        sales = await self.sales_repo.get_sales_between_dates(start_date, end_date)

        fake_forecast: Dict[int, Dict[date, int]] = defaultdict(lambda: defaultdict(int))
        for sale in sales:
            fake_forecast[sale.menu_item_id][sale.sale_timestamp] += sale.quantity_sold

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
