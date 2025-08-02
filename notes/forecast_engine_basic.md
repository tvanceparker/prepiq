# ForecastingEngineBasic – System Design

## 🎯 Objective
Provide a lightweight but scalable forecasting system for **basic-tier** restaurants using only historical menu item sales.

---

## 📂 Core Tables

- `sales`: raw sales data (menu item, date, quantity).
- `forecasts`: stores forecast session summary (per menu item).
- `forecast_breakdown`: daily-level predictions per item.
- `forecast_accuracy`: summary evaluation per forecast/version/item.
- `daily_forecast_accuracy`: actuals vs. predicted on a daily basis.

---

## 🔁 Forecasting Flow

### ✅ Step 1: Load Historical Sales
- Pull last 90 days (or configurable) of sales data.
- Features: `date`, `menu_item_id`, `quantity_sold`, `day_of_week`, `is_weekend`, etc.

### ✅ Step 2: Check Existing Model Accuracy
- Look up last `forecast_version` in `forecast_accuracy` table.
- Check metrics:
  - `MAPE` (Mean Absolute Percentage Error)
  - `R²` (coefficient of determination)
- If any below threshold → retrain model.

### ✅ Step 3: Train New Model (if needed)
- Train regression model per `menu_item_id`.
- Use train/test split (TimeSeriesSplit?) for evaluation.
- Save:
  - model in memory
  - accuracy in memory and `forecast_accuracy`

### ✅ Step 4: Predict Future Demand
- Predict per menu item for `horizon_days` (e.g. 14).
- Each forecast has:
  - Metadata (`forecasts`)
  - Breakdown per day (`forecast_breakdown`)

### ✅ Step 5: Write Forecasts to DB
- `forecasts`: one row per item per forecast session.
- `forecast_breakdown`: N rows per item per day.

### ✅ Step 6: Evaluate Real Accuracy (Next Day Jobs)
- After real sales are uploaded:
  - Match `forecast_breakdown` with actual sales.
  - Calculate and store:
    - `forecast_error`
    - `error_percentage`
  - Store in:
    - `daily_forecast_accuracy`

---

## 💡 Design Guarantees

- Forecasting is versioned and non-destructive.
- Forecasts may overlap in time (OK for learning).
- Retrain only if model quality drops.
- Multiple forecasts allowed per item/day.

---

## 🛡️ Safety Checks

- Do not forecast inactive menu items.
- Ensure model is trained on distinct data from forecast window.
- Always increment forecast version.
- Forecast only if sales data exists for the period.
