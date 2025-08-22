# prepiq3/main.py
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
import os
import socket
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

def _get_local_ip():
    """Attempt to obtain the primary LAN IP (best-effort)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None

base_hosts = ["localhost", "127.0.0.1"]
lan_ip = _get_local_ip()
if lan_ip:
    base_hosts.append(lan_ip)

# Typical dev ports we want to allow (web, backend self-calls from tools, Expo Metro / web preview)
dev_ports = ["3000", "8000", "8081", "19000"]

dynamic_origins = [f"http://{h}:{p}" for h in base_hosts for p in dev_ports]

# Allow extra origins via env (comma separated full origins like http://10.131.80.54:3000)
extra = os.getenv("EXTRA_CORS_ORIGINS")
if extra:
    dynamic_origins.extend([o.strip() for o in extra.split(",") if o.strip()])

# Regex broadened to accept those private network ranges on the common dev ports above
allowed_ports_regex = "(3000|8000|8081|19000)"
private_ranges_regex = r"(localhost|127\\.0\\.0\\.1|10\\..+|192\\.168\\..+|172\\.(1[6-9]|2[0-9]|3[0-1])\\..+)"
origin_regex = rf"http://{private_ranges_regex}:{allowed_ports_regex}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=dynamic_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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