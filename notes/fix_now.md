# 📊 Forecast Dashboard Fixes & Improvements

This document tracks known issues and planned improvements across forecast-related services and visualizations.

## Log in
- ~~Also put in logged in as **Name** and not username.~~
- ~~Possibly add logout or something to sidebar.~~
- Activity log date is off by 7 hours.

## End of day
- Did not work when closing time was at 2AM.
- Add alerts throughout for sure.

## Global Components
- Create reusable global components to ensure consistency across the app.
- Decide between using our custom toast utility or the default toast implementation.
- Establish global **Typography** styles for text, headings, muted text, lazy text, etc.
- Empty state management.
- Lazy Load Heavy Components.
- Clear Filters button.
- Have red buttons, pastel colors? with the light and dark mode?

## Sidebar
- Logo, do something with the top.

### Modals
- ~~Upload sales and settings modals are glitchy, show twice and only when I switch pages.~~

### Forms & Inputs
- Auto-Focus First field, make pressing tab a thing.
- Show Field-Level Validation Early.
- Keyboard validation, press enter submits things like that.
- For invalid inputs animate slightly on input.

## Considerations
- Put $ signs everywhere.

### Components
- ~~Modal/Dialog Component.~~
- Toast Component.
- Form Component.
- Input Component.
- Select/Dropdown Component.
- Checkbox/Radio Component.
- Loader/Spinner Component.
- **Tooltip Component**.
- Typography.
- FormRow/FormGroup.
- Avatar.
- Icon.

---

## ✅ Daily Overview

### Issues:
- ~~Check out Daily overview is pulling the math on accuracy and check the green/red.~~
- While uploading sales data; confirm message.
- If uploading sales data for NOT that day alert that.
- The template populates deactivated menu items.
- The quick entry should only be default do active items
- Add metrics card to overview from yesterday

### Action Items:
- Refactor to load a single breakdown per request.
- Move aggregation logic to repository layer; return precise sales + forecast data.
- Fix default date logic on upload form or backend.
- Fix template to have sales channels (auto-generated?). Make sure upload is good with that.
- Confirmation that sales data has been uploaded.

---

## Alerts & Insights Feed

### Issues:
- Use Tooltip label component
- Have button to fix no sales data maybe,
- Change header from Issues to Insights

## Menu Item Quick Entry

### Issues:
- Bulk upload modal probably isn't toasty.
- **When activating this page it activates daily overview also.**
- Filter by status is backwards

---

## ⏳ Upcoming Forecast

### Issues:
- Can be more intuitive
- The Full Range mode on the table isn't quite full range

### Action Items:
- List breakdowns per forecast day/item distinctly, no lumping.
- Add clearer visual separation between items per day.
- Consider pagination or chunking for better readability.

---

## 📈 Menu Mix Insights

### Issues:
- Clicking "Revenue" on top 3 items throws an error — needs removal or fix.

### Action Items:
- Fix top 3 item revenue calculation logic.
- Debug group-by for quantity vs revenue modes.
- Normalize time series intervals (daily, weekly).
- Deduplicate and sanitize line chart data.
- Put Category and Sales Channels in Sales over Time

---

## 🎯 Forecast Accuracy

### Issues:
- Accuracy calculated live causing inconsistencies.
- Low denominators cause exaggerated % errors (e.g., 700%).
- No UI feedback for low-confidence forecasts.
- Should never allow the end day to go past the day before.
- Should change 'Forecast Accuracy Summary' to something else (also reflects daily).
- Make another chart, single item, forecasted and actual to compare

### Action Items:
- Store accuracy metrics in DB instead of live calculation.
- Add labels/flags for low-volume actuals (e.g., "< 5 units sold").
- Cap or simplify display of large error percentages ("200%+" or alert icon).
- Consider adding metrics like `sMAPE`, `bias`, or `R²`.

### Optional Improvements:
- Remove dev-only metrics from UI.
- Mix error and confidence metrics instead of percentage-only accuracy.

---

## Sales Patterns

### Issues:
- Have some sort of indicator of how long the timeframe is (e.g. Past 2 months or weeks).

## Sales Explorer
- Should be able to edit what they uploaded.

---

## Tenant Info

### Issues:
- The table shows 24 hour, the model shows 12 hour, might be confusing or let them edit in settings.
- Make hours **required**.
- Saving tenant info modal is glitched.

### Action Items:
- Fix toast notification on update.
- Add strict validation for email, phone, and address fields.

## Restaurant Settings

### Issues:
- Make prettier.
- Make modal for sales channel a little nicer.

## Roles & Access
- Remember the Admin disable/edit is disabled just in the frontend

## User Management
- Remember that Admin disable/edit is disabled just in the frontend
- Remember the edit button is disabled for admin so they won't be able to change **anything** including password
