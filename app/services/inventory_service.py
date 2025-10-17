# core/services/inventory_service.py

from typing import List, Union
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.supplier_repo import SupplierRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.lead_time_data_repo import LeadTimeDataRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.services.utils.unit_conversion import convert_unit, round_decimal

class InventoryService:
    # --- Purchase Orders ---
    async def create_purchase_order(self, supplier_id: int, expected_delivery_date, items: list, notes: str = None) -> dict:
        """
        Create a new purchase order with items.
        """
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from sqlalchemy import func
        import datetime
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)
        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        async with self.db.begin():
            order_date = datetime.date.today()
            po_data = {
                "restaurant_id": self.restaurant_id,
                "supplier_id": supplier_id,
                "order_date": order_date,
                "expected_delivery_date": expected_delivery_date,
                "status": "cart",
                "total_order_price": 0.0,
                "notes": notes,
            }
            po = await po_repo.create(po_data)
            total = 0.0
            item_objs = []
            for item in items:
                item_data = {
                    "restaurant_id": self.restaurant_id,
                    "order_id": po.order_id,
                    "ingredient_id": item["ingredient_id"],
                    "ingredient_supplier_id": item.get("ingredient_supplier_id"),
                    "quantity_ordered": item["quantity_ordered"],
                    "unit": item["unit"],
                    "unit_price": item["unit_price"],
                    "total_item_price": float(item["quantity_ordered"]) * float(item["unit_price"]),
                }
                total += item_data["total_item_price"]
                item_obj = await poi_repo.create(item_data)
                item_objs.append(item_obj)
            await po_repo.update(po.order_id, {"total_order_price": total})
        return {"order_id": po.order_id, "total_order_price": total, "status": "cart"}

    async def get_purchase_orders(self, status: str = None, supplier_id: int = None) -> list:
        """
        List purchase orders, optionally filter by status or supplier.
        """
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from app.repositories.supplier_repo import SupplierRepository
        from app.repositories.ingredients_repo import IngredientRepository
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)
        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        supplier_repo = SupplierRepository(self.db, self.restaurant_id)
        ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
        filters = {}
        if status:
            filters["status"] = status
        if supplier_id:
            filters["supplier_id"] = supplier_id
        pos = await po_repo.get_all(filters)
        result = []
        for po in pos:
            supplier = await supplier_repo.get_by_id(po.supplier_id)
            items = await poi_repo.get_by_field("order_id", po.order_id)
            item_dtos = []
            for item in items:
                ingredient = await ingredient_repo.get_by_id(item.ingredient_id)
                item_dtos.append({
                    "order_item_id": item.order_item_id,
                    "order_id": item.order_id,
                    "ingredient_id": item.ingredient_id,
                    "ingredient_name": ingredient.name if ingredient else "Unknown",
                    "ingredient_supplier_id": item.ingredient_supplier_id,
                    "quantity_ordered": float(item.quantity_ordered),
                    "unit": item.unit,
                    "unit_price": float(item.unit_price),
                    "total_item_price": float(item.total_item_price),
                })
            result.append({
                "order_id": po.order_id,
                "restaurant_id": po.restaurant_id,
                "supplier_id": po.supplier_id,
                "supplier_name": supplier.name if supplier else "Unknown",
                "order_date": po.order_date,
                "expected_delivery_date": po.expected_delivery_date,
                "actual_delivery_date": po.actual_delivery_date,
                "status": po.status,
                "total_order_price": float(po.total_order_price),
                "items": item_dtos,
                "notes": getattr(po, "notes", None),
            })
        return result

    async def get_purchase_order_detail(self, order_id: int) -> dict:
        """
        Get a single purchase order with items.
        """
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        from app.repositories.supplier_repo import SupplierRepository
        from app.repositories.ingredients_repo import IngredientRepository
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)
        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        supplier_repo = SupplierRepository(self.db, self.restaurant_id)
        ingredient_repo = IngredientRepository(self.db, self.restaurant_id)
        po = await po_repo.get_by_id(order_id)
        if not po:
            return None
        supplier = await supplier_repo.get_by_id(po.supplier_id)
        items = await poi_repo.get_by_field("order_id", po.order_id)
        item_dtos = []
        for item in items:
            ingredient = await ingredient_repo.get_by_id(item.ingredient_id)
            item_dtos.append({
                "order_item_id": item.order_item_id,
                "order_id": item.order_id,
                "ingredient_id": item.ingredient_id,
                "ingredient_name": ingredient.name if ingredient else "Unknown",
                "ingredient_supplier_id": item.ingredient_supplier_id,
                "quantity_ordered": float(item.quantity_ordered),
                "unit": item.unit,
                "unit_price": float(item.unit_price),
                "total_item_price": float(item.total_item_price),
            })
        return {
            "order_id": po.order_id,
            "restaurant_id": po.restaurant_id,
            "supplier_id": po.supplier_id,
            "supplier_name": supplier.name if supplier else "Unknown",
            "order_date": po.order_date,
            "expected_delivery_date": po.expected_delivery_date,
            "actual_delivery_date": po.actual_delivery_date,
            "status": po.status,
            "total_order_price": float(po.total_order_price),
            "items": item_dtos,
            "notes": getattr(po, "notes", None),
        }

    async def update_purchase_order_status(self, order_id: int, status: str) -> dict:
        """
        Update the status of a purchase order (cart, pending, delivered, etc).
        """
        from app.repositories.purchase_orders_repo import PurchaseOrderRepository
        po_repo = PurchaseOrderRepository(self.db, self.restaurant_id)
        await po_repo.update(order_id, {"status": status})
        return {"order_id": order_id, "status": status}

    async def add_item_to_purchase_order(self, order_id: int, item: dict) -> dict:
        """
        Add an item to an existing purchase order.
        """
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        item_data = {
            "restaurant_id": self.restaurant_id,
            "order_id": order_id,
            "ingredient_id": item["ingredient_id"],
            "ingredient_supplier_id": item.get("ingredient_supplier_id"),
            "quantity_ordered": item["quantity_ordered"],
            "unit": item["unit"],
            "unit_price": item["unit_price"],
            "total_item_price": float(item["quantity_ordered"]) * float(item["unit_price"]),
        }
        obj = await poi_repo.create(item_data)
        return {"order_item_id": obj.order_item_id}

    async def remove_item_from_purchase_order(self, order_id: int, order_item_id: int) -> dict:
        """
        Remove an item from a purchase order.
        """
        from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
        poi_repo = PurchaseOrderItemRepository(self.db, self.restaurant_id)
        await poi_repo.delete(order_item_id)
        return {"order_item_id": order_item_id, "removed": True}

    def __init__(self, db: AsyncSession, restaurant_id: int,subscription_tier:str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.supplier_repo = SupplierRepository(db, restaurant_id)
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.lead_time_data_repo = LeadTimeDataRepository(db, restaurant_id)
        self.inventory_usage_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db,restaurant_id)

        print(f"Inventory Service: restaurant {self.restaurant_id}")

    async def get_ingredient_names(self) -> list:
        """
        Returns a list of all ingredient names and IDs for autocomplete/search.
        """
        ingredients = await self.ingredient_repo.get_all()
        return [
            {"ingredient_id": ing.ingredient_id, "ingredient_name": getattr(ing, "ingredient_name", getattr(ing, "name", "Unknown"))}
            for ing in ingredients
        ]
    async def get_stock_movements(self, start_date: date, end_date: date, ingredient_id: int = None) -> list:
        """
        Returns a chronological list of all stock movements (inbound and outbound) for the given date range and ingredient.
        Includes: Receipts (lots), Usage (sales, waste, batch, adjustments), Batch Production (in/out).
        Only available for Pro/Master tiers.
        """
        if self.subscription_tier not in ["pro", "master"]:
            raise Exception("Stock Movements are only available for Pro and Master tiers.")

        # Get all ingredients (for name lookup)
        ingredient_map = {ing.ingredient_id: ing.name for ing in await self.ingredient_repo.get_all()}

        # 1. Inventory In: Lots (deliveries)
        lots = await self.inventory_lot_repo.get_all()
        lot_movements = []
        for lot in lots:
            if (ingredient_id and lot.ingredient_id != ingredient_id):
                continue
            if not (start_date <= lot.delivery_date <= end_date):
                continue
            lot_movements.append({
                "date": lot.delivery_date.isoformat(),
                "type": "Purchase",
                "ingredient_id": lot.ingredient_id,
                "ingredient_name": ingredient_map.get(lot.ingredient_id, "Unknown"),
                "quantity": float(lot.total_received),
                "unit": lot.unit,
                "source_or_destination": None,  # Could add supplier name if needed
                "lot_id": lot.lot_id,
                "notes": None,
            })

        # 2. Inventory Out: Usage Logs (sales, waste, batch, adjustments)
        usage_logs = await self.inventory_usage_log_repo.get_all()
        usage_movements = []
        for log in usage_logs:
            if (ingredient_id and log.ingredient_id != ingredient_id):
                continue
            if not (start_date <= log.used_date.date() <= end_date):
                continue
            usage_movements.append({
                "date": log.used_date.isoformat(),
                "type": log.usage_type.replace("_", " ").title(),
                "ingredient_id": log.ingredient_id,
                "ingredient_name": ingredient_map.get(log.ingredient_id, "Unknown"),
                "quantity": float(log.used_quantity) * -1,  # Outbound is negative
                "unit": log.unit,
                "source_or_destination": None,  # Could add reference info
                "lot_id": log.lot_id,
                "notes": log.notes,
            })

        # 3. Inventory In: Batch Output (when a batch recipe is produced, it creates inventory)
        # (Assume batch output is logged as a positive adjustment in usage logs with usage_type='batch_output')
        batch_output_movements = [
            {
                "date": log.used_date.isoformat(),
                "type": "Batch Output",
                "ingredient_id": log.ingredient_id,
                "ingredient_name": ingredient_map.get(log.ingredient_id, "Unknown"),
                "quantity": float(log.used_quantity),
                "unit": log.unit,
                "source_or_destination": None,
                "lot_id": log.lot_id,
                "notes": log.notes,
            }
            for log in usage_logs
            if log.usage_type == "batch_output"
            and (not ingredient_id or log.ingredient_id == ingredient_id)
            and (start_date <= log.used_date.date() <= end_date)
        ]

        # Combine all movements
        all_movements = lot_movements + usage_movements + batch_output_movements
        all_movements.sort(key=lambda x: ((x["ingredient_id"] if x["ingredient_id"] is not None else -1), x["date"]))

        # Calculate running balance per ingredient
        running_balances = {}
        for move in all_movements:
            ing_id = move["ingredient_id"]
            prev = running_balances.get(ing_id, 0)
            running_balances[ing_id] = prev + move["quantity"]
            move["running_balance"] = running_balances[ing_id]

    # Filter out any movement with ingredient_id == None (invalid for DTO)
        all_movements = [m for m in all_movements if m["ingredient_id"] is not None]
        return all_movements
    async def get_lot_info(self, lot_id: int) -> dict:
        # Get lot details
        lot = await self.inventory_lot_repo.get_by_id(lot_id)
        if not lot:
            return {}

        # Get supplier info
        supplier = None
        if lot.ingredient_supplier_id:
            supplier = await self.ingredient_supplier_repo.get_by_id(lot.ingredient_supplier_id)
        
        sup_name = await self.supplier_repo.get_by_id(supplier.supplier_id)
        supplier_name = sup_name.name

        # Combine data
        return {
            "lot_id": lot.lot_id,
            "delivery_date": lot.delivery_date,
            "spoilage_expected_date": lot.spoilage_expected_date,
            "received_quantity": lot.quantity,
            "status": lot.status,
            "supplier": {
                "supplier_name": supplier_name,
                "ingredient_supplier_id": supplier.ingredient_supplier_id if supplier else None,
                "cost_per_unit": supplier.cost_per_unit if supplier else None,
                "total_packs": int(supplier.pack_size * float(lot.quantity)) if supplier else None,
                "pack_description": f"{supplier.pack_size} packs of {supplier.quantity_per_pack_item} {supplier.unit}" if supplier else None,
            } if supplier else None,
                }

    async def get_used_usage_logs(self, lot_id: int) -> list[dict]:
        used_types = ['sale', 'manual_adjustment', 'batch_production', 'batch_fallback']
        logs = await self.inventory_usage_log_repo.get_by_lot_id_and_usage_types(lot_id, used_types)

        return [
            {
                "usage_id": log.usage_id,
                "used_quantity": float(log.used_quantity),
                "unit": log.unit,
                "used_date": log.used_date.isoformat(),
                "usage_type": log.usage_type,
                "reference_type": log.reference_type,
                "reference_id": log.reference_id,
                "notes": log.notes,
            }
            for log in logs
        ]

    async def get_wasted_usage_logs(self, lot_id: int) -> list[dict]:
        wasted_types = ['waste', 'spoilage']
        logs = await self.inventory_usage_log_repo.get_by_lot_id_and_usage_types(lot_id, wasted_types)

        return [
            {
                "usage_id": log.usage_id,
                "used_quantity": float(log.used_quantity),
                "unit": log.unit,
                "used_date": log.used_date.isoformat(),
                "usage_type": log.usage_type,
                "reference_type": log.reference_type,
                "reference_id": log.reference_id,
                "notes": log.notes,
            }
            for log in logs
        ]
    
    async def create_ingredient_supplier(self, supplier_id: int, create_data: dict) -> dict:
        try:
            # Inject supplier_id into the data
            create_data["supplier_id"] = supplier_id

            async with self.db.begin():
                created_ingredient_supplier = await self.ingredient_supplier_repo.create(create_data)
                if not created_ingredient_supplier:
                    return {"success": False, "message": "Failed to create ingredient-supplier relationship"}

            return {
                "success": True,
                "message": "Ingredient-supplier relationship created successfully",
                "data": created_ingredient_supplier,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}

    async def create_supplier(self, create_data: dict) -> dict:
        try:
            async with self.db.begin():
                created_supplier = await self.supplier_repo.create(create_data)
                if not created_supplier:
                    return {"success": False, "message": "Failed to create supplier"}

            return {
                "success": True,
                "message": "Supplier created successfully",
                "data": created_supplier,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}

    async def update_ingredient_supplier(
        self, ingredient_supplier_id: int, update_data: dict
    ) -> dict:
        try:
            async with self.db.begin():
                updated_ing_sup = await self.ingredient_supplier_repo.update(
                    ingredient_supplier_id, update_data
                )
                if not updated_ing_sup:
                    return {
                        "success": False,
                        "message": "Ingredient-Supplier relationship not found",
                    }

            return {
                "success": True,
                "message": "Ingredient-supplier info updated successfully",
            }
            await self.db.rollback()
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def update_supplier(self, supplier_id: int, update_data: dict) -> dict:
        try:
            async with self.db.begin():
                updated_supplier = await self.supplier_repo.update(
                    supplier_id, update_data
                )
                if not updated_supplier:
                    return {"success": False, "message": "Supplier not found"}

            return {"success": True, "message": "Supplier updated successfully"}
            await self.db.rollback()
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def view_supplier_info(self) -> List[dict]:
        """
        View suppliers, the ingredients they supply, and packaging/pricing info.
        """
        suppliers = await self.supplier_repo.get_all()
        ingredient_supplier_rows = (
            await self.ingredient_supplier_repo.get_all()
        )
        ingredient_map = {
            ing.ingredient_id: ing for ing in await self.ingredient_repo.get_all()
        }

        supplier_info = []

        for supplier in suppliers:
            supplier_ingredients = [
                row
                for row in ingredient_supplier_rows
                if row.supplier_id == supplier.supplier_id
            ]

            ingredient_details = []
            for rel in supplier_ingredients:
                ingredient = ingredient_map.get(rel.ingredient_id)
                if not ingredient:
                    continue

                ingredient_details.append(
                    {
                        "ingredient_supplier_id": rel.ingredient_supplier_id,
                        "ingredient_id": rel.ingredient_id,
                        "ingredient_name": ingredient.name,
                        "unit": rel.unit or ingredient.unit,
                        "cost_per_unit": float(rel.cost_per_unit),
                        "lead_time_days": rel.lead_time_days,
                        "spoilage_rate": float(rel.spoilage_rate or 0.0),
                        "shelf_life_days": rel.shelf_life_days,
                        "preferred": bool(rel.preferred),
                        "min_order_quantity": rel.min_order_quantity,
                        "supplier_priority": rel.supplier_priority,
                        "pack_size": rel.pack_size,
                        "quantity_per_pack_item": float(
                            rel.quantity_per_pack_item or 1.0
                        ),
                    }
                )

            supplier_info.append(
                {
                    "supplier_id": supplier.supplier_id,
                    "name": supplier.name,
                    "type": supplier.type,
                    "region": supplier.region,
                    "contact_info": supplier.contact_info,
                    "rating": float(supplier.rating or 0),
                    "website": supplier.website,
                    "is_active": bool(supplier.is_active),
                    "supplier_feedback": supplier.supplier_feedback,
                    "contract_status": supplier.contract_status,
                    "contract_start_date": str(supplier.contract_start_date),
                    "contract_end_date": str(supplier.contract_end_date),
                    "ingredients": ingredient_details,
                }
            )

        return supplier_info

    async def get_inventory_adjustment_log(self) -> List[dict]:
        """
        Returns a log of all inventory adjustments, including ingredient names,
        ordered by most recent first.
        """
        try:
            usage_logs = await self.inventory_usage_log_repo.get_all()
            log_data = []

            for log in sorted(usage_logs, key=lambda x: x.used_date, reverse=True):
                ingredient = await self.ingredient_repo.get_by_id(log.ingredient_id)

                log_data.append(
                    {
                        "usage_id": log.usage_id,
                        "inventory_id": log.inventory_id,
                        "lot_id": log.lot_id,
                        "ingredient_id": log.ingredient_id,
                        "ingredient_name": ingredient.name if ingredient else "Unknown",
                        "used_quantity": float(log.used_quantity),
                        "unit": log.unit,
                        "used_date": log.used_date.isoformat(),
                        "usage_type": log.usage_type,
                        "reference_type": log.reference_type,
                        "reference_id": log.reference_id,
                        "notes": log.notes,
                    }
                )

            return log_data

        except Exception as e:
            print(f"[ERROR] Failed to get adjustment log: {e}")
            raise

    async def handle_inventory_adjustment(
        self,
        inventory_id: int,
        lot_id: int,
        adjustment_quantity: float,
        usage_type: str,
        reference_id: int = None,
        notes: str = "",
    ) -> dict:
        """
        Logs an inventory adjustment and updates inventory quantity_on_hand.
        Lot quantities remain untouched.
        """
        try:
            async with self.db.begin():
                # Step 1: Fetch inventory item
                inventory_item = await self.inventory_repo.get_by_id(inventory_id)
                if not inventory_item:
                    raise Exception(
                        f"Inventory item not found for inventory_id={inventory_id}"
                    )

                # Step 2: Validate lot existence
                lot = await self.inventory_lot_repo.get_by_id(lot_id)
                if not lot:
                    raise Exception(f"Lot not found for lot_id={lot_id}")

                # Step 3: Determine if this is an addition or subtraction
                subtract_types = [
                    "waste",
                    "spoilage",
                    "sale",
                    "batch_production",
                    "batch_output",
                    "manual_adjustment",
                ]
                add_types = ["manual_addition"]

                current_quantity = float(inventory_item.quantity_on_hand)

                if usage_type in subtract_types:
                    if current_quantity < adjustment_quantity:
                        raise Exception(
                            "Not enough inventory to subtract the adjustment quantity."
                        )
                    new_quantity = current_quantity - float(adjustment_quantity)

                elif usage_type in add_types:
                    new_quantity = current_quantity + float(adjustment_quantity)

                else:
                    raise Exception(f"Unsupported usage_type: {usage_type}")

                # Step 4: Update inventory quantity_on_hand
                await self.inventory_repo.update(
                    restaurant_id=self.restaurant_id,
                    inventory_id=inventory_id,
                    inventory_data={"quantity_on_hand": new_quantity},
                )

                # Step 5: Log the adjustment
                usage_log_entry = {
                    "restaurant_id": self.restaurant_id,
                    "inventory_id": inventory_id,
                    "lot_id": lot_id,
                    "ingredient_id": inventory_item.ingredient_id,
                    "used_quantity": Decimal(adjustment_quantity),
                    "unit": inventory_item.unit,
                    "usage_type": usage_type,
                    "reference_type": "lot",
                    "reference_id": reference_id,
                    "notes": notes,
                }

                await self.inventory_usage_log_repo.create(usage_log_entry)

            return {
                "success": True,
                "message": f"Inventory {'added to' if usage_type in add_types else 'adjusted by'} {adjustment_quantity} {inventory_item.unit}.",
                "adjusted_quantity": adjustment_quantity,
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to log inventory adjustment: {str(e)}",
            }

    async def view_inventory(self) -> List[dict]:
        inventory_items = await self.inventory_repo.get_all()
        inventory_view = []

        for item in inventory_items:
            try:
                # For each inventory item, we'll check lots and usage logs
                ingredient = None
                batch_recipe = None
                lots = await self.inventory_lot_repo.get_recent_by_inventory_id(
                    inventory_id=item.inventory_id, max_days_old=30
                )

                # Ingredient or Batch Recipe handling
                if item.ingredient_id:
                    ingredient = await self.ingredient_repo.get_by_id(item.ingredient_id)
                    if not ingredient:
                        continue
                else:
                    batch_recipe_id = next((lot.batch_recipe_id for lot in lots if lot.batch_recipe_id), None)
                    if batch_recipe_id:
                        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
                        if not batch_recipe:
                            continue
                    else:
                        continue

                # Initialize total quantity (on hand)
                total_quantity = item.quantity_on_hand or Decimal("0.00")
                lot_breakdown = await self.get_lot_breakdown(lots)

                if ingredient:
                    inventory_view.append({
                        "inventory_id": item.inventory_id,
                        "ingredient_id": item.ingredient_id,
                        "category": ingredient.category,
                        "ingredient_name": ingredient.name,
                        "unit": item.unit,
                        "quantity_on_hand": round_decimal(total_quantity),
                        "packaging_breakdown": lot_breakdown,
                    })
                elif batch_recipe:
                    inventory_view.append({
                        "inventory_id": item.inventory_id,
                        "batch_recipe_id": batch_recipe.batch_recipe_id,
                        "ingredient_name": batch_recipe.name,
                        "category": "Batch",
                        "unit": item.unit,
                        "quantity_on_hand": round_decimal(total_quantity),
                        "packaging_breakdown": lot_breakdown,
                    })

            except Exception as e:
                print(f"[ERROR] Inventory processing failed for ID={item.inventory_id}: {e}")
                continue

        return inventory_view

    async def get_lot_breakdown(self, lots) -> List[dict]:
        lot_breakdown = []
        print(f"Lots passed in: {lots}")
        print("Statuses in lots:")
        for lot in lots:
            print(f"lot_id={lot.lot_id}, status='{lot.status}'")
        # Filter lots with 'available' status
        available_lots = [lot for lot in lots if lot.status.value == "available"]
        
        for lot in sorted(available_lots, key=lambda x: x.delivery_date, reverse=True):
            lot_qty = Decimal(lot.total_received or 0)
            used_quantity = wasted_quantity = added_quantity = Decimal("0.00")

            # Fetch usage logs for each lot
            usage_logs = await self.inventory_usage_log_repo.get_all_by_lot_id(lot.lot_id)
            for log in usage_logs:
                qty = Decimal(log.used_quantity or 0)
                if log.usage_type in {"sale", "batch_production", "batch_output"}:
                    used_quantity += qty
                elif log.usage_type in {"waste", "spoilage", "manual_adjustment"}:
                    wasted_quantity += qty
                elif log.usage_type == "manual_addition":
                    added_quantity += qty

            # Calculate remaining quantity for the lot
            remaining_quantity = lot_qty - used_quantity - wasted_quantity + added_quantity
            ingredient = None
            if lot.ingredient_id:
                ingredient = await self.ingredient_repo.get_by_id(lot.ingredient_id)
            packaging_info = await self._get_packaging_info(lot, ingredient, remaining_quantity)

            # Add lot data to the breakdown list
            lot_breakdown.append({
                "delivery_date": lot.delivery_date.isoformat(),
                "quantity": round_decimal(lot_qty),
                "used_quantity": round_decimal(used_quantity),
                "wasted_quantity": round_decimal(wasted_quantity),
                "added_quantity": round_decimal(added_quantity),
                "remaining_quantity": round_decimal(remaining_quantity),
                "lot_id": lot.lot_id,
                **packaging_info,
            })
        print(f'lot breakdown: {lot_breakdown}')
        return lot_breakdown

    async def view_inventory_details(self, inventory_id: int) -> dict:
        """Returns detailed lot and usage breakdown for a specific inventory item."""
        inventory_item = await self.inventory_repo.get_by_id(inventory_id)
        if not inventory_item:
            return {"error": "Inventory item not found"}

        lots = await self.inventory_lot_repo.get_recent_by_inventory_id(inventory_id=inventory_id, max_days_old=30)
        lot_breakdown = await self.get_lot_breakdown(lots)
        import json
        print(json.dumps({
            "inventory_id": inventory_item.inventory_id,
            "ingredient_id": inventory_item.ingredient_id,
            "unit": inventory_item.unit,
            "quantity_on_hand": round_decimal(inventory_item.quantity_on_hand),
            "packaging_breakdown": lot_breakdown,
        }, indent=2, default=str))
        
        return {
            "inventory_id": inventory_item.inventory_id,
            "ingredient_id": inventory_item.ingredient_id,
            "unit": inventory_item.unit,
            "quantity_on_hand": round_decimal(inventory_item.quantity_on_hand),
            "packaging_breakdown": lot_breakdown,
        }
    
    async def _get_packaging_info(self, lot, ingredient, remaining_quantity):
        print(f"Lot: {lot}")
        print(f"Ingredient:{ingredient}")
        print(f"Remaining: {remaining_quantity}")
        supplier_packaging = None
        if lot.ingredient_supplier_id:
            supplier_packaging = await self.ingredient_supplier_repo.get_by_id(lot.ingredient_supplier_id)

        if supplier_packaging:
            pack_size = supplier_packaging.pack_size or 1
            quantity_per_pack = supplier_packaging.quantity_per_pack_item or Decimal("1.00")
            total_units_per_pack = Decimal(pack_size) * quantity_per_pack

            if ingredient and ingredient.unit == "count" and supplier_packaging.unit != "count":
                avg_weight_per_unit = ingredient.average_weight_per_unit or 1
                grams_per_unit = avg_weight_per_unit * remaining_quantity
                converted_remaining = grams_per_unit / 1000 if supplier_packaging.unit == "kg" else grams_per_unit
            else:
                try:
                    converted_remaining = convert_unit(
                        quantity=remaining_quantity,
                        from_unit=lot.unit,
                        to_unit=supplier_packaging.unit,
                    )
                except ValueError:
                    converted_remaining = remaining_quantity

            approx_packages_remaining = (
                converted_remaining / total_units_per_pack if total_units_per_pack > 0 else None
            )
            packages_received_total = (lot.total_received or 1) * pack_size

            return {
                "ingredient_supplier_id": supplier_packaging.ingredient_supplier_id,
                "supplier_unit": supplier_packaging.unit,
                "pack_size": pack_size,
                "quantity_per_pack_item": float(quantity_per_pack),
                "packages_received_total": int(packages_received_total),
                "approx_packages_remaining": round_decimal(approx_packages_remaining) if approx_packages_remaining is not None else None,
            }

        return {
            "ingredient_supplier_id": lot.ingredient_supplier_id,
            "supplier_unit": lot.unit,
            "pack_size": None,
            "quantity_per_pack_item": None,
            "packages_received_total": None,
            "approx_packages_remaining": None,
        }

    async def view_ingredient_suppliers(self) -> List[dict]:
        """
        View all ingredients and their supplier packaging/options using repos.
        Returns a list of ingredients, each with all its supplier options and details.
        """

        ingredients = await self.ingredient_repo.get_all()
        ingredient_supplier_view = []

        for ingredient in ingredients:
            ingredient_suppliers = (
                await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                    ingredient.ingredient_id
                )
            )

            supplier_data = []
            for ing_sup in ingredient_suppliers:
                supplier = await self.supplier_repo.get_by_id(ing_sup.supplier_id)
                if not supplier:
                    continue

                supplier_data.append(
                    {
                        "supplier_id": supplier.supplier_id,
                        "supplier_name": supplier.name,
                        "unit": ing_sup.unit,
                        "pack_size": ing_sup.pack_size,
                        "quantity_per_pack_item": float(
                            ing_sup.quantity_per_pack_item or 1.0
                        ),
                        "cost_per_unit": float(ing_sup.cost_per_unit or 0),
                        "lead_time_days": ing_sup.lead_time_days,
                        "shelf_life_days": ing_sup.shelf_life_days,
                        "spoilage_rate": float(ing_sup.spoilage_rate or 0),
                        "preferred": bool(ing_sup.preferred),
                        "min_order_quantity": ing_sup.min_order_quantity,
                        "supplier_priority": ing_sup.supplier_priority,
                        "ingredient_supplier_id": ing_sup.ingredient_supplier_id,
                    }
                )

            ingredient_supplier_view.append(
                {
                    "ingredient_id": ingredient.ingredient_id,
                    "ingredient_name": ingredient.name,
                    "unit": ingredient.unit,
                    "suppliers": supplier_data,
                }
            )

        return ingredient_supplier_view

    async def add_inventory_from_lots(
        self,
        ingredient_supplier_id: int,
        total_received: Union[float, int],
        delivery_date: date,
    ):
        """
        Add a new inventory lot and update inventory accordingly.
        """
        async with self.db.begin():
            # 1. Get IngredientSupplier data
            ingredient_supplier = await self.ingredient_supplier_repo.get_by_id(
                ingredient_supplier_id,
            )
            if not ingredient_supplier:
                raise ValueError(
                    f"❌ IngredientSupplier ID {ingredient_supplier_id} not found."
                )

            ingredient_id = ingredient_supplier.ingredient_id
            supplier_unit = ingredient_supplier.unit
            pack_size = ingredient_supplier.pack_size or 1
            quantity_per_pack_item = (
                ingredient_supplier.quantity_per_pack_item or Decimal("1.00")
            )
            shelf_life_days = ingredient_supplier.shelf_life_days or 0
            spoilage_expected_date = delivery_date + timedelta(days=shelf_life_days)

            # 2. Get inventory record
            inventory = await self.inventory_repo.get_inventory_by_ingredient(
                ingredient_id
            )

            # 3. Always get the ingredient (needed for average_weight_per_unit)
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            if not ingredient:
                raise ValueError(f"❌ Ingredient ID {ingredient_id} not found.")

            inventory_unit = inventory.unit if inventory else ingredient.unit
            average_weight_per_unit = ingredient.average_weight_per_unit  # in grams

            # 4. If no inventory, create it
            if not inventory:
                inventory_data = {
                    "restaurant_id": self.restaurant_id,
                    "ingredient_id": ingredient_id,
                    "unit": inventory_unit,
                    "quantity_on_hand": Decimal("0.00"),
                    "min_stock_level": Decimal("0.00"),
                    "last_delivery_date": delivery_date,
                    "spoilage_expected_date": spoilage_expected_date,
                }
                inventory = await self.inventory_repo.create(inventory_data)

            # 5. Calculate total quantity in supplier unit
            raw_total_quantity = (
                Decimal(total_received) * Decimal(pack_size) * quantity_per_pack_item
            )

            # 6. Custom logic: inventory in count, supplier in weight
            if inventory_unit == "count" and supplier_unit != "count":
                quantity_in_grams = convert_unit(raw_total_quantity, supplier_unit, "g")

                if not average_weight_per_unit:
                    raise ValueError(
                        "❌ average_weight_per_unit is required to convert to count."
                    )

                converted_total_quantity = quantity_in_grams / average_weight_per_unit

            # 7. Generic conversion if units differ (not the special case above)
            elif supplier_unit != inventory_unit:
                converted_total_quantity = convert_unit(
                    raw_total_quantity, supplier_unit, inventory_unit
                )

            # 8. Units match — use raw total
            else:
                converted_total_quantity = raw_total_quantity

            # 9. Create Inventory Lot
            lot_payload = {
                "inventory_id": inventory.inventory_id,
                "ingredient_id": ingredient_id,
                "restaurant_id": self.restaurant_id,
                "delivery_date": delivery_date,
                "spoilage_expected_date": spoilage_expected_date,
                "quantity": Decimal(converted_total_quantity),
                "unit": inventory_unit,
                "total_received": Decimal(total_received),
                "ingredient_supplier_id": ingredient_supplier_id,
            }
            print(f"this is the lot payload: {lot_payload}")

            await self.inventory_lot_repo.create(lot_payload)

            # 10. Update inventory
            updated_quantity = (
                Decimal(inventory.quantity_on_hand) or Decimal("0.00")
            ) + Decimal(converted_total_quantity)

            update_data = {
                "quantity_on_hand": updated_quantity,
                "last_delivery_date": delivery_date,
                "spoilage_expected_date": spoilage_expected_date,
            }

            await self.inventory_repo.update(inventory.inventory_id, update_data)

        print(
            f"✅ Added inventory lot + updated inventory for ingredient_id={ingredient_id}: +{converted_total_quantity} {inventory_unit}"
        )
