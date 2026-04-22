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
    pos_webhooks,
    assistant_routes,
)
from app.api.v1 import pos_mappings_routes
from app.utils.eod_runner import run_eod_jobs
import app.db.models  # Register ORM models via package auto-import side effects.
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
app.include_router(assistant_routes.router, prefix="/api/v1")
