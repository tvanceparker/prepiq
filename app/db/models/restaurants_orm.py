# app/db/models/restaurants_orm.py

from sqlalchemy import Column, BigInteger, String, Text, Enum, JSON, Date, Boolean, DECIMAL, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import INTEGER
from sqlalchemy.ext.declarative import declarative_base
from app.db.session import Base


def default_sales_channels():
    return ["in-house", "take-out"]
class Restaurant(Base):
    __tablename__ = "restaurants"

    restaurant_id = Column(INTEGER(11), primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(50))
    state = Column(String(50))
    zip_code = Column(String(20))
    # Latitude / longitude for geocoded restaurant address (nullable until backfilled)
    latitude = Column(DECIMAL(9,6), nullable=True)
    longitude = Column(DECIMAL(9,6), nullable=True)
    subscription_tier = Column(Enum('basic', 'pro', 'master'), nullable=False, default='basic')
    email = Column(String(255))
    subscription_status = Column(String(20), default='inactive') 
    expiry_date = Column(Date)
    forecast_length = Column(BigInteger)
    hours_of_operation = Column(JSON)
    tax_rate = Column(DECIMAL(5,2)) 
    timezone = Column(String(100))
    eod_run_when_closed = Column(Boolean, default=True) 
    eod_run_after_close_mins = Column(INTEGER(unsigned=True), default=60)
    sales_channels = Column(JSON, default=default_sales_channels)
    last_eod_run_date = Column(Date, nullable=True)
    # Feature flags and settings for POS/kitchen behavior
    settings = Column(JSON, default=dict)
    has_pos_display = Column(Boolean, default=False)  # True if restaurant has dedicated POS terminals
    has_kitchen_display = Column(Boolean, default=False)  # True if restaurant has dedicated kitchen displays
    default_ui_layout = Column(String(16), default='auto')  # Default UI layout for devices
    
    # External POS Integration fields
    pos_provider = Column(Enum('none', 'square', 'toast', 'clover'), nullable=False, default='none')
    pos_connected = Column(Boolean, default=False)
    pos_access_token = Column(Text, nullable=True)  # Encrypted token
    pos_refresh_token = Column(Text, nullable=True)  # Encrypted refresh token
    pos_location_id = Column(String(255), nullable=True)  # Provider's location identifier
    pos_merchant_id = Column(String(255), nullable=True)  # Provider's merchant/account ID
    pos_last_sync = Column(DateTime, nullable=True)
    pos_sync_enabled = Column(Boolean, default=True)
    pos_webhook_secret = Column(String(255), nullable=True)  # For webhook signature verification
    pos_sync_orders = Column(Boolean, default=True)  # Sync order data
    pos_sync_payments = Column(Boolean, default=True)  # Sync payment data
    pos_sync_menu = Column(Boolean, default=False)  # Sync menu items from POS
    pos_mode = Column(Enum('none', 'external'), nullable=False, default='none')


    ingredients = relationship("Ingredient", back_populates="restaurant")
    inventory = relationship("Inventory", back_populates="restaurant")
    recipes = relationship("Recipe", back_populates="restaurant")
    recipe_modifiers = relationship("RecipeModifier", back_populates="restaurant")
    menu_items = relationship("MenuItem", back_populates="restaurant")
    employees = relationship("Employee", back_populates="restaurant")
    sales = relationship("Sales", back_populates="restaurant")
    forecasts = relationship("Forecast", back_populates="restaurant")
    forecast_accuracy = relationship("ForecastAccuracy", back_populates="restaurant")
    forecast_breakdown = relationship("ForecastBreakdown", back_populates="restaurant")
    spoilage_data = relationship("SpoilageData", back_populates="restaurant")
    error_logs = relationship("ErrorLog", back_populates="restaurant")
    activity_logs = relationship("ActivityLog", back_populates="restaurant")
    weather_data = relationship("WeatherData", back_populates="restaurant")
    traffic_data = relationship("TrafficData", back_populates="restaurant")
    lead_time_data = relationship("LeadTimeData", back_populates="restaurant")
    scheduled_shifts = relationship("ScheduledShift", back_populates="restaurant")
    clock_events = relationship("ClockEvent", back_populates="restaurant")
    supplier = relationship("Supplier", back_populates="restaurant")
    menu_item_recipes = relationship("MenuItemRecipe", back_populates="restaurant")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="restaurant")
    ingredient_supplier = relationship(
        "IngredientSupplier", back_populates="restaurant"
    )
    inventory_lots = relationship("InventoryLot", back_populates="restaurant")
    purchase_orders = relationship("PurchaseOrder", back_populates="restaurant")
    purchase_order_items = relationship(
        "PurchaseOrderItem", back_populates="restaurant"
    )
    supplier_preferences = relationship(
        "SupplierPreference", back_populates="restaurant"
    )
    prep_schedules = relationship("PrepSchedule", back_populates="restaurant")
    batch_recipes = relationship("BatchRecipe", back_populates="restaurant")
    batch_recipe_ingredients = relationship(
        "BatchRecipeIngredient", back_populates="restaurant"
    )
    menu_item_batch_usage = relationship(
        "MenuItemBatchUsage", back_populates="restaurant"
    )
    alerts = relationship("Alert", back_populates="restaurant")
    daily_forecast_accuracy = relationship(
        "DailyForecastAccuracy", back_populates="restaurant"
    )
    usage_logs = relationship("InventoryUsageLog", back_populates="restaurant")
    roles = relationship("Role", back_populates="restaurant", cascade="all, delete-orphan")
    permissions = relationship("Permission", back_populates="restaurant", cascade="all, delete-orphan")
    role_permissions = relationship("RolePermission", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant")
    payments = relationship("Payment", back_populates="restaurant")
    devices = relationship("Device", back_populates="restaurant")
    order_items = relationship("OrderItem", back_populates="restaurant")
    order_item_modifiers = relationship("OrderItemModifier", back_populates="restaurant")
    forecast_run_ledgers = relationship("ForecastRunLedger", back_populates="restaurant")
