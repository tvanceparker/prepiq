# ⚙️ Admin & Settings UI Pages Specification

This document outlines the UI structure for the **6 additional pages** in the **Admin Panel** and **Settings** sections of the Basic Tier interface. Each page contains a clear breakdown of its **purpose**, **components**, and **expected interactions** to support frontend development.

---

## 🏢 Admin Panel

---

### 9. Tenant Info

**Purpose:**  
Let tenants view and edit their restaurant's core profile data.

**Components:**

- **Editable Form Fields**
  - Restaurant Name *(required)*
  - Phone Number
  - Email Address *(required)*
  - Address (street, city, state, ZIP)
  - Subscription Tier *(disabled dropdown: Basic / Pro / Master)*
  - Subscription Status (Active / Expired / Paused)
  - Expiry Date (readonly or calculated)
- **Hours of Operation**
  - Table: Day of week | Open time | Close time
  - Toggle: "Closed on this day"
- **Save Button**
  - Disabled unless changes are made
- **Success/Error Toast Notifications**

**Optional Enhancements:**

- Auto-suggest for address
- Preview timezone based on address

---

### 10. System Health Check

**Purpose:**  
Provide visibility into the success and health of daily data ingestion, forecasting processes, and accuracy calculations to ensure the system has up-to-date data for reliable forecasts.

---

**Components:**

- 🔹 **Daily Sync Summary Table**  
  Displays overview per date to quickly identify sync health.
  - Columns:
    - `Date`
    - `Sales Synced` (✅ / ❌)
    - `Forecast Completed` (✅ / ❌)
    - `Accuracy Calculated` (✅ / ❌)
    - `Overall Sync Status` (Success / Partial / Failed) — color-coded
    - `Notes` (e.g., “Missing sales for item X”, “Partial forecast generation”)

- 🔹 **End-of-Day Jobs Status Table**  
  Details background job runs relevant to data sync.
  - Columns:
    - `Date`
    - `Job Name` (e.g., Sales Import, Forecast Generation, Accuracy Calculation)
    - `Job Status` (Success / Failed / Not Run)
    - `Ran At` (Timestamp)
    - `Error Message` (if any)

- 🔹 **Alerts Section**  
  Automatically surface current sync issues and warnings.
  - Missing or delayed sales data for active menu items
  - Null or zero quantity anomalies
  - Errors from forecast or accuracy jobs
  - 🔗 Link to [Alerts & Issues Feed](#2-alerts--issues-feed)

- 🔹 **Filters**  
  - Date Range Picker
  - Sync Status Filter: `All | Success | Failed | Partial`

- 🔹 **Manual Actions**  
  - Refresh Status Button (manual sync status check)
  - Optional: “Run Health Check” system button for diagnostics

---

**Data Sources Monitored:**

- `sales`
- `forecasts`
- `forecast_breakdown`
- `forecast_accuracy`
- `daily_forecast_accuracy`

---

**Optional Enhancements:**

- Tooltip on “Sync Status” to detail which step(s) failed or partially succeeded
- Color-coded rows (green = success, yellow = partial, red = failure)
- Summary metrics at top (e.g., “3 sync failures in last 7 days”)
- Per sales channel sync status (e.g., Uber Eats, POS)
- Duplicate and outlier detection summaries per day
- CSV export of sync status logs

---

### 11. Activity Logs

**Purpose:**  
Allow admins to audit key user or system actions.

**Components:**

- **Log Table**
  - Timestamp | User | Action | Affected Entity | Status
  - Example actions: “Updated restaurant info”, “Ran forecast”, “Edited menu item”
- **Filters**
  - Date Range
  - User (dropdown or autocomplete)
  - Action Type (CRUD, Forecast Run, Login, etc.)
- **Export CSV Button**
- **Search Field**

**Notes:**

- Placeholder page until backend logging is implemented
- Design should support high log volume (pagination or infinite scroll)

---

## 🛠 Settings Section

---

### 12. Restaurant Settings

**Purpose:**  
Expose any system-wide or restaurant-level controls.

**Potential Components:**

- **Forecast Length Control**
  - Dropdown: 3 Days | 7 Days | 14 Days
- **Tax Rate**
  - Able to change tax rate percentage
- **Enable Add-ons**
  - Toggle: Enable Upcoming Forecast Page
- **Timezone Setting**
  - Auto-populated based on address (editable if needed)
- **Operational Settings**
  - Checkbox: "Run EOD sync only when closed"
  - Start buffer time (e.g., `Run EOD sync at least X mins before open`)
- **Sales Channels**
  - Select active sales channels to be used in template generation

**Note:**  
Settings will evolve — this section is flexible.

---

### 13. User Management

**Purpose:**  
Manage user accounts for the restaurant and set permissions.

**Components:**

- **User Table**
  - Name | Email | Role | Last Login | Status | Actions
- **Add User Modal**
  - Email, Name, Role (Admin / Manager / Viewer), Temporary Password
- **Edit Permissions Modal**
  - Checkbox matrix by feature: Can View / Can Edit
- **Search / Sort / Filter**
  - By role or status
- **Delete User Action**
  - Confirm dialog with irreversible warning

---

### 14. Preferences (User Level) **Rename** Account Settings

**Purpose:**  
Let users personalize aspects of the UI.

**Components:**

- **Theme Toggle**
  - Light / Dark Mode
- **Default Date Range**
  - Last 7 Days | Last 14 Days | This Month
- **Table Density Toggle**
  - Compact / Comfortable
- **Default Landing Page**
  - Dropdown of allowed pages (Dashboard, Sales Explorer, etc.)
- Change password, email things like that
- Auto Logout?
- Logout from all devices?
- Delete account

---

## ✅ Design Notes

- All settings should autosave or provide clear “Save Changes” flow.
- Use modals for secondary actions (e.g., Add/Edit User, Edit Permissions).
- All tables should support:
  - Pagination
  - Sorting
  - Searching
- Use consistent styling and spacing with the original 8-page spec.

---

## 📂 Route Suggestions

| Page Name             | Route Path                  |
|----------------------|-----------------------------|
| Tenant Info          | `/admin/tenant`             |
| Data Sync Status     | `/admin/sync-status`        |
| Activity Logs        | `/admin/logs`               |
| Restaurant Settings  | `/settings/restaurant`      |
| User Management      | `/settings/users`           |
| Preferences          | `/settings/preferences`     |
