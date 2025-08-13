from typing import List, Dict, Tuple, Optional, Any
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statistics import mean
from datetime import date, timedelta
from sklearn.linear_model import LinearRegression
from sqlalchemy.ext.asyncio import AsyncSession
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
        #TODO Consider putting in more metrics, we use smape, but lets use mape, and r2 possibly.
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
            #TODO Consider changing error percentage to just a normal percentage.
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
            return None  # no data to train

        df = pd.DataFrame({
            "date": [s.sale_timestamp.date() for s in item_sales],
            "quantity_sold": [s.quantity_sold for s in item_sales],
        })

        daily_sales = df.groupby("date").sum().reset_index()
        daily_sales['date'] = pd.to_datetime(daily_sales['date'])
        daily_sales = daily_sales.sort_values("date").reset_index(drop=True)

        # Features
        daily_sales['day_of_week'] = daily_sales['date'].dt.dayofweek.astype(int)
        daily_sales['day'] = daily_sales['date'].dt.day
        daily_sales['month'] = daily_sales['date'].dt.month
        daily_sales['year'] = daily_sales['date'].dt.year

        split_idx = int(len(daily_sales) * 0.8)
        train_df = daily_sales.iloc[:split_idx]
        valid_df = daily_sales.iloc[split_idx:]

        X_train = train_df[['day_of_week', 'day', 'month', 'year']]
        y_train = train_df['quantity_sold']
        X_valid = valid_df[['day_of_week', 'day', 'month', 'year']]
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

        model.train(x=features, y=target, training_frame=train_h2o, validation_frame=valid_h2o)

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

    @log_method("Generating Forecast")
    async def generate_forecast(self, menu_item_id: int, horizon_days: int = 14):
        """
        Generate forecast for a menu item for next `horizon_days`.
        Returns list of dicts: [{'forecast_date': date, 'predicted_quantity': float}, ...]
        """
        model = load_model(self.restaurant_id,menu_item_id)
        if model is None:
            return []

        # Prepare future dates DataFrame
        #TODO If ran the day before open day it doesn't do the forecast for the next day, which would be the most accurate one
        #TODO So make sure we get the scheduled task done after midnight
        future_dates = [date.today() + timedelta(days=i) for i in range(horizon_days)]
        df = pd.DataFrame({'date': future_dates})
        df['date'] = pd.to_datetime(df['date']) 

        df['day_of_week'] = df['date'].dt.dayofweek
        df['day'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['year'] = df['date'].dt.year

        features = ['day_of_week', 'day', 'month', 'year']

        # Convert to H2O frame
        h2o_frame = h2o.H2OFrame(df[features])

        preds = model.predict(h2o_frame).as_data_frame().values.flatten()

        # Return forecast list
        result =  [
            {"forecast_date": d, "predicted_quantity": float(pred)}
            for d, pred in zip(future_dates, preds)
        ]
        logger.info(f"[EOD] Forecast Result: {result}")
        return result
    @log_method("Write Forecast Results")
    async def write_forecast_results(self, menu_item_id: int, forecast_data: List[Dict], confidence_score: float | None):
        """
        Write forecast metadata (to forecasts), and daily breakdown (to forecast_breakdown).
        """
        print(f'write forecast results: {menu_item_id}, and {forecast_data}')
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
        # Create the forecast record
        forecast = await self.forecast_repo.create(forecast_obj_data)
        await self.db.commit()
        forecast_id = forecast.forecast_id

        # Create forecast_breakdown records
        for entry, rounded_qty in zip(forecast_data, daily_rounded_quantities):
            breakdown_obj_data = {
                "forecast_id": forecast_id,
                "restaurant_id": self.restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_date": entry["forecast_date"],
                "forecasted_quantity": rounded_qty,
            }
            print(f'[EOD] Writing Daily Forecast Results : {breakdown_obj_data}')
            await self.forecast_breakdown_repo.create(breakdown_obj_data)
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

