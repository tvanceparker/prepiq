# app/services/forecasting_engine.py


from sqlalchemy.ext.asyncio import AsyncSession
from app.services.utils.unit_conversion import convert_unit, normalize_unit
from datetime import date, timedelta, datetime
from collections import defaultdict
from sklearn.linear_model import LinearRegression
from decimal import Decimal
from math import ceil
import pandas as pd
import numpy as np
import joblib
from app.repositories.sales_repo import SalesRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.repositories.forecast_breakdown_repo import ForecastBreakdownRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.services.utils.unit_conversion import convert_unit, normalize_unit


class ForecastingEngine:
    """
    A forecasting engine for predicting menu item demand, breaking it down into batch recipes
    and ingredients, and preparing data for purchasing decisions and inventory planning.
    """

    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier:str = None, model=None):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.forecast_repo = ForecastRepository(db, restaurant_id)
        self.forecast_breakdown_repo = ForecastBreakdownRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.models = None

    async def initialize(self):
        raw_data = await self.load_data()
        training_data = self.preprocess_data(raw_data)
        self.models = self.train_model(training_data)

    async def load_data(self, days_back: int = 90):
        """
        Load required data from the database:
        - Historical sales
        - Menu items
        - Recipes
        - Batch recipes
        - Inventory metadata (shelf life, etc.)
        """
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days_back)

        sales = await self.sales_repo.get_sales_between_dates(start_date, end_date)

        # Optionally load more data like menu items, recipes here if needed
        # For now, just return sales
        # print(f'this is the sales: {sales}')
        return sales

    def preprocess_data(self, raw_sales):
        """
        Transform raw sales records into features for model training.

        Inputs:
          - raw_sales: list of Sales ORM objects or dicts with attributes:
              menu_item_id, sale_timestamp, quantity_sold

        Output:
          - DataFrame with columns: menu_item_id, date, quantity_sold, day_of_week, is_weekend
        """

        # Convert list of sales objects to a DataFrame
        data = [
            {
                "menu_item_id": sale.menu_item_id,
                "date": sale.sale_timestamp.date(),
                "quantity_sold": sale.quantity_sold,
            }
            for sale in raw_sales
        ]

        df = pd.DataFrame(data)

        # Aggregate quantity sold per menu item per day
        daily_sales = df.groupby(["menu_item_id", "date"], as_index=False).sum()

        # Add time features
        daily_sales["day_of_week"] = daily_sales["date"].apply(
            lambda d: d.weekday()
        )  # Monday=0
        daily_sales["is_weekend"] = daily_sales["day_of_week"].apply(
            lambda d: 1 if d >= 5 else 0
        )

        return daily_sales

    def train_model(self, training_data):
        """
        Train a Linear Regression model for each menu item to predict daily demand.

        Input:
          - training_data: DataFrame with columns
              ['menu_item_id', 'date', 'quantity_sold', 'day_of_week', 'is_weekend']

        Returns:
          - dict of models: {menu_item_id: sklearn.LinearRegression()}
        """

        models = {}
        confidence_scores = {}
        # Features we use to predict demand
        feature_cols = ["day_of_week", "is_weekend"]

        for menu_item_id, group in training_data.groupby("menu_item_id"):
            X = group[feature_cols]
            y = group["quantity_sold"]

            model = LinearRegression()
            model.fit(X, y)

            r2 = model.score(X, y)

            models[menu_item_id] = model
            confidence_scores[menu_item_id] = round(r2, 2)  # Round to 2 decimals

        self.confidence_scores = confidence_scores

        return models

    def predict_menu_item_demand(self, horizon_days: int):
        """
        Predict menu item demand for the next `horizon_days` days.

        Returns a list of dicts:
        [
            {
                'menu_item_id': int,
                'forecast_date': date,
                'predicted_quantity': float
            },
            ...
        ]
        """
        if not hasattr(self, "models") or not self.models:
            raise ValueError("Models not trained or loaded. Run train_model() first.")

        forecasts = []
        today = datetime.now().date()

        for menu_item_id, model in self.models.items():
            for day_offset in range(horizon_days):
                forecast_date = today + timedelta(days=day_offset)
                day_of_week = forecast_date.weekday()  # Monday=0
                is_weekend = 1 if day_of_week >= 5 else 0

                features = pd.DataFrame(
                    [[day_of_week, is_weekend]], columns=["day_of_week", "is_weekend"]
                )

                predicted_qty = model.predict(features)[0]
                predicted_qty = max(
                    0, ceil(float(predicted_qty))
                )  # Avoid negative predictions

                forecasts.append(
                    {
                        "menu_item_id": menu_item_id,
                        "forecast_date": forecast_date,
                        "predicted_quantity": predicted_qty,
                    }
                )
        # print(f'forecasts: {forecasts}')
        return forecasts

    async def write_menu_item_forecasts(self, forecast_data):
        """
        Create new forecast records and breakdowns for each menu item and date,
        automatically determining forecast period start and end dates.

        Args:
          - forecast_data: list of dicts [{'menu_item_id', 'forecast_date', 'predicted_quantity'}, ...]
        """

        if not forecast_data:
            return  # Nothing to write

        # Determine forecast period from forecast_data dates
        forecast_dates = [entry["forecast_date"] for entry in forecast_data]
        forecast_period_start = min(forecast_dates)
        forecast_period_end = max(forecast_dates)

        # Group daily forecasts by menu item
        grouped = defaultdict(list)
        for entry in forecast_data:
            grouped[entry["menu_item_id"]].append(entry)

        for menu_item_id, daily_forecasts in grouped.items():
            total_quantity = sum(d["predicted_quantity"] for d in daily_forecasts)

            # Get confidence score for this menu item, default to None or 0 if missing
            confidence_score = self.confidence_scores.get(menu_item_id, None)

            # For forecasts table
            forecast_data = {
                "restaurant_id": self.restaurant_id,
                "menu_item_id": menu_item_id,
                "forecast_period_start": forecast_period_start,
                "forecast_period_end": forecast_period_end,
                "confidence_score": confidence_score,
                "adjusted_quantity": round(total_quantity, 2),
                "used_in_order_generation": False,
                "forecast_version": 1,
                # created_at omitted if DB defaults to CURRENT_TIMESTAMP
            }
            # print(f'this is the forecast data: {forecast_data}')

            forecast_record = await self.forecast_repo.create(forecast_data)
            forecast_id = forecast_record.forecast_id

            # For forecast_breakdown table (cast quantity to int if needed)
            for daily in daily_forecasts:
                breakdown_data = {
                    "forecast_id": forecast_id,
                    "menu_item_id": menu_item_id,
                    "forecast_date": daily["forecast_date"],
                    "forecasted_quantity": int(round(daily["predicted_quantity"])),
                    "restaurant_id": self.restaurant_id,
                    # created_at omitted if DB defaults
                }
                await self.forecast_breakdown_repo.create(breakdown_data)
                # print(f'breakdown: {breakdown_data}')

    async def generate_batch_recipe_breakdown(self, forecast_breakdown):
        """
        Based on the daily menu item forecasts, determine how much of each
        batch recipe is needed per day.
        Returns:
            - List of dicts: [{
                'batch_recipe_id': int,
                'forecast_date': date,
                'required_quantity': Decimal
            }]
            Remember to use what this generates to generate the next day/days of prep schedule too
        """
        batch_breakdown = defaultdict(
            lambda: defaultdict(Decimal)
        )  # {date: {batch_recipe_id: qty}}

        # print(f"Starting batch recipe breakdown for {sum(len(v['daily_breakdown']) for v in forecast_breakdown.values())} forecast entries")

        for menu_item_id, data in forecast_breakdown.items():
            daily_breakdown = data.get("daily_breakdown", [])
            for forecast_date, predicted_quantity in daily_breakdown:
                predicted_quantity = Decimal(predicted_quantity)
                # print(f"Menu item {menu_item_id} for {forecast_date} with qty {predicted_quantity}")

                menu_item_recipes = await self.menu_item_recipe_repo.get_by_menu_item(
                    menu_item_id
                )
                # print(f"  Found {len(menu_item_recipes)} recipes for menu item {menu_item_id}")

                for mir in menu_item_recipes:
                    recipe_id = mir.recipe_id
                    recipe_ingredients = (
                        await self.recipe_ingredient_repo.get_by_recipe_id(recipe_id)
                    )
                    for ri in recipe_ingredients:
                        if ri.ingredient_type == "batch":
                            batch_recipe_id = ri.reference_id
                            quantity_used = Decimal(ri.quantity_used)
                            total_qty = quantity_used * predicted_quantity
                            batch_breakdown[forecast_date][batch_recipe_id] += total_qty
                            # print(f"    Batch recipe {batch_recipe_id} used qty {quantity_used} x predicted {predicted_quantity} = {total_qty}")

        # Flatten results
        result = []
        for forecast_date, batches in batch_breakdown.items():
            for batch_recipe_id, qty in batches.items():
                result.append(
                    {
                        "batch_recipe_id": batch_recipe_id,
                        "forecast_date": forecast_date,
                        "required_quantity": round(qty, 2),
                        # Optionally, add 'unit' here if you want to keep track
                    }
                )
        # print(f"Batch recipe breakdown result count: {len(result)}")
        return result

    async def generate_ingredient_breakdown(
        self, forecast_breakdown, batch_recipe_breakdown
    ):
        """
        Break forecasted menu items and batch recipes down into final ingredient quantities.
        Returns:
            - List of dicts with:
                'ingredient_id', 'forecast_date', 'quantity', 'source_type', 'source_id', 'unit'
        """
        ingredient_map = defaultdict(
            lambda: defaultdict(Decimal)
        )  # {date: {ingredient_key: qty}}
        ingredient_ids_used = set()

        # 1. Process menu item -> recipe -> ingredient
        for entry in forecast_breakdown:
            menu_item_id = entry["menu_item_id"]
            forecast_date = entry["forecast_date"]
            predicted_quantity = Decimal(entry["predicted_quantity"])

            recipe_ids = await self.menu_item_recipe_repo.get_recipe_ids_for_menu_item(
                menu_item_id
            )
            # print(f"\nMenu item {menu_item_id} for date {forecast_date} predicted qty {predicted_quantity}")
            # print(f"  Associated recipe IDs: {recipe_ids}")

            for recipe_id in recipe_ids:
                recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(
                    recipe_id
                )
                # print(f"  Recipe {recipe_id} has {len(recipe_ingredients)} ingredients")

                for ri in recipe_ingredients:
                    if ri.ingredient_type == "ingredient":
                        ingredient_id = ri.reference_id
                        total_qty = Decimal(ri.quantity_used) * predicted_quantity
                        ingredient_ids_used.add(ingredient_id)
                        ingredient_map[forecast_date][
                            (ingredient_id, "menu_item", menu_item_id)
                        ] += total_qty
                        # print(f"    Ingredient {ingredient_id} qty {total_qty} added from menu item {menu_item_id}")

        # 2. Process batch recipe -> ingredient
        for batch in batch_recipe_breakdown:
            batch_recipe_id = batch["batch_recipe_id"]
            forecast_date = batch["forecast_date"]
            required_qty = Decimal(batch["required_quantity"])

            # print(f"\nProcessing batch recipe {batch_recipe_id} for date {forecast_date} required qty {required_qty}")

            batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
            yield_qty = Decimal(batch_recipe.yield_quantity or 1)

            batch_ingredients = (
                await self.batch_recipe_ingredient_repo.get_by_batch_recipe_id(
                    batch_recipe_id
                )
            )
            # print(f"  Batch recipe has {len(batch_ingredients)} ingredients")

            for bi in batch_ingredients:
                ingredient_id = bi.ingredient_id
                unit_qty = Decimal(bi.quantity_used or 0)
                ingredient_unit = normalize_unit(bi.unit or "count")
                batch_yield_unit = normalize_unit(batch_recipe.yield_unit or "count")

                try:
                    qty_in_yield_unit = convert_unit(
                        unit_qty, ingredient_unit, batch_yield_unit
                    )
                except ValueError:
                    # print(f"  Warning: Unsupported conversion from {ingredient_unit} to {batch_yield_unit}")
                    qty_in_yield_unit = unit_qty  # fallback

                total_qty = (qty_in_yield_unit / yield_qty) * required_qty
                ingredient_ids_used.add(ingredient_id)
                ingredient_map[forecast_date][
                    (ingredient_id, "batch_recipe", batch_recipe_id)
                ] += total_qty
                # print(f"    Ingredient {ingredient_id} qty {total_qty} added from batch recipe {batch_recipe_id}")

        # Fetch units for all used ingredients
        ingredient_units = {}
        for ingredient_id in ingredient_ids_used:
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            ingredient_units[ingredient_id] = ingredient.unit or "count"

        # Flatten results
        result = []
        for forecast_date, ingredients in ingredient_map.items():
            for (ingredient_id, source_type, source_id), qty in ingredients.items():
                result.append(
                    {
                        "ingredient_id": ingredient_id,
                        "forecast_date": forecast_date,
                        "quantity": round(qty, 2),
                        "source_type": source_type,
                        "source_id": source_id,
                        "unit": ingredient_units.get(ingredient_id, "count"),
                    }
                )

        # print(f"\nIngredient breakdown complete with {len(result)} entries")
        return result

    async def aggregate_ingredient_demand_for_reorder(
        self, forecast_breakdown, days: int
    ):
        """
        Aggregate ingredient demand over N days and attach unit info for reorder planning.

        Args:
            forecast_breakdown (List[dict]): Output from `generate_ingredient_breakdown`.
            days (int): How many days to aggregate into the future.

        Returns:
            Dict[int, dict]: {
                ingredient_id: {
                    'total_quantity': Decimal,
                    'unit': str,
                    'daily_breakdown': List[Tuple[date, Decimal]]
                }
            }
        """
        from collections import defaultdict
        from datetime import date

        today = date.today()
        cutoff_date = today + timedelta(days=days)

        # Initialize result dict
        aggregated = defaultdict(
            lambda: {"total_quantity": Decimal(0), "unit": None, "daily_breakdown": []}
        )

        for entry in forecast_breakdown:
            forecast_date = entry["forecast_date"]
            if forecast_date > cutoff_date:
                continue

            ingredient_id = entry["ingredient_id"]
            qty = Decimal(entry["quantity"])

            aggregated[ingredient_id]["total_quantity"] += qty
            aggregated[ingredient_id]["daily_breakdown"].append((forecast_date, qty))

        # Fetch and attach units
        for ingredient_id in aggregated:
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            aggregated[ingredient_id]["unit"] = ingredient.unit or "count"

        return aggregated

    def log_forecast_metadata(self, forecast_version, used_in_order_generation):
        """
        Store metadata about forecast run (versioning, usage tracking).
        """
        pass

    async def run_forecasting_pipeline(self, horizon_days=30, reorder_horizon_days=30):
        raw_data = await self.load_data()
        # print(f"\nLoaded raw data with {len(raw_data)} records")

        processed = self.preprocess_data(raw_data)
        # print(f"Processed data size: {len(processed)}")

        self.models = self.train_model(processed)
        # print(f"Trained {len(self.models)} models: {list(self.models.keys())}")

        forecast_list = self.predict_menu_item_demand(horizon_days)
        # print(f"Raw forecast list length: {len(forecast_list)}")

        # Quick peek at first 3 entries to verify structure
        # print("Sample forecast entries:", forecast_list[:3])

        menu_item_forecast = {}
        for entry in forecast_list:
            menu_id = entry["menu_item_id"]
            date = entry["forecast_date"]
            qty = entry["predicted_quantity"]

            if menu_id not in menu_item_forecast:
                menu_item_forecast[menu_id] = {"daily_breakdown": []}
            menu_item_forecast[menu_id]["daily_breakdown"].append((date, qty))

        # print(f"Predicted demand for menu items (keys): {list(menu_item_forecast.keys())}")

        # Print daily breakdown length for each menu item
        # for menu_id, data in menu_item_forecast.items():
        # print(f"Menu item {menu_id} forecast days: {len(data['daily_breakdown'])}")

        # await self.write_menu_item_forecasts(menu_item_forecast)

        batch_data = await self.generate_batch_recipe_breakdown(menu_item_forecast)
        # print(f"Batch data keys (recipes or batches): {list(batch_data.keys())}")

        flat_forecast_list = convert_forecast_dict_to_list(menu_item_forecast)

        ingredient_data = await self.generate_ingredient_breakdown(
            flat_forecast_list, batch_data
        )
        # print(f"Ingredient data keys (ingredients): {list(ingredient_data.keys())}")

        aggregated = await self.aggregate_ingredient_demand_for_reorder(
            ingredient_data, reorder_horizon_days
        )
        # print(f"Aggregated ingredient demand keys (ingredients): {list(aggregated.keys())}")

        return aggregated

    async def derive_ingredient_usage_from_sales(
        self, days: int = 30
    ) -> dict[int, dict[date, Decimal]]:
        """
        Returns a dict of daily ingredient usage quantities by ingredient ID.

        Used as a fallback when inventory logs are sparse or unavailable.

        Args:
            days (int): How far back in time to derive usage.

        Returns:
            Dict[int, Dict[date, Decimal]]:
                {
                    ingredient_id: {
                        date: quantity_used,
                        ...
                    },
                    ...
                }
        """
        # 1. Load historical sales
        sales = await self.load_data(days_back=days)

        # 2. Build fake forecast_breakdown from real historical sales
        fake_forecast = defaultdict(
            lambda: defaultdict(int)
        )  # menu_item_id -> {date: qty}
        for sale in sales:
            fake_forecast[sale.menu_item_id][sale.sale_timestamp] += sale.quantity_sold

        # Format for ingredient breakdown
        forecast_breakdown = []
        for menu_item_id, date_map in fake_forecast.items():
            for forecast_date, predicted_quantity in date_map.items():
                forecast_breakdown.append(
                    {
                        "menu_item_id": menu_item_id,
                        "forecast_date": forecast_date,
                        "predicted_quantity": predicted_quantity,
                    }
                )

        # 3. Generate batch recipe usage
        batch_breakdown = await self.generate_batch_recipe_breakdown(
            {
                mid: {"daily_breakdown": list(date_qty.items())}
                for mid, date_qty in fake_forecast.items()
            }
        )

        # 4. Generate ingredient usage breakdown
        ingredient_usage = await self.generate_ingredient_breakdown(
            forecast_breakdown, batch_breakdown
        )

        # 5. Restructure output: {ingredient_id: {date: qty}}
        usage_by_ingredient = defaultdict(lambda: defaultdict(Decimal))
        for entry in ingredient_usage:
            ingredient_id = entry["ingredient_id"]
            forecast_date = entry["forecast_date"]
            quantity = Decimal(entry["quantity"])
            usage_by_ingredient[ingredient_id][forecast_date] += quantity

        return usage_by_ingredient


def convert_forecast_dict_to_list(forecast_dict):
    flat = []
    for menu_item_id, data in forecast_dict.items():
        for forecast_date, qty in data.get("daily_breakdown", []):
            flat.append(
                {
                    "menu_item_id": menu_item_id,
                    "forecast_date": forecast_date,
                    "predicted_quantity": qty,
                }
            )
    return flat
