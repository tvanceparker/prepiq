# 🍃 Alerts & Insights System Design (Forecasting App)

## 🎯 Purpose

Centralize monitoring, notification, and actionability around critical app events for restaurant owners, managers, and system admins:

- Data quality issues (missing, anomalous, inconsistent sales/forecast data)
- Forecasting anomalies and accuracy degradation
- ML model health and retraining signals
- Business insights (sales trends, demand shifts)
- System and operational events requiring human attention

Alerts are urgent, actionable flags; Insights are periodic analytical summaries or trend notifications.

---

## 🛠️ Key System Hooks & Alert/Insight Checks

### 🔍 Integrated with Forecasting Pipeline (`ForecastingEngineBasic`)

#### Sales Data Alerts
- ❌ Missing sales for forecast date (currently triggers `ValueError`) → alert
- 🕳️ Missing days in sales history
- ⚠️ Zero or near-zero sales on active items → anomaly alert
- ⏰ Close to closing time but missing sales upload → warning alert

#### Forecast Accuracy Alerts
- 🚨 Low accuracy alerts (MAPE > 30%, R² < 0.3)
- ❓ Missing actuals for evaluation dates
- ⚠️ High forecast vs actual variance
- 🧪 No accuracy evaluation data generated → notify

#### Retraining Signals
- 🔁 No model found → alert
- 🚨 Poor model performance → retrain triggered + alert
- ⚠️ Retrain completed but no performance improvement → alert

#### Forecast Generation Alerts
- 📉 Forecast quantity = 0 on future dates → low confidence warning
- ⛔ Forecast skipped/failure (e.g., model missing) → log + alert per item

---

## 🧠 Business Insight Alerts (Owner/Manager Focused)

| Scenario                        | Example Alert                                               |
|--------------------------------|-------------------------------------------------------------|
| Low sales                      | “Sales for 'Pesto Pasta' dropped 42% compared to last Friday.”  |
| High sales surge               | “‘Mango Smoothie’ up 68% — likely demand spike.”            |
| Missing forecast               | “No forecast available for 'Breakfast Burrito' on 06/20.”   |
| Consistently poor forecast accuracy | “Forecasts for 'Avocado Toast' off by 35%+ this week.”          |
| Sold-out or zero sales trend   | “'Chicken Alfredo' had 0 sales on 3 consecutive days — check availability.” |

---

## 🔔 Alert & Insight Categories

1. **Data Quality**
   - Missing sales data
   - Duplicate or missing forecasts
   - Null or zero quantity anomalies
   - Outliers and data inconsistencies

2. **Forecast Accuracy**
   - High error metrics (MAPE, RMSE)
   - Low coefficient of determination (R²)
   - Missing or incomplete actual data

3. **System / Operational**
   - Retraining events (triggered, completed, failed)
   - Model missing or load failure
   - Failed forecast jobs or data syncs

4. **Business Health & Insights**
   - Sales trend shifts
   - Demand spikes or drops
   - Forecast availability gaps

---

## 📄 Activity Logs (Supporting Audit & Debug)

| Type             | Description                               |
|------------------|-------------------------------------------|
| Manual Trigger   | User-initiated forecast runs              |
| Forecast Created | Records for each menu item and date       |
| Model Retrained  | Logs retraining triggers and results      |
| Forecast Failed  | Errors during prediction or write process |
| Data Sync Status | POS ingestion or upload success/failures  |

Logs are stored and accessible for admin review and debugging.

---

## 🧩 Alerts & Insights System Components (Backend)

- **Alerts & Insights API**
  - `GET /alerts` — List with filters (date, severity, status, category)
  - `GET /alerts/{id}` — Detail view
  - `POST /alerts/{id}/acknowledge` — Mark alert acknowledged
  - `POST /alerts/{id}/resolve` — Mark alert resolved
  - `POST /alerts/{id}/fix` — Accept fix data and update underlying record
  - `GET /insights` — List business insights (trend summaries, metrics)
  - `POST /insights/refresh` — Trigger insights regeneration job (scheduled/manual)

- **Background Jobs**
  - **Alert Generators:** hook into forecasting and data ingestion pipelines to detect issues and create alerts in DB.
  - **Insight Generators:** batch-run at close of day to generate metrics, trends, and business insights.
  - **Retrain Monitoring:** triggers alerts when models fail or retrain events occur.

- **Storage**
  - Alerts and insights stored in dedicated tables with metadata (timestamps, severity, category, status, linked entities).

---

## 🖥️ Alerts & Insights UI (Centralized Dashboard)

### Purpose

Single pane of glass to monitor, filter, acknowledge, and resolve alerts, plus view business insights.

---

### Components

