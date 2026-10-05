# PrepIQ v1 sign-off

V1 is an external-POS-fed food planning product. The launch tiers are Basic and Full. This document freezes the sign-off criteria; it is not a claim that production has already been deployed or validated with customer demand.

## Product boundary and old issue disposition

- **#17:** Tenant Info, User Management, Restaurant Settings, Integration Settings and Account Settings are the active admin/settings surfaces. Tenant-scoped activity logs and sales/EOD diagnostics are accepted support APIs. Role/permission APIs support User Management and existing authentication; they do not promise a workforce product. Settings POS APIs configure external ingestion. They are retained within that boundary.
- **#29:** Native order-entry routes are removed from `main.py`. External POS webhooks and item mappings remain registered. `OrderService` remains an internal ingestion dependency. Device, payments, cash drawer, KDS/waiter sockets and their unused clients/types are accepted dormant source; they are not registered by the v1 application. Reintroducing one requires a separately scoped product decision.
- **#35:** Shared web PageHeader/CardShell/TableShell and the responsive Layout remain the launch presentation pattern. Compact headers retain their actions and icons. Mobile has EOD Detail navigation alongside the same Basic/Full domains. A new design system or a rewrite of dormant pages is post-v1 work, not a launch prerequisite.

## Minimum repeatable dataset

Run `python -m scripts.demo_food_waste_dataset`. The generated `fixtures/demo_food_waste/setup.json` defines two isolated demo tenants, ingredients, supplier packs/cadence, a prepared batch and recipe mappings. `sales.csv` supplies 90 days of dated sales, including intermittent demand. Configure the menu names before importing the file into each demo tenant. The generator does not write a database.

Full validation also includes mixed g/kg quantities, expiring and fresh lots, usable prepared carryover, an existing scheduled prep, a confirmed inbound PO, an infeasible MOQ/pack and another tenant's inventory. The executable database fixtures in `tests/food_waste/test_pipeline_regressions.py` specify exact arithmetic and retry expectations for these cases.

A missing sales row is treated as zero demand only within an explicitly declared complete history window or a declared closed day. A sale by itself does not establish import completeness. Unknown/missing/censored dates require review.

After verifying the importer actually supplied full business days, set the existing Restaurant Settings `settings` JSON, for example:

```json
{
  "sales_history_coverage": {"start_date": "2026-07-08", "end_date": "2026-10-05"},
  "sales_observations": {"2026-08-01": "closed", "2026-09-02": "missing", "2026-09-03": "stockout"}
}
```

Explicit per-date observations override window completeness; `unavailable` also marks censored demand. Do not mark a period complete merely to remove a warning. Offsetting an aware CSV timestamp uses tenant hours; naive daily CSV dates preserve the operator's date. Legacy null business dates require a separate timezone/hours reconciliation before backfill. Observed sales during a stockout can understate demand; the synthetic benchmark does not solve that identification problem.

## Execution and release gates

1. Back up and apply `scripts/migrations/0016_food_waste_pipeline_contracts.sql` in a disposable MySQL environment. Audit historical receipt quantities and unallocated movements before using customer stock. No historical lot quantity is silently multiplied or rewritten by the migration.
2. Install `requirements-test.txt`; run `pytest tests/`. Run web tests/build and mobile TypeScript checks. Validate the MySQL connection lock with two concurrent EOD requests: one must receive 409 and stock must change once. SQLite regression tests cover persistence/arithmetic, not MySQL lock behavior.
3. Import the repeatable dataset. Verify Basic sales/forecast/settings and Full prep/inventory/ordering/EOD, including dates across midnight and repeat runs. Inspect review-required pack recommendations before converting them to a manual purchase order.
4. Verify external POS ingestion, tenant isolation and the dormant route boundary. Check fresh, reused, missing and failed forecast states on both clients.
5. Run `python -m scripts.benchmark_reorder --gbm --output report.json`, then repeat with representative held-out restaurant demand. Compare waste, availability and cash. The candidate remains offline/shadow; a production algorithm decision requires discussion and agreed availability/waste gates.
6. Record operator sign-off, database reconciliation results and deployment date here before calling the production launch complete.

The implementation issue list is an engineering backlog, not a substitute for the release gates above. Closing an implementation issue does not apply a migration to a live database or certify a customer launch.


## Engineering validation recorded October 5, 2026

- Full backend suite with disposable database tests enabled: **350 passed, 11 skipped**. The 11 inherited skips belong to dormant legacy Basic helper/native-order mock suites; the active Basic canonical adapter is separately covered.
- Five database checks exercise migration application, connection-owned planning locks across commits/child tasks, duplicate consumption, concurrent receipts into previously absent stock, and concurrent prep completion. Local server: MariaDB 12.2.2/InnoDB, repeatable read, `innodb_snapshot_isolation=OFF` to match MySQL locking-read behavior. MySQL 8 is configured in `.github/workflows/food-waste-validation.yml`.
- The migration contract fixture comes from the baseline ORM. It omits unrelated legacy foreign keys and supplies lengths for legacy unbounded String declarations. Applying it successfully is evidence about the changed contracts, not certification of every customer's historical schema.
- Web tests: **3 suites, 7 tests passed**; production build passed with existing warnings. Mobile `npx tsc --noEmit` passed. Native UI/manual operator walkthroughs remain release sign-off work.
- Rolling-origin benchmark: **32 policy comparisons, 16 forecast comparisons**, including actual H2O fits and explicit constant-history fallback. Results and exact origins are saved in `notes/reorder-benchmark-results.json`; interpretation is in `notes/reorder-benchmark-summary.md`.
- No production migration, deployment, customer-history completeness declaration or restaurant operator sign-off was performed.

Use `PREPIQ_TEST_MYSQL_URL` only with the disposable `prepiq_validation` schema; the database fixtures recreate their contract tables. A customer database must never be used as a test target. The CI jobs apply the same migration fixture and concurrency checks against MySQL 8.

The active prep screens show dated net recommendations and review guidance, preserve operator-created tasks, and refresh recommendations after task changes. They use fractional draft counts; actual production remains an explicit completion action. Completed production cannot be reopened or deleted as a second production request. Waste costs are reported only when attributable to frozen purchase pricing; unknown/prepared costs remain unavailable.
