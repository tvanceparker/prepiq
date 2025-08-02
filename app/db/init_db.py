# db/init_db.py

from sqlalchemy import create_engine
from .session import Base, engine
from .models import (
    Supplier,
    Ingredient,
    Restaurant,
    Inventory,
    Recipe,
    RecipeIngredient,
    MenuItem,
    MenuItemRecipe,
    SpoilageData,
    Sale,
    Forecast,
    ForecastAccuracy,
    Employee,
    ClockEvent,
    ScheduledShift,
    IngredientSupplier,
    LeadTimeData,
    WeatherData,
    TrafficData,
    ErrorLog,
    ActivityLog,
)


def init_db():
    """Initialize the database and create tables."""
    # Create all tables (if they do not already exist)
    Base.metadata.create_all(bind=engine)


def seed_db():
    """Seed the database with initial data if necessary."""
    # Example of seeding initial data (you can expand this for your needs)
    from .session import SessionLocal

    db = SessionLocal()

    # Add some initial seed data (if desired)
    new_supplier = Supplier(name="Test Supplier", type="Produce", region="North")
    db.add(new_supplier)
    db.commit()

    # More seed logic here (add other models as needed)

    db.close()


if __name__ == "__main__":
    # Initialize the database and seed initial data
    init_db()
    seed_db()
