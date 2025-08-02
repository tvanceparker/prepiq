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
    prep_routes,
    eod_routes,
    auth_routes,
    admin_routes,
    settings_routes,
    alert_routes,
    permission_routes,
    team_routes,
    waiter_routes,
    kitchen_routes,
)
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
    forecast_accuracy_orm,
    forecast_breakdown_orm,
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
    allow_origins=["http://localhost:3000",
                   "http://10.0.14.5:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthExtractionMiddleware)

# Include routers after app creation
app.include_router(waiter_routes.router, prefix="/api/v1")
app.include_router(kitchen_routes.router, prefix="/api/v1")
# app.include_router(websocket_routes.router)
app.include_router(team_routes.router, prefix="/api/v1")
app.include_router(dashboard_routes.router, prefix="/api/v1")
app.include_router(profit_analytic_routes.router, prefix="/api/v1")
app.include_router(prep_routes.router, prefix="/api/v1")
app.include_router(eod_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")
app.include_router(menu_routes.router, prefix="/api/v1")
app.include_router(sales_forecast_routes.router, prefix="/api/v1")
app.include_router(inventory_routes.router, prefix="/api/v1")
app.include_router(settings_routes.router, prefix="/api/v1")
app.include_router(alert_routes.router, prefix="/api/v1")
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(permission_routes.router, prefix="/api/v1")

from app.sockets.kitchen_ws import router as kitchen_ws_router
from app.sockets.waiter_ws import router as waiter_ws_router

app.include_router(kitchen_ws_router)
app.include_router(waiter_ws_router)