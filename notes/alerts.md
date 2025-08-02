# 🍃 Alerts & Monitoring System Design (Forecasting App)

## 🎯 Purpose

Build an alert system to notify restaurant **owners/managers** of:
- Data issues
- Forecasting anomalies
- ML model health
- Business insights
- System events worth human attention

---

## 🛠️ Key System Hooks & Checks

### 🔍 Based on Forecasting Pipeline (see `ForecastingEngineBasic`)

#### Sales Data Issues
- ⛔ No sales for forecast date → system currently raises `ValueError` → trigger alert.
- 🕳️ Missing days in sales history (used in `_prepare_sales_dataframe`)
- ⚠️ Zero or near-zero sales for active item → flag as anomaly
- If close to closing time have alert warning them to upload sales data

#### Forecast Accuracy Evaluation
- 🚨 Daily Accuracy Alerts:
  - Low accuracy (e.g., MAPE > 30%, R² < 0.3)
  - Missing actuals when evaluating past predictions
  - High error variance between forecast and reality
- 🧪 If `evaluate_and_record_daily_forecast_accuracy()` returns nothing — notify

#### Retraining Signals
- 🔁 `should_retrain_model()` logic:
  - No model → alert
  - Model performs poorly (e.g., MAPE too high, R² too low) → retraining triggered → log/alert retrain event
  - After retraining, send alert if performance did not improve

#### Forecast Generation & Writing
- 📉 Forecast quantity = 0 for future days → warn for low confidence
- ⛔ Forecast skipped (e.g., model missing or prediction failed) → log per menu item

---

## 🧠 Business Insight Alerts (Owner/Manager Focused)

| Scenario | Example Alert |
|----------|----------------|
| Low sales | “Sales for 'Pesto Pasta' dropped 42% compared to last Friday.” |
| High sales surge | “'Mango Smoothie' up 68% — likely demand spike.” |
| Missing forecast | “No forecast available for 'Breakfast Burrito' on 06/20.” |
| Consistently poor forecast accuracy | “Forecasts for 'Avocado Toast' off by 35%+ this week.” |
| Sold-out or zero sales trend | “'Chicken Alfredo' had 0 sales on 3 consecutive days — check availability.” |

---

## 🔔 Alert Categories

1. **Data Quality**
   - Missing sales
   - Duplicate forecasts
   - Sales data present but no forecast
   - Forecasts not written
   - Outliers
   - Unexpected Null or 0 Values

2. **Forecast Accuracy**
   - High MAPE or RMSE
   - Low R²
   - Big discrepancy between predicted and actual

3. **System/Operational**
   - Retraining triggered
   - Model missing or failed to load
   - No model saved after training

4. **Business Health**
   - Poor selling items
   - Sudden demand shifts

---

## 📄 Activity Logs

| Type | Description |
|------|-------------|
| Manual trigger | User initiated forecast |
| Forecast created | Menu item + period |
| Model retrained | Triggered by poor accuracy |
| Forecast failed | Model or write failure |
| Data sync success/fail | For POS ingestion or uploads |

These logs can be stored and optionally shown on the frontend.

---

## 🧩 Alert System Components (Backend)

### Schema: `alerts`
```sql
CREATE TABLE alerts (
  alert_id SERIAL PRIMARY KEY,
  restaurant_id INT,
  menu_item_id INT NULL,
  alert_type TEXT,
  message TEXT,
  severity TEXT, -- info, warning, error
  created_at TIMESTAMP DEFAULT now(),
  resolved BOOLEAN DEFAULT FALSE
);
