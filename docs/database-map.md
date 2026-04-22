# Database Map

## Status

This map is based on ORM models in `app/db/models/*_orm.py` and migration scripts in `scripts/migrations/`. It focuses on relationships and meaning, not every column.

## Persistence Model

PrepIQ uses MySQL through SQLAlchemy async ORM (`mysql+aiomysql`). `app/db/session.py` defines the async engine, `AsyncSessionLocal`, and `get_db` transaction lifecycle.

Most application tables are tenant-scoped by `restaurant_id`. Normal services and repositories should never read or mutate another tenant's rows.

## Tenant, Auth, And Admin Entities

| Entity/table | Role | Relationships and notes |
| --- | --- | --- |
| `Restaurant` / `restaurants` | Tenant root and settings container. | Holds name/contact/location, timezone/EOD fields, POS settings, assistant secret fields, and `subscription_tier`. Current target values are `basic/full`; migration `0018_migrate_subscription_tier_to_full.sql` converts deprecated `pro/master` rows. |
| `Employee` / `employees` | Login identity and staff profile. | Links to `roles`, stores password hash, preferences JSON, pay/employment fields, and nullable role. |
| `Role`, `Permission`, `RolePermission` | Role/permission model. | Permission checks are active when `role_id` exists; shared-access mode skips checks when role is absent. |
| `ActivityLog`, `ErrorLog` | Audit/diagnostic tables. | Admin routes expose parts of this surface. |

## Menu, Recipe, And Ingredient Entities

| Entity/table | Role | Relationships and notes |
| --- | --- | --- |
| `MenuItem` / `menu_items` | Sellable item. | Used by sales, recipes, forecasts, orders, and dashboard quick entry. |
| `Recipe` / `recipes` | Production recipe. | Can be associated with menu items and can reference ingredients, batches, or other recipes. |
| `RecipeIngredient` / `recipe_ingredients` | Recipe component edge. | Supports component type `ingredient`, `batch`, or `recipe`; also keeps fallback ingredient links. |
| `MenuItemRecipe` / `menu_item_recipes` | Menu item to recipe mapping. | Enables menu item cost, forecast breakdown, and usage. |
| `RecipeModifier` / `recipe_modifiers` | Modifier data for recipes. | Supports recipe customization/modifier behavior. |
| `BatchRecipe` / `batch_recipes` | Batch/prep recipe. | Used by prep, nested recipe logic, and forecast breakdown. |
| `BatchRecipeIngredient` / `batch_recipe_ingredients` | Batch component edge. | Supports ingredient or nested batch references. |
| `MenuItemBatchUsage` / `menu_item_batch_usage` | Menu-to-batch usage. | Used for batch usage/cost relationships. |
| `Ingredient` / `ingredients` | Ingredient catalog and replenishment policy anchor. | Holds active flag, unit, shelf life, policy fields, max stock level, and policy override data. |
| `IngredientSupplier` / `ingredient_supplier` | Vendor-specific ingredient purchasing data. | Holds cost, pack size, lead time, review period, ordering cadence, delivery days, shelf life, preference, and priority. |
| `Supplier` / `supplier` | Vendor. | Connected to ingredient supplier rows and purchase orders. |
| `SupplierPreferences` / `supplier_preferences` | Supplier policy/preferences. | Supports ordering/reorder behavior. |

## Inventory, Lots, Usage, And Purchasing

| Entity/table | Role | Relationships and notes |
| --- | --- | --- |
| `Inventory` / `inventory` | Current stock record. | Tracks quantity on hand, min stock, unit, audit fields, spoilage and shelf-life fields. |
| `InventoryLot` / `inventory_lots` | Lot-level receipt and remaining quantity. | Links to inventory, optional ingredient supplier, purchase order/item, delivery/spoilage dates, receipt source, and status. |
| `InventoryUsageLog` / `inventory_usage_log` | Used/wasted stock movement log. | Used by stock movement, waste, and deduction workflows. |
| `PurchaseOrder` / `purchase_orders` | Purchase order header. | Supplier/date/status/notes/total. |
| `PurchaseOrderItem` / `purchase_order_items` | Purchase order line. | Ingredient, quantity ordered/received, unit price, total, and ingredient supplier link. |
| `LeadTimeData`, `SpoilageData` | Supporting metrics. | Used by inventory/reorder analytics. |
| `InventoryDeductionDiscrepancy` | Deduction mismatch tracking. | Supports discrepancy and history endpoints. |

