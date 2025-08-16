from typing import List, Dict, Tuple, Optional, Any
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statistics import mean
from datetime import date, timedelta
from sklearn.linear_model import LinearRegression
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import joblib
from app.services.utils.model_path import save_model, load_model
from app.services.utils.metrics import smape, mape
from app.repositories.sales_repo import SalesRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.repositories.forecast_accuracy_repo import ForecastAccuracyRepository
from app.repositories.forecast_breakdown_repo import ForecastBreakdownRepository
from app.repositories.daily_forecast_accuracy_repo import DailyForecastAccuracyRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.alerts_repo import AlertRepository
import logging
from app.utils.logger_helpers import log_method
from app.core.logging import logger

import h2o
from h2o.estimators import H2OGradientBoostingEstimator

class ForecastingEngineBasic:
    def __init__(self, db, restaurant_id):
        self.db = db
        self.restaurant_id = restaurant_id
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db,restaurant_id)
        self.forecast_repo = ForecastRepository(db, restaurant_id)
        self.forecast_accuracy_repo = ForecastAccuracyRepository(db,restaurant_id)
        self.daily_forecast_accuracy_repo = DailyForecastAccuracyRepository(db,restaurant_id)
        self.forecast_breakdown_repo = ForecastBreakdownRepository(db,restaurant_id)
        self.restaurant_repo = RestaurantRepository(db,restaurant_id)
        self.alerts_repo = AlertRepository(db,restaurant_id)
        self.models = {}  # menu_item_id -> model instance
        self.accuracy_metrics = {}  # menu_item_id -> accuracy dict

    async def _raise_alert(self, alert_type: str, message: str, severity="warning", meta=None, employee_id=None):
        await self.alerts_repo.create({
            "restaurant_id": self.restaurant_id,
            "employee_id": employee_id,
            "role": "system",
            "alert_type": alert_type,
            "message": message,
            "severity": severity,
            "meta": meta or {},
        })
    @log_method("Evaluating and Recording Daily Forecast Accuracy")
    async def evaluate_and_record_daily_forecast_accuracy(self, evaluation_date: date):
        forecast_breakdowns = await self.forecast_breakdown_repo.get_forecasts_for_date(evaluation_date)
        if not forecast_breakdowns:
            logger.error(f"No forecast breakdowns found for {evaluation_date}")
            return

        for breakdown in forecast_breakdowns:
            predicted_quantity = breakdown.forecasted_quantity
            actual_quantity = await self.sales_repo.get_total_quantity_sold_by_item_and_date(
                breakdown.menu_item_id, breakdown.forecast_date)

            forecast_error = predicted_quantity - actual_quantity
            error_percentage = mape(predicted_quantity, actual_quantity)

            exists = await self.daily_forecast_accuracy_repo.exists_for_breakdown(breakdown.breakdown_id)
            if not exists:
                accuracy_data = {
                "breakdown_id": breakdown.breakdown_id,
                "restaurant_id": breakdown.restaurant_id,
                "menu_item_id": breakdown.menu_item_id,
                "forecast_date": breakdown.forecast_date,
                "predicted_quantity": int(predicted_quantity),
                "actual_quantity": int(actual_quantity),
                "forecast_error": int(forecast_error),
                "error_percentage": round(float(error_percentage), 2)
            }

                logger.info(f"[ACCURACY] Daily Accuracy: {accuracy_data}")
                await self.daily_forecast_accuracy_repo.create(accuracy_data)
                if getattr(self, 'db', None) and getattr(self.db, 'commit', None):
                    await self.db.commit()

    @log_method("Evalutating and Recoding Forecast Accuracy")
    async def evaluate_and_record_accuracy(self, forecast_date: date):
        check_until = forecast_date - timedelta(days=1)
        past_forecasts = await self.forecast_repo.get_forecasts_ending_before(check_until)
        if not past_forecasts:
            logger.error(f"[ACCURACY] No forecasts ending before {check_until} to evaluate.")
            return

        logger.info(f"[ACCURACY] Evaluating {len(past_forecasts)} forecasts ending before {check_until}...")


        for forecast in past_forecasts:
            forecast_id = forecast.forecast_id
            menu_item_id = forecast.menu_item_id
            restaurant_id = forecast.restaurant_id

            existing_accuracy = await self.forecast_accuracy_repo.get_by_forecast_id(forecast_id)
            if existing_accuracy:
                continue

            breakdowns = await self.forecast_breakdown_repo.get_by_forecast(forecast_id)
            if not breakdowns:
                continue

            abs_percentage_errors = []
            squared_errors = []
            actuals = []
            predictions = []

            total_actual = 0
            total_predicted = 0

            for b in breakdowns:
                forecast_day = b.forecast_date
                predicted_qty = b.forecasted_quantity

                actual_qty = await self.sales_repo.get_total_quantity_sold_by_item_and_date(menu_item_id, forecast_day)
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
                "restaurant_id": restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_version": forecast.forecast_version or 1,
                "forecast_period_start": forecast.forecast_period_start,
                "forecast_period_end": forecast.forecast_period_end,
                "predicted_quantity": int(total_predicted),
                "actual_quantity": int(total_actual),
                "forecast_error": int(abs(total_predicted - total_actual)),
                "error_percentage": round(mean_smape, 2),
                # optionally add r2 here if you want
            }

            logger.info(f'[ACCURACY] Forecast accuracy data: {accuracy_data}')
            await self.forecast_accuracy_repo.create(accuracy_data)
            if getattr(self, 'db', None) and getattr(self.db, 'commit', None):
                await self.db.commit()
       
    @log_method("Compute Forecast Accuracy Metrics")
    async def _compute_forecast_accuracy_metrics(self, menu_item_id: int) -> dict:
        print('inside compute forecast accuracy')
        latest_forecast = await self.forecast_repo.get_latest_forecast_for_item(menu_item_id)
        if not latest_forecast:
            return {}

        forecast_id = latest_forecast.forecast_id
        breakdowns = await self.forecast_breakdown_repo.get_by_forecast(forecast_id)
        if not breakdowns:
            return {}

        forecast_df = pd.DataFrame([
            {
                "forecast_date": b.forecast_date,
                "predicted_quantity": b.forecasted_quantity,
            } for b in breakdowns
        ])

        sales_data = await self.sales_repo.get_sales_by_menu_item(menu_item_id)
        sales_df = pd.DataFrame([
            {
                "sale_date": s.sale_timestamp.date(),
                "quantity_sold": s.quantity_sold
            } for s in sales_data
        ])
        sales_df = sales_df.groupby("sale_date")["quantity_sold"].sum().reset_index()

        # Merge predicted and actual sales
        merged = pd.merge(forecast_df, sales_df, how="left", left_on="forecast_date", right_on="sale_date")
        merged["quantity_sold"] = merged["quantity_sold"].fillna(0)

        y_true = merged["quantity_sold"]
        y_pred = merged["predicted_quantity"]

        if y_true.empty or y_pred.empty:
            return {}

        # Calculate MAPE safely avoiding division by zero
        nonzero_mask = y_true != 0
        if nonzero_mask.sum() == 0:
            mape = None  # cannot compute MAPE if no nonzero true values
        else:
            mape = (abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])).mean()

        r2 = r2_score(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        mse = mean_squared_error(y_true, y_pred)
        rmse = mse ** 0.5

        return {
            "mape": mape,
            "r2": r2,
            "mae": mae,
            "mse": mse,
            "rmse": rmse,
        }

    @log_method("Should Retrain Model")
    async def should_retrain_model(self, menu_item_id: int, threshold_mape: float, threshold_r2: float) -> bool:
        #Init h2o before laoding models 
        if not h2o.connection():
            h2o.init()
        model = load_model(self.restaurant_id, menu_item_id)
        if model is None:
            return True

        metrics = await self._compute_forecast_accuracy_metrics(menu_item_id)
        if not metrics:
            return True

        return (
            (metrics["mape"] is None or metrics["mape"] > threshold_mape) or
            (metrics["r2"] is None or metrics["r2"] < threshold_r2)
        )
    @log_method("Train Model")
    async def train_model(self, menu_item_id: int, lookback_days: int = 90):
        # Load sales data for item
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=lookback_days),
            end_date=date.today()
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            # No data to train: tests that create the service with db=None expect None
            if getattr(self, 'db', None) is None:
                return None
            return None, {"mape": None, "r2": None}

        # Build enriched feature matrix merging sales, previous forecasts, and daily accuracy
        feature_df = await self._build_feature_matrix(menu_item_id, lookback_days)
        if feature_df is None or feature_df.empty:
            # No data to train
            if getattr(self, 'db', None) is None:
                return None
            return None, {"mape": None, "r2": None}

        # Defensive: if the dataset is too small for H2O GBM training, skip and return
        # a safe sentinel so EOD can continue without raising H2O errors.
        MIN_ROWS_FOR_H2O = 20
        if len(feature_df) < MIN_ROWS_FOR_H2O:
            logger.warning(f"Insufficient data to train H2O model for menu_item {menu_item_id}: "
                           f"{len(feature_df)} rows < {MIN_ROWS_FOR_H2O}. Skipping H2O training.")
            if getattr(self, 'db', None) is None:
                return None
            return None, {"mape": None, "r2": None}

        # Features: use calendar features + any available forecast/accuracy features
        feature_df['date'] = pd.to_datetime(feature_df['date'])
        feature_df = feature_df.sort_values('date').reset_index(drop=True)
        feature_df['day_of_week'] = feature_df['date'].dt.dayofweek.astype(int)
        feature_df['day'] = feature_df['date'].dt.day
        feature_df['month'] = feature_df['date'].dt.month
        feature_df['year'] = feature_df['date'].dt.year

        split_idx = int(len(feature_df) * 0.8)
        train_df = feature_df.iloc[:split_idx]
        valid_df = feature_df.iloc[split_idx:]

        base_features = ['day_of_week', 'day', 'month', 'year']
        # Include accuracy-related features if present
        extra_feats = []
        if 'prev_forecasted_quantity' in feature_df.columns:
            extra_feats.append('prev_forecasted_quantity')
        if 'prev_error_percentage' in feature_df.columns:
            extra_feats.append('prev_error_percentage')
        if 'lag_1' in feature_df.columns:
            extra_feats.append('lag_1')
        if 'lag_7' in feature_df.columns:
            extra_feats.append('lag_7')

        X_train = train_df[base_features + extra_feats]
        y_train = train_df['quantity_sold']
        X_valid = valid_df[base_features + extra_feats]
        y_valid = valid_df['quantity_sold']

        # Initialize H2O
        if not h2o.cluster().is_running():
            h2o.init()

        train_h2o = h2o.H2OFrame(pd.concat([X_train, y_train.reset_index(drop=True)], axis=1))
        valid_h2o = h2o.H2OFrame(pd.concat([X_valid, y_valid.reset_index(drop=True)], axis=1))

        train_h2o['day_of_week'] = train_h2o['day_of_week'].asfactor()
        valid_h2o['day_of_week'] = valid_h2o['day_of_week'].asfactor()

        train_h2o['quantity_sold'] = train_h2o['quantity_sold'].asnumeric()
        valid_h2o['quantity_sold'] = valid_h2o['quantity_sold'].asnumeric()

        # Optional validation of category levels
        train_levels = set(train_h2o['day_of_week'].levels()[0])
        valid_levels = set(valid_h2o['day_of_week'].levels()[0])
        missing_levels = valid_levels - train_levels
        if missing_levels:
            logger.warning(f"Warning: Validation set has unseen day_of_week levels: {missing_levels}")

        features = ['day_of_week', 'day', 'month', 'year']
        target = 'quantity_sold'

        model = H2OGradientBoostingEstimator(
            ntrees=100,
            stopping_rounds=5,
            stopping_metric="RMSE",
            stopping_tolerance=0.001,
            seed=42
        )

        try:
            model.train(x=features, y=target, training_frame=train_h2o, validation_frame=valid_h2o)
        except Exception as e:
            # Catch H2O training errors and return safely so EOD doesn't crash.
            logger.error(f"Error training H2O model for menu_item {menu_item_id}: {e}")
            return None, {"mape": None, "r2": None}

        preds = model.predict(valid_h2o).as_data_frame().values.flatten()
        true_y = valid_h2o[target].as_data_frame().values.flatten()

        if len(preds) != len(true_y):
            raise ValueError(f"Prediction shape {preds.shape} != true_y shape {true_y.shape}")

        # Calculate percentage errors for each valid entry (true_y != 0)
        percentage_errors = np.abs((true_y - preds) / np.where(true_y == 0, np.nan, true_y)) * 100

        # Compute mean ignoring NaNs (in case of zero true_y)
        mape = np.nanmean(percentage_errors)
        r2 = model.r2(valid=True)

        save_model(self.restaurant_id,menu_item_id, model)
        return model, {"mape": mape, "r2": r2}

    @log_method("Build Feature Matrix")
    async def _build_feature_matrix(self, menu_item_id: int, lookback_days: int = 90):
        """
        Build a DataFrame of daily rows including:
          - date
          - quantity_sold (target)
          - prev_forecasted_quantity (if present for that date, from latest breakdown)
          - prev_error_percentage (from daily_forecast_accuracy table, if present for that breakdown)
          - simple lags (lag_1, lag_7)

        Returns a pandas.DataFrame or empty DataFrame.
        """
        # Load sales
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=lookback_days),
            end_date=date.today()
        )
        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            return pd.DataFrame()

        # sale_timestamp may be a datetime or a date depending on test helpers; handle both
        from datetime import datetime as _dt, date as _date
        sales_dates = [
            (s.sale_timestamp.date() if isinstance(s.sale_timestamp, _dt) else s.sale_timestamp)
            for s in item_sales
        ]

        sales_df = pd.DataFrame({
            "date": sales_dates,
            "quantity_sold": [s.quantity_sold for s in item_sales],
        })
        daily = sales_df.groupby("date")["quantity_sold"].sum().reset_index()
        daily["date"] = pd.to_datetime(daily["date"]).dt.date

        # Ensure weather data exists for the date range (backfill missing days lazily)
        # Use the service-level helper so we can reuse it for future forecasts as well
        try:
            if getattr(self, 'db', None):
                await self.ensure_weather_for_range(daily['date'].min(), daily['date'].max())
        except Exception:
            # best-effort only
            pass

        # Try to load latest forecast breakdowns for the same date range
        # We will attempt to join on forecast_date with latest breakdown per date
        # Use repository helper get_latest_by_date_range on forecast_breakdown
        try:
            breakdowns = await self.forecast_breakdown_repo.get_latest_by_date_range(
                start_date=daily['date'].min(), end_date=daily['date'].max()
            )
        except Exception:
            breakdowns = []

        if breakdowns:
            fb_df = pd.DataFrame([
                {"date": b.forecast_date, "prev_forecasted_quantity": b.forecasted_quantity, "menu_item_id": b.menu_item_id}
                for b in breakdowns if b.menu_item_id == menu_item_id
            ])
            if not fb_df.empty:
                fb_df["date"] = pd.to_datetime(fb_df["date"]).dt.date
                daily = pd.merge(daily, fb_df[['date', 'prev_forecasted_quantity']], on='date', how='left')
            else:
                # No breakdowns for this specific menu_item_id; ensure column exists
                daily['prev_forecasted_quantity'] = pd.NA
        else:
            daily['prev_forecasted_quantity'] = pd.NA

        # Try to join daily forecast accuracy
        try:
            accs = await self.daily_forecast_accuracy_repo.get_by_date_range(daily['date'].min(), daily['date'].max())
        except Exception:
            accs = []

        if accs:
            acc_df = pd.DataFrame([
                {"date": a.forecast_date, "prev_error_percentage": a.error_percentage, "menu_item_id": a.menu_item_id}
                for a in accs if a.menu_item_id == menu_item_id
            ])
            if not acc_df.empty:
                acc_df['date'] = pd.to_datetime(acc_df['date']).dt.date
                daily = pd.merge(daily, acc_df[['date', 'prev_error_percentage']], on='date', how='left')
            else:
                # No accuracy rows for this menu_item_id; ensure column exists
                daily['prev_error_percentage'] = pd.NA
        else:
            daily['prev_error_percentage'] = pd.NA

        # Merge weather data (if available) to avoid calling external API on every run
        try:
            from app.repositories.weather_data_repo import WeatherDataRepository
            weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
            w_rows = []
            try:
                w_rows = await weather_repo.get_range(self.restaurant_id, daily['date'].min(), daily['date'].max())
            except Exception:
                w_rows = []

            if w_rows:
                wdf = pd.DataFrame([{
                    'date': w.weather_date,
                    'temperature': float(w.temperature) if w.temperature is not None else None,
                    'precipitation_mm': float(w.precipitation_mm) if getattr(w, 'precipitation_mm', None) is not None else None,
                } for w in w_rows])
                wdf['date'] = pd.to_datetime(wdf['date']).dt.date
                daily = pd.merge(daily, wdf, on='date', how='left')
            else:
                daily['temperature'] = pd.NA
                daily['precipitation_mm'] = pd.NA
        except Exception:
            daily['temperature'] = pd.NA
            daily['precipitation_mm'] = pd.NA

        # create flags and simple imputation for weather
        daily['has_weather'] = daily['temperature'].notna().astype(int)
        if 'temperature' in daily.columns:
            try:
                daily['temperature'] = pd.to_numeric(daily['temperature']).astype(float)
                daily['temperature'] = daily['temperature'].fillna(daily['temperature'].mean())
            except Exception:
                daily['temperature'] = daily['temperature'].fillna(0.0)
        if 'precipitation_mm' in daily.columns:
            try:
                daily['precipitation_mm'] = pd.to_numeric(daily['precipitation_mm']).astype(float)
                daily['precipitation_mm'] = daily['precipitation_mm'].fillna(0.0)
            except Exception:
                daily['precipitation_mm'] = daily['precipitation_mm'].fillna(0.0)

        # Weather-derived features: only include if we have enough exogenous coverage
        MIN_EXOG_DAYS = 30
        try:
            num_with_weather = int(daily['has_weather'].sum())
        except Exception:
            num_with_weather = 0

        include_weather_features = num_with_weather >= MIN_EXOG_DAYS
        if include_weather_features:
            # Simple lags/rolling aggregates for temperature and precipitation
            try:
                daily['temp_lag_1'] = daily['temperature'].shift(1).fillna(method='bfill').astype(float)
                daily['temp_roll_7'] = daily['temperature'].rolling(window=7, min_periods=1).mean().fillna(method='bfill').astype(float)
                daily['precip_lag_1'] = daily['precipitation_mm'].shift(1).fillna(0.0).astype(float)
            except Exception:
                daily['temp_lag_1'] = 0.0
                daily['temp_roll_7'] = 0.0
                daily['precip_lag_1'] = 0.0
        else:
            # Ensure columns exist for downstream model code but keep zeros
            daily['temp_lag_1'] = 0.0
            daily['temp_roll_7'] = 0.0
            daily['precip_lag_1'] = 0.0

        # Create simple lags and additional engineered features
        daily = daily.sort_values('date').reset_index(drop=True)
        # Basic lags
        daily['lag_1'] = daily['quantity_sold'].shift(1).fillna(0).astype(float)
        daily['lag_7'] = daily['quantity_sold'].shift(7).fillna(0).astype(float)

        # Fill missing prev_* with zeros for model stability and ensure numeric types
        daily['prev_forecasted_quantity'] = pd.to_numeric(daily['prev_forecasted_quantity'].fillna(0)).astype(float)
        daily['prev_error_percentage'] = pd.to_numeric(daily['prev_error_percentage'].fillna(0)).astype(float)

        # Forecast error and percentage error (use quantity_sold as denominator where possible)
        daily['forecast_error'] = (daily['quantity_sold'] - daily['prev_forecasted_quantity']).astype(float)
        # percentage relative to actual (avoid div by zero)
        daily['forecast_error_pct'] = daily.apply(
            lambda r: (r['forecast_error'] / r['quantity_sold'] * 100.0) if r['quantity_sold'] != 0 else 0.0,
            axis=1
        )

        # Rolling statistics of recent forecast errors
        daily['rolling_error_7'] = daily['forecast_error'].rolling(window=7, min_periods=1).mean().fillna(0).astype(float)

        # Ratio of previous forecast to recent activity (stabilize denominator)
        daily['prev_forecast_ratio'] = daily.apply(
            lambda r: (r['prev_forecasted_quantity'] / (r['lag_7'] + 1e-3)) if (r['lag_7'] + 1e-3) != 0 else 0.0,
            axis=1
        )

        # Keep consistent dtypes
        daily['quantity_sold'] = pd.to_numeric(daily['quantity_sold']).astype(float)

        return daily

    @log_method("Generating Forecast")
    async def generate_forecast(self, menu_item_id: int, horizon_days: int = 14):
        """
        Generate forecast for a menu item for next `horizon_days`.
        Returns list of dicts: [{'forecast_date': date, 'predicted_quantity': float}, ...]
        """
        # Try to load trained model; if not present, we'll generate a deterministic fallback forecast
        model = load_model(self.restaurant_id, menu_item_id)

        # Keep legacy test behavior: if no model and no DB (unit tests), return empty list
        if model is None and getattr(self, 'db', None) is None:
            return []

        # Prepare future dates DataFrame
        future_dates = [date.today() + timedelta(days=i) for i in range(horizon_days)]
        df = pd.DataFrame({'date': future_dates})
        df['date'] = pd.to_datetime(df['date']) 

        df['day_of_week'] = df['date'].dt.dayofweek
        df['day'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['year'] = df['date'].dt.year

        features = ['day_of_week', 'day', 'month', 'year']

        features_df = df[features]

        if model is not None:
            try:
                # Convert to H2O frame and predict
                # Ensure we have weather for the forecast horizon (best-effort). This will
                # populate `weather_data` for these future dates so downstream feature
                # assembly (if using exogenous features) can pick them up and models
                # can benefit from forecasts of exogenous variables.
                # Strategy: observed weather (stored in DB) is used for training and
                # for historical features. For the future horizon we fetch forecasted
                # weather but DO NOT persist it to the DB (memory-only). The observed
                # weather in the DB remains the ground-truth used for training.
                try:
                    # fetch future forecasted weather (memory-only)
                    future_weather_map = {}
                    if getattr(self, 'db', None):
                        from app.integrations.weather.open_meteo_adapter import fetch_forecast_for_range
                        rest = await self.restaurant_repo.get_by_id(self.restaurant_id)
                        if rest and getattr(rest, 'latitude', None) is not None and getattr(rest, 'longitude', None) is not None:
                            start_dt = date.today()
                            end_dt = date.today() + timedelta(days=horizon_days - 1)
                            future_weather_map = await fetch_forecast_for_range(float(rest.latitude), float(rest.longitude), start_dt, end_dt)
                except Exception:
                    future_weather_map = {}

                # If weather-derived features are included in training, create matching
                # in-memory features for the future horizon by seeding from the last
                # observed values in DB and combining with forecasted temps.
                try:
                    from app.repositories.weather_data_repo import WeatherDataRepository
                    weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
                    obs_start = date.today() - timedelta(days=7)
                    obs_end = date.today()
                    observed_rows = await weather_repo.get_range(self.restaurant_id, obs_start, obs_end)
                    observed_rows = sorted([r for r in observed_rows], key=lambda r: r.weather_date)
                    past_temps = [float(r.temperature) for r in observed_rows if getattr(r, 'temperature', None) is not None]
                    past_precips = [float(r.precipitation_mm) for r in observed_rows if getattr(r, 'precipitation_mm', None) is not None]
                except Exception:
                    past_temps = []
                    past_precips = []

                # Build series for future temps/precips
                future_temps = [future_weather_map.get(d, {}).get('temperature') if future_weather_map else None for d in future_dates]
                future_precips = [future_weather_map.get(d, {}).get('precipitation_mm') if future_weather_map else 0.0 for d in future_dates]

                combined_temps = list(past_temps) if past_temps else [0.0]
                temp_lag_1_list = []
                temp_roll_7_list = []
                for i, ft in enumerate(future_temps):
                    prev_temp = combined_temps[-1] if combined_temps else 0.0
                    temp_lag_1_list.append(prev_temp)
                    window = (combined_temps + [t for t in future_temps[:i] if t is not None])[-7:]
                    temp_roll_7_list.append(float(sum(window) / len(window)) if window else 0.0)
                    combined_temps.append(ft if ft is not None else prev_temp)

                combined_precips = list(past_precips) if past_precips else [0.0]
                precip_lag_1_list = []
                for i, fp in enumerate(future_precips):
                    prev_prec = combined_precips[-1] if combined_precips else 0.0
                    precip_lag_1_list.append(prev_prec)
                    combined_precips.append(fp if fp is not None else 0.0)

                # attach weather features into features_df for prediction if present
                if 'temp_lag_1' in features_df.columns or True:
                    features_df = features_df.reset_index(drop=True)
                    features_df['temp_lag_1'] = temp_lag_1_list[:len(features_df)]
                    features_df['temp_roll_7'] = temp_roll_7_list[:len(features_df)]
                    features_df['precip_lag_1'] = precip_lag_1_list[:len(features_df)]

                h2o_frame = h2o.H2OFrame(features_df)
                preds = model.predict(h2o_frame).as_data_frame().values.flatten()
                result = [
                    {"forecast_date": d, "predicted_quantity": float(pred)}
                    for d, pred in zip(future_dates, preds)
                ]
                logger.info(f"[EOD] Forecast Result (model): {result}")
                return result
            except Exception as e:
                logger.error(f"Error generating forecast with H2O model for {menu_item_id}: {e}")

        # Fallback deterministic forecast: weekday mean blended with recent mean
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=date.today() - timedelta(days=90),
            end_date=date.today()
        )

        item_sales = [s for s in sales if s.menu_item_id == menu_item_id]
        if not item_sales:
            fallback = [{"forecast_date": d, "predicted_quantity": 0.0} for d in future_dates]
            logger.info(f"[EOD] Forecast Result (fallback, no history): {fallback}")
            return fallback

        df_sales = pd.DataFrame({
            "date": [s.sale_timestamp.date() for s in item_sales],
            "quantity_sold": [s.quantity_sold for s in item_sales],
        })

        daily = df_sales.groupby("date")["quantity_sold"].sum().reset_index()
        daily["date"] = pd.to_datetime(daily["date"]).dt.date
        daily["dow"] = pd.to_datetime(daily["date"]).dt.dayofweek

        weekday_means = daily.groupby("dow")["quantity_sold"].mean().to_dict()
        last_n_mean = daily.sort_values("date").tail(14)["quantity_sold"].mean()

        fallback_result = []
        for d in future_dates:
            dow = pd.to_datetime(d).dayofweek
            wm = weekday_means.get(dow, last_n_mean)
            pred = 0.6 * wm + 0.4 * last_n_mean
            fallback_result.append({"forecast_date": d, "predicted_quantity": float(max(pred, 0.0))})

        logger.info(f"[EOD] Forecast Result (fallback): {fallback_result}")
        return fallback_result

    @log_method("Ensure Weather For Range")
    async def ensure_weather_for_range(self, start_date: date, end_date: date, concurrency: int = 4):
        """Ensure weather_data rows exist for this restaurant between start_date and end_date.
        This method is best-effort and will not raise on failures. It will only attempt
        to fetch weather when `restaurants.latitude`/`longitude` are present.
        """
        try:
            from app.repositories.weather_data_repo import WeatherDataRepository
            from app.integrations.weather.open_meteo_adapter import fetch_weather_for_date

            rest = await self.restaurant_repo.get_by_id(self.restaurant_id)
            if not rest:
                return
            lat = getattr(rest, 'latitude', None)
            lon = getattr(rest, 'longitude', None)
            if lat is None or lon is None:
                return

            weather_repo = WeatherDataRepository(self.db, self.restaurant_id)
            existing = await weather_repo.get_range(self.restaurant_id, start_date, end_date)
            existing_dates = set([w.weather_date for w in existing])
            missing = [d for d in pd.date_range(start_date, end_date).date if d not in existing_dates]

            if not missing:
                return

            sema = asyncio.Semaphore(concurrency)
            tasks = []

            for d in missing:
                async def _task(dts):
                    async with sema:
                        try:
                            payload = await fetch_weather_for_date(float(lat), float(lon), dts)
                            if payload:
                                await weather_repo.upsert_for_restaurant_date(self.restaurant_id, dts, payload)
                                if getattr(self.db, 'commit', None):
                                    await self.db.commit()
                        except Exception:
                            return

                tasks.append(asyncio.create_task(_task(d)))

            if tasks:
                await asyncio.gather(*tasks)

        except Exception:
            return
    @log_method("Write Forecast Results")
    async def write_forecast_results(self, menu_item_id: int, forecast_data: List[Dict], confidence_score: float | None):
        """
        Write forecast metadata (to forecasts), and daily breakdown (to forecast_breakdown).
        """
        logger.info(f'write forecast results: {menu_item_id}, and {forecast_data}')
        if not forecast_data:
            return  # Nothing to write

        period_start = forecast_data[0]["forecast_date"]
        period_end = forecast_data[-1]["forecast_date"]

        daily_rounded_quantities = [int(round(entry["predicted_quantity"])) for entry in forecast_data]
        total_adjusted_quantity = sum(daily_rounded_quantities)

        forecast_obj_data = {
            "menu_item_id": menu_item_id,
            "restaurant_id": self.restaurant_id,
            "forecast_period_start": period_start,
            "forecast_period_end": period_end,
            "confidence_score": confidence_score, 
            "adjusted_quantity": total_adjusted_quantity,
            "used_in_order_generation": 0,
            "forecast_version": 1,
        }
        logger.info(f'[EOD] Writing Forecast results: {forecast_obj_data}')

        # Versioning: preserve previous forecasts and create a new forecast row if one exists for this period.
        existing = await self.forecast_repo.get_by_period_and_menu_item(menu_item_id, period_start, period_end)

        if existing:
            # Create a new forecast version rather than deleting/replacing existing data.
            next_version = await self.forecast_repo.get_next_forecast_version(menu_item_id)
            forecast_obj_data["forecast_version"] = next_version
        else:
            # first version remains 1 (already set in forecast_obj_data)
            pass

        # Create the forecast record. Avoid starting a new transaction if one is
        # already active on this AsyncSession (SQLAlchemy raises InvalidRequestError
        # when begin() is called twice). Commit only when we're not inside an
        # existing transaction.
        in_tx = False
        if getattr(self, 'db', None):
            try:
                in_tx = self.db.in_transaction()
            except Exception:
                in_tx = False

        if getattr(self, 'db', None) and getattr(self.db, 'begin', None) and not in_tx:
            async with self.db.begin():
                forecast = await self.forecast_repo.create(forecast_obj_data)
                forecast_id = forecast.forecast_id
        else:
            # Either no session begin support or we're already inside a transaction.
            forecast = await self.forecast_repo.create(forecast_obj_data)
            # Only commit when there isn't an outer transaction managing commits.
            if getattr(self, 'db', None) and getattr(self.db, 'commit', None) and not in_tx:
                await self.db.commit()
            forecast_id = forecast.forecast_id

        # Create forecast_breakdown records (append for the new forecast version)
        for entry, rounded_qty in zip(forecast_data, daily_rounded_quantities):
            breakdown_obj_data = {
                "forecast_id": forecast_id,
                "restaurant_id": self.restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_date": entry["forecast_date"],
                "forecasted_quantity": rounded_qty,
            }
            logger.info(f'[EOD] Writing Daily Forecast Results : {breakdown_obj_data}')
            await self.forecast_breakdown_repo.create(breakdown_obj_data)
            if getattr(self, 'db', None) and getattr(self.db, 'commit', None):
                await self.db.commit()

    @log_method("Prepare sales DataFrame")
    def _prepare_sales_dataframe(self, sales_history):
        """
        Converts raw sales history into a time-indexed DataFrame for modeling.

        Parameters:
            sales_history (List[Dict] or List[Obj]): Each entry must have 'sale_date' and 'quantity'

        Returns:
            pd.DataFrame with datetime index and one column: 'quantity'
        """
        if not sales_history:
            return pd.DataFrame(columns=["quantity_sold"])

        # Convert input to dicts if needed
        records = [
            {
                "sale_timestamp": getattr(row, "sale_timestamp", row.sale_timestamp),
                "quantity_sold": getattr(row, "quantity_sold", row.quantity_sold),
            }
            for row in sales_history
        ]

        df = pd.DataFrame(records)
        df["sale_date"] = pd.to_datetime(df["sale_timestamp"]).dt.date

        # Group by sale_date (aggregate daily totals)
        df = df.groupby("sale_date")["quantity_sold"].sum().sort_index()

        # Convert to full daily index (fill missing with 0)
        df = df.asfreq("D", fill_value=0)
        return df.to_frame()  # Ensure DataFrame format, not Series
    @log_method("Run Forecasting Engine (Basic)")
    async def run(
        self,
        forecast_date: date,
        horizon_days: Optional[int] = None,
        threshold_mape: float = 0.20,
        threshold_r2: float = 0.7
    ) -> Dict[str, Any]:
        """
        Main pipeline:
        - Ensure sales data exists
        - Evaluate and record forecast accuracy
        - Loop through active menu items
        - Check model accuracy
        - Retrain if necessary
        - Forecast next N days based on forecast_length
        - Save to DB
        """
        # 0. Get forecast_length from restaurant settings if not passed
        if horizon_days is None:
            settings = await self.restaurant_repo.get_settings()
            forecast_length = settings.get("forecast_length") or 14
            horizon_days = forecast_length

       # ✅ Use optimized existence check
        sales_exist = await self.sales_repo.sales_exist_for_dates([forecast_date])
        if not sales_exist:
            msg = f"No sales data found for {forecast_date} for restaurant {self.restaurant_id}"
            await self._raise_alert(
                alert_type="MissingSalesData",
                message=msg,
                severity="urgent"
            )
            logger.error(f"[EOD] {msg}")
            return

        logger.info(f"Starting Forecasting Pipeline for {forecast_date} for {self.restaurant_id}")

        # 2. Evaluate accuracy of previous forecasts
        await self.evaluate_and_record_accuracy(forecast_date)
        await self.evaluate_and_record_daily_forecast_accuracy(forecast_date)

        # 3. Get active menu items
        menu_items = await self.menu_item_repo.get_active_menu_items()

        for item in menu_items:
            menu_item_id = item.menu_item_id

            # Decide whether to retrain
            retrain = await self.should_retrain_model(menu_item_id, threshold_mape, threshold_r2)

            if retrain:
                model, metrics = await self.train_model(menu_item_id)
                self.accuracy_metrics[menu_item_id] = metrics
            else:
                model = load_model(self.restaurant_id, menu_item_id)
                if model is None:
                    continue 

            # Forecast
            forecast_data = await self.generate_forecast(menu_item_id, horizon_days)

            # Save forecast
            confidence_score = self.accuracy_metrics.get(menu_item_id, {}).get("r2", 0.0)
            await self.write_forecast_results(menu_item_id, forecast_data, confidence_score)

