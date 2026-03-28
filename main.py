# prepiq3/main.py
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.logging import logger
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import AuthExtractionMiddleware
from app.api.v1 import (
    menu_routes,
    inventory_routes,
    dashboard_routes,
    sales_forecast_routes,
    profit_analytic_routes,
    waste_analytics_routes,
    prep_routes,
    eod_routes,
    auth_routes,
    admin_routes,
    settings_routes,
    alert_routes,
    orders_routes,
    pos_routes,
    pos_webhooks,
    kitchen_routes,
)
from app.api.v1 import pos_mappings_routes
from app.utils.eod_runner import run_eod_jobs
# from app.db import models  # <- Register all models
from app.db.models import (
    activity_logs_orm,
    alerts_orm,
    roles_orm,
    permissions_orm,
    role_permissions_orm,
    employees_orm,
    clock_events_orm,
    error_logs_orm,
    daily_forecast_accuracy_orm,
    devices_orm,
    forecast_accuracy_orm,
    forecast_breakdown_orm,
    forecast_run_ledger_orm,
    forecasts_orm,
    ingredient_supplier_orm,
    inventory_usage_log_orm,
    ingredients_orm,
    inventory_lot_orm,
    inventory_orm,
    lead_time_data_orm,
    menu_item_batch_usage_orm,
    menu_item_recipes_orm,
    menu_item_recipes_orm,
    menu_items_orm,
    recipe_ingredients_orm,
    recipes_orm,
    restaurants_orm,
    sales_orm,
    scheduled_shifts_orm,
    spoilage_data_orm,
    supplier_orm,
    traffic_data_orm,
    weather_data_orm,
    supplier_preferences_orm,
    batch_recipe_ingredients_orm,
    batch_recipes_orm,
    forecast_breakdown_orm,
    prep_schedule_orm,
    purchase_order_items_orm,
    purchase_orders_orm,
    recipe_modifiers_orm,
    supplier_preferences_orm,
    batch_recipe_forecast_breakdown_orm,
    ingredient_forecast_breakdown_orm,
    eod_purchase_order_suggestion_orm,
    orders_orm,
    order_items_orm,
    order_item_modifiers_orm,
    payments_orm,
    pos_item_mappings_orm,
    pos_merchant_mappings_orm,
    # Cash drawer and terminal reader models
    stripe_terminal_readers_orm,
    cash_drawer_sessions_orm,
    cash_drawer_transactions_orm,
)
# import logging
# logging.basicConfig()
# logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)



uvicorn_logger = logging.getLogger("uvicorn")
for name in ["uvicorn", "uvicorn.access", "uvicorn.error", "sqlalchemy.engine"]:
    log = logging.getLogger(name)
    log.handlers.clear()
    log.handlers = logger.handlers
    log.setLevel(logger.level)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    scheduler.add_job(run_eod_jobs, "interval", minutes=60)
    scheduler.start()
    yield
    # SHUTDOWN
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\..+|192\.168\..+|172\.(1[6-9]|2[0-9]|3[0-1])\..+):3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.add_middleware(AuthExtractionMiddleware)

# Include routers after app creation
app.include_router(kitchen_routes.router, prefix="/api/v1")
app.include_router(pos_routes.router, prefix="/api/v1")
app.include_router(pos_webhooks.router, prefix="/api/v1")  # POS webhook routes
app.include_router(pos_mappings_routes.router, prefix="/api/v1")  # POS mappings routes
app.include_router(orders_routes.router, prefix="/api/v1")
# app.include_router(websocket_routes.router)
app.include_router(dashboard_routes.router, prefix="/api/v1")
app.include_router(profit_analytic_routes.router, prefix="/api/v1")
app.include_router(waste_analytics_routes.router, prefix="/api/v1")
app.include_router(prep_routes.router, prefix="/api/v1")
app.include_router(eod_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")
app.include_router(menu_routes.router, prefix="/api/v1")
app.include_router(sales_forecast_routes.router, prefix="/api/v1")
app.include_router(inventory_routes.router, prefix="/api/v1")
app.include_router(settings_routes.router, prefix="/api/v1")
app.include_router(alert_routes.router, prefix="/api/v1")
app.include_router(auth_routes.router, prefix="/api/v1")

from app.sockets.kitchen_ws import router as kitchen_ws_router
from app.sockets.pos_ws import router as pos_ws_router

app.include_router(kitchen_ws_router)
app.include_router(pos_ws_router)