## Sales, Forecasting, And EOD

| Entity/table | Role | Relationships and notes |
| --- | --- | --- |
| `Sales` / `sales` | Historical and imported sales rows. | Links to menu item, timestamp, quantity, and sales channel. |
| `Forecast` / `forecasts` | Menu-item forecast output. | Stores forecast quantity, adjusted quantity, confidence, model source/type, metadata, version, and order-generation usage. |
| `ForecastBreakdown` / `forecast_breakdown` | Forecast decomposition. | Supports analysis of forecast components. |
| `ForecastAccuracy` and `DailyForecastAccuracy` | Accuracy metrics. | Used by forecast accuracy pages and EOD reporting. |
| `IngredientForecastBreakdown` | Forecasted ingredient needs. | Uses `source_type` and `source_id` to tie demand to menu or batch sources. |
| `BatchRecipeForecastBreakdown` | Forecasted batch needs. | Supports prep and ingredient projection. |
| `ForecastRunLedger` | Forecast pipeline ledger. | Unique per restaurant/date; tracks stage flags, counts, durations, errors, confidence/version. |
| `EODRunLedger` | End-of-day pipeline ledger. | Unique per restaurant/date; tracks sales deduction, forecast, reorder, PO suggestion, PO write, finalization, durations, errors. |
| `EODPurchaseOrderSuggestion` | EOD reorder suggestion persistence. | Stores suggested PO context generated during EOD/reorder flows. |

## Orders And POS-Adjacent Entities

| Entity/table | Role | Relationships and notes |
| --- | --- | --- |
| `Order`, `OrderItem`, `OrderItemModifier` | Order-entry/POS-adjacent order model. | Active backend `/orders` API exists, but there is no current sidebar order-entry UI. |
| `Payment` | Payment record. | POS/order-adjacent. |
| `Device` | Device registration. | Backend active route is `/auth/register-device`; old frontend login code points at stale `/pos/register-device`. |
| `POSItemMapping` | External POS item to PrepIQ menu mapping. | Used by POS sync/mapping flows. |
| `POSMerchantMapping` | External POS merchant/account mapping. | Used by external POS OAuth/sync. |

## Team And Time Entities

Team and timekeeping schema exists for employees, clock events, and scheduled shifts, but team/timekeeping is not a current product area. The backend `team_routes.py` is not mounted and current sidebar navigation does not expose team pages, so RAG should treat this as legacy/code-resident rather than pending active work.

## External Data

Weather and traffic tables/models exist to support forecast features. Forecasting can use weather-derived context where configured.

## Derived And Calculated Data

Important calculated data is persisted rather than only computed at request time:

- forecast rows and accuracy rows
- forecast and EOD ledgers
- ingredient and batch recipe forecast breakdowns
- inventory lots and usage logs
- deduction discrepancies
- EOD purchase order suggestions
- supplier/ingredient cost and cadence data

For RAG, prefer services and docs over raw rows when explaining business behavior. Raw schema is best for entity relationships and source-of-truth fields.

## Migration And Schema Notes

- Migration history is stored as SQL scripts in `scripts/migrations/`; there is no active Alembic `versions/` history in the repo.
- Migration naming is mixed and includes several ad hoc scripts and seed helpers.
- `app/db/init_db.py` appears stale: it imports sync names that are not exported by the current async session module. Treat it as legacy unless it is repaired.
- Some migrations mention internal POS terminal/cash-drawer structures without matching active ORM/route surfaces in the current source. Internal POS is not being used right now.
