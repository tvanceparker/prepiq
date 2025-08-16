---
mode: agent
tools: ["search","readFiles","editFiles","runCommands","runTests","openSimpleBrowser","runPlaywright"]
priority: high
---

Goal
Fix the runtime error that occurs when running the End-Of-Day (EOD) flow which exercises `app/services/forecasting_engine_basic.py`. After the fix, be able to run the EOD action for the uploaded sales data dates 2025-08-14, 2025-08-15, and 2025-08-16 without throwing an exception.

Context
- Repo root: ${workspaceFolder}
- Backend: FastAPI app started via `uvicorn main:app --reload` (dev server already running in workspace tasks)
- EOD runner lives in `app/utils/eod_runner.py` and calls into the service `app/services/forecasting_engine_basic.py`.
- Sales data for the restaurant has already been uploaded for dates 2025-08-14, 2025-08-15 and 2025-08-16.
- The file to focus on: `app/services/forecasting_engine_basic.py` (train, prepare, and write forecast logic). Inspect DB models under `app/db/models/*.py` where necessary.

Reproduction (how I will validate before/after)
1. Confirm backend is running (task `Run Backend (FastAPI)` in workspace tasks). If not, start it.
2. Hit the EOD endpoint or otherwise trigger the EOD runner for 2025-08-14 (see verification curl examples below). Capture the full stack trace.
3. Fix the cause(s) in code. Prefer non-invasive changes and add targeted unit tests where feasible.
4. Re-run the EOD call for 2025-08-14 and confirm no exception and that forecast records (or expected DB side-effects) were written for that date.
5. Repeat the EOD run for 2025-08-15 and 2025-08-16 to ensure no regressions.

Files to read first (in this order)
- `app/services/forecasting_engine_basic.py`
- `app/utils/eod_runner.py`
- `app/services/eod_service.py` (if present) or EOD-related services
- `app/db/models/*.py` (to inspect `sales`, `employees`, `forecasts`, `forecast_breakdown`, `restaurants` models)
- `app/repositories/*_repo.py` used by the engine (SalesRepository, ForecastRepository, ForecastBreakdownRepository, etc.)

Allowed actions and tool usage
- The agent may search and read any project files.
- The agent may edit Python files under `app/` and `tests/` to implement fixes and tests.
- The agent may run commands: tests, lint, and lightweight DB queries in the local environment.
- The agent may run Playwright tests to validate the web UI flows if needed.
- The agent must not change secrets or create cloud resources.

Constraints
- Keep fixes minimal and low-risk: prefer robust input validation, defensive checks, and non-blocking behavior where appropriate.
- Do not rewrite the whole service; do focused changes with comments describing rationale.
- If heavy blocking operations are present (H2O, long model training), either offload to `asyncio.to_thread` or guard those code paths in the EOD runner with a safe fallback so EOD can finish.

Success criteria
- EOD run for 2025-08-14 completes without an unhandled exception (HTTP 200 or appropriate success response from EOD endpoint).
- Forecast records or summary entries are written for the affected restaurant for the 2025-08-14 period (verify by querying `forecasts` and `forecast_breakdown`).
- Unit test(s) added for any changed helper(s) (for example `_prepare_sales_dataframe`) and passing locally.

Verification commands (examples you can run locally)
- Trigger EOD via HTTP (adjust URL/port if using non-default):
  curl -v -X POST "http://localhost:8000/api/v1/eod/finalize" -H "Content-Type: application/json" -d '{"eod_date":"2025-08-14"}'

- Or if the app exposes a GET-style run endpoint:
  curl -v "http://localhost:8000/api/v1/eod/finalize?eod_date=2025-08-14"

- Quick DB checks (using mysql/mariadb client):
  mariadb -uroot -proot -e "USE prep_iq3; SELECT COUNT(*) FROM forecasts WHERE forecast_period_start = '2025-08-14' OR forecast_period_end = '2025-08-14';"
  mariadb -uroot -proot -e "USE prep_iq3; SELECT COUNT(*) FROM forecast_breakdown WHERE forecast_date BETWEEN '2025-08-14' AND '2025-08-14';"

Deliverables
1. A short plan (1-3 bullets) before applying edits.
2. A patch with minimal code changes and comments explaining why.
3. One or two unit tests covering the fix (if applicable).
4. Exact verification commands and their expected outputs (copyable).

Notes and hints for the agent
- Common failure modes seen in this repo:
  - Blocking model code (H2O) called directly from async handlers.
  - Input data encoding/format issues (some seed files are UTF-16; sales uploads may contain nulls or timezone-naive datetimes).
  - Theme/React issues are unrelated; focus on backend EOD flow.

If you need interactive UI validation, run Playwright steps and attach a trace. Otherwise provide logs and DB checks.

Return format
- First return a 2–4 line plan. If approved, apply changes and return a summary of edits, tests run, and verification outputs.
