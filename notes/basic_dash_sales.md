# 📘 Basic Tier UI Pages Specification

This document outlines the UI structure for all 9 pages of the **Basic Tier** user interface — 8 core pages and 1 optional add-on. Each section defines the **page purpose**, **expected components**, and **data visualizations or interactions**.

---

## 📊 Dashboard Section

---

### 1. Daily Overview

**Purpose:**  
Give users a snapshot of today's performance, with minimal cognitive load.

**Components:**
- 🔹 **Today’s Forecasted Total Sales**
  - Forecasted total revenue and quantity (e.g. `$1,230 | 350 items`)
- 🔹 **Top 5 Forecasted Menu Items**
  - Item name, forecasted quantity, and icon or image
- 🔹 **Yesterday's Forecast Accuracy**
  - % accuracy + brief “hit/miss” note (e.g. `87% accurate`)
- 🔹 **Alerts Summary**
  - Small badge (e.g. “3 open issues”)
- 🔹 **Link buttons** to detailed pages: “Sales Patterns,” “Forecast Accuracy,” etc.

---

### 2. Alerts & Issues Feed

**Purpose:**  
Track system-side problems like failed syncs, missing data, or forecast failures.

**Components:**
- 🔹 **List of Alerts**
  - Timestamp, alert type (error/warning), short description
- 🔹 **Status Filter**
  - All | Open | Resolved
- 🔹 **Search/Sort Controls**
- 🔹 **Optional "Acknowledge" toggle** to mark resolved issues

---

### 3. Menu Item Entry

**Purpose:**  
Allow users to quickly add or edit menu items without full POS integration.

**Components:**
- 🔹 **Form for new item**
  - Name, Category, Price, Is Active toggle
- 🔹 **Batch Entry Option**
  - Upload CSV or paste from spreadsheet
- 🔹 **List of existing menu items**
  - Editable table (inline edit preferred)

---

## 📈 Sales & Forecasting Section

---

### 4. Forecast Accuracy

**Purpose:**  
Build user confidence by showing how close forecasts were to actuals.

**Components:**
- 🔹 **Accuracy Chart (7–14 day history)**
  - Line or bar chart showing daily accuracy % Per menu item and per forecast or something
  - Filter by Menu
- 🔹 **Table View**
  - Date, Menu Item, Forecasted, Actual, Error %, MAPE
- 🔹 **Filters**
  - Date range | Menu item

---

### 5. Menu Mix Insights

**Purpose:**  
Help users see their sales breakdown by item — useful for planning/prep.

**Components:**
- 🔹 **Pie Chart / Donut Chart**
  - Percent of sales by menu item and category and sales channel
- 🔹 **Bar Chart Option**
  - Quantity or $ sold per item over last week
- 🔹 **Toggle: Revenue vs Quantity**
- 🔹 **Filter: Date Range**

---

### 6. Sales Patterns

**Purpose:**  
Show how sales behave across days, menu items or channels.

**Components:**
- 🔹 **Line Graph and Heatmap**
  - Daily sales over time which is to mean days overall and per menu item and per category
  - Maybe add something does a last month, or 3, or quarters or something.
- 🔹 **Day-of-week breakdown**
  - Bar chart: avg sales per weekday, avg sales per day
- 🔹 **Sales Channel Breakdown**
  - Dine-in vs Online vs Delivery (if available)
- 🔹 **Filter: Date Range**

---

### 7. Sales Explorer

**Purpose:**  
Give users a way to inspect raw sales data.

**Components:**
- 🔹 **Table View**
  - Date | Menu Item | Quantity Sold | Channel | Revenue
- 🔹 **Filters**
  - Menu Item, Date Range, Channel
- 🔹 **Download Excel Button**

---

### 8. Upcoming Forecast (💡 Add-On)

**Purpose:**  
Show what the forecast engine expects over the next 3–7 days.

**Components:**
- 🔹 **Forecast Table**
  - Date | Menu Item | Forecasted Quantity
- 🔹 **Summed Totals**
  - Forecasted daily revenue / quantity
- 🔹 **Toggle: Per Day / Full Range**
- 🔹 **Optional Chart: Top forecasted items**

---

## ✅ Design Notes

- All pages should maintain a **simple and clean layout**, with clear sections.
- Keep **page names short and self-explanatory**.
- Support **light/dark themes** if possible.
- Use **consistent filters** across pages where applicable (e.g. date picker, item search).
- Avoid overwhelming the user — focus on clarity, not quantity of info.

---

## 📂 Route Suggestions

| Page                   | Route Path               |
|------------------------|--------------------------|
| Daily Overview         | `/dashboard/overview`    |
| Alerts & Issues Feed   | `/dashboard/alerts`      |
| Menu Item Entry        | `/menu/quick-entry`      |
| Forecast Accuracy      | `/forecast/accuracy`     |
| Menu Mix Insights      | `/forecast/menu-mix`     |
| Sales Patterns         | `/forecast/patterns`     |
| Sales Explorer         | `/forecast/explorer`     |
| Upcoming Forecast      | `/forecast/upcoming`     |

---

$$
\sum_{n=1}^\infty \frac{1}{n^2} = \frac{\pi^2}{6}
$$

