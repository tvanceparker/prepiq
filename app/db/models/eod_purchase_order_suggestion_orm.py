from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    DECIMAL,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from app.db.session import Base


class EODPurchaseOrderSuggestion(Base):
    __tablename__ = "eod_purchase_order_suggestions"
    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            "run_date",
            "supplier_id",
            "ingredient_id",
            name="uq_eod_po_suggestions_restaurant_date_supplier_ingredient",
        ),
    )

    suggestion_id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True
    )
    run_date = Column(Date, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("supplier.supplier_id"), nullable=False)
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )
    ingredient_supplier_id = Column(
        Integer,
        ForeignKey("ingredient_supplier.ingredient_supplier_id"),
        nullable=False,
    )
    lead_demand = Column(DECIMAL(12, 2), nullable=False, default=0)
    shelf_demand = Column(DECIMAL(12, 2), nullable=False, default=0)
    forecast_unit = Column(String(20), nullable=True)
    converted_quantity_needed = Column(DECIMAL(12, 2), nullable=False, default=0)
    suggested_packs_to_order = Column(Integer, nullable=False, default=0)
    total_quantity_ordered = Column(DECIMAL(12, 2), nullable=False, default=0)
    supplier_unit = Column(String(20), nullable=False)
    inventory_unit = Column(String(20), nullable=True)
    lead_time_days = Column(Integer, nullable=False, default=0)
    shelf_life_days = Column(Integer, nullable=False, default=0)
    pack_size = Column(Integer, nullable=False, default=1)
    quantity_per_pack_item = Column(DECIMAL(12, 2), nullable=False, default=1)
    min_order_quantity = Column(DECIMAL(12, 2), nullable=False, default=0)
    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.order_id"),
        nullable=True,
    )
    written_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