- **Alerts & Insights Table**
  - Columns:
    - Timestamp
    - Severity (Info / Warning / Critical) — color-coded
    - Category (Data Quality, Forecast, System, Business)
    - Description (brief summary)
    - Status (Open / Acknowledged / Resolved)
    - Assigned To (optional)
    - Actions (Acknowledge, Resolve, Fix Now, View Details)

- **Alert/Insight Details Panel (Modal or Slide-out)**
  - Full message and metadata
  - Related entities (menu item, forecast date)
  - Historical occurrences and similar alerts
  - Links to relevant pages (e.g., Data Sync Status, Activity Logs)
  - Internal comments for team collaboration

- **Filters**
  - Date Range picker
  - Severity Filter: All / Info / Warning / Critical
  - Category Filter: All / Data Quality / Forecast / System / Business
  - Status Filter: All / Open / Acknowledged / Resolved
  - Search bar (text match in description)

- **Bulk Actions**
  - Select multiple alerts
  - Bulk Acknowledge or Resolve

- **Pagination or Infinite Scroll**
  - Efficient handling of large alert volumes

- **Subscriptions & Notifications**
  - Opt-in/out email or Slack notifications per category/severity

---

### Expected User Interactions

- Click alert row to open details
- Apply dynamic filters to narrow down alerts/insights
- Bulk update statuses for fast triage
- Add comments or assign alerts to users or teams
- “Fix Now” buttons open forms/modal to correct underlying data, submit fix to backend, then update alert status
- Auto-refresh alert list or manual refresh button
- Dashboard summary view with alert counts by category/severity/status

---

### Optional Enhancements

- Alert escalation (auto-escalate unresolved critical alerts after threshold)
- Group alerts by similarity/time windows
- Dashboard graphs showing trends in alert volume/severity over time
- Integration with external monitoring and incident management tools

---

## 🔄 Integration Points Across the Application

- **Daily Overview Dashboard:** Show small badge count of open alerts and key insights summary
- **Forecast Accuracy Page:** Show alerts related to accuracy metrics directly in charts or tables
- **Menu Item Entry:** On editing an item, surface related alerts or insights for that item
- **Sales & Forecasting Pages:** Embed related alerts near forecast/sales data where actionable
- **Admin Panel > Data Sync Status:** Link to alert details for failed sync issues
- **Activity Logs Page:** Allow drill down from alerts to log entries and vice versa

---

## 🧪 Example "Fix Now" Workflow

1. Alert: “Outlier detected in sales for 'Veggie Burger' on 2025-06-20.”
2. User clicks **Fix Now** button in alert row.
3. Modal opens with editable fields showing suspect sales entry.
4. User corrects the sales quantity.
5. On submit, frontend calls `POST /alerts/{id}/fix` API with corrected data.
6. Backend updates sales data and marks alert resolved.
7. Frontend refreshes alert and insights views to reflect updated state.

---

## 📘 Related UI Pages Specification Snippets (Basic Tier)

| Page                  | Route Path               | Alerts & Insights Role                                |
|-----------------------|--------------------------|-------------------------------------------------------|
| Daily Overview        | `/dashboard/overview`    | Show summary badge of open alerts, highlight critical insights |
| Alerts & Insights Feed| `/dashboard/alerts`      | Main centralized alert/insight dashboard               |
| Menu Item Entry       | `/menu/quick-entry`      | Surface alerts linked to menu items                    |
| Forecast Accuracy     | `/forecast/accuracy`     | Highlight accuracy alerts inline with charts           |
| Data Sync Status (Admin) | `/admin/data-sync`    | Link to sync failure alerts and relevant insights      |
| Activity Logs (Admin) | `/admin/activity-logs`   | Provide logs for alert and system event audit          |

---

## ✅ Design Principles

- Clear, concise, and actionable alert descriptions
- Distinct UI for alerts (urgent) vs insights (informative)
- Consistent filters and pagination across lists
- Responsive, mobile-friendly interfaces
- Accessible color coding and iconography for severity
- Use modals and slideouts for detailed views and fixes
- Smooth integration with core forecasting and data sync workflows

---

## ⚙️ Next Steps for Implementation

- Build backend alert and insight data models + API
- Hook into forecasting and data ingestion pipelines for alert generation
- Develop background batch jobs for insights generation
- Create React components for Alerts & Insights dashboard
- Integrate “Fix Now” workflows with data editing forms
- Setup notification subscriptions and escalation rules
- Test with real pipeline error scenarios and user feedback

---

If you want, I can help next with:

- Backend schema design for Alerts & Insights
- API endpoint definitions and example payloads
- React UI components and state management ideas
- Alert generation pseudo-code or pipeline integration examples

Just say the word! 🚀
