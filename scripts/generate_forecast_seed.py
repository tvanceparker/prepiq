import random
from datetime import datetime, timedelta

# Configuration
restaurant_id = 2
forecast_version = 1
start_date = datetime.now().date() - timedelta(days=90)
menu_items = [
    ("Cheeseburger", 9.99, "Entree"),
    ("Veggie Burger", 8.99, "Entree"),
    ("Fries", 3.49, "Side"),
    ("Soda", 1.99, "Beverage"),
    ("Chicken Nuggets", 5.99, "Entree"),
    ("Salad", 6.49, "Side"),
    ("Iced Tea", 2.49, "Beverage"),
    ("Milkshake", 3.99, "Dessert"),
    ("Onion Rings", 3.99, "Side"),
    ("Grilled Cheese", 5.49, "Entree"),
]
sales_channels = ['in-house', 'take-out', 'doordash']

sql = []

# --- Truncate/clean data
sql.append(f"""-- Clean up restaurant_id = {restaurant_id}
DELETE FROM daily_forecast_accuracy WHERE restaurant_id = {restaurant_id};
DELETE FROM forecast_accuracy WHERE restaurant_id = {restaurant_id};
DELETE FROM forecast_breakdown WHERE restaurant_id = {restaurant_id};
DELETE FROM forecasts WHERE restaurant_id = {restaurant_id};
DELETE FROM sales WHERE restaurant_id = {restaurant_id};
DELETE FROM menu_items WHERE restaurant_id = {restaurant_id};\n""")

# --- Insert menu_items
sql.append("-- Insert menu items")
menu_item_ids = []
for idx, (name, price, category) in enumerate(menu_items):
    menu_item_id = 201 + idx
    menu_item_ids.append(menu_item_id)
    sql.append(f"INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) "
               f"VALUES ({menu_item_id}, {restaurant_id}, '{name}', {price}, '{category}', 1);")

# --- Insert sales & forecast data
sql.append("\n-- Insert sales and forecast data")
forecast_id = 300
breakdown_id = 400
accuracy_id = 500

for i, menu_item_id in enumerate(menu_item_ids):
    forecast_id += 1
    total_predicted = 0
    total_actual = 0

    sql.append(f"\n-- Forecast for menu_item_id = {menu_item_id}")
    sql.append(f"INSERT INTO forecasts (forecast_id, restaurant_id, menu_item_id, forecast_period_start, forecast_period_end, confidence_score, adjusted_quantity, used_in_order_generation, forecast_version) "
               f"VALUES ({forecast_id}, {restaurant_id}, {menu_item_id}, '{start_date}', '{start_date + timedelta(days=6)}', {round(random.uniform(0.85, 0.95), 2)}, 0, 1, {forecast_version});")

    for day_offset in range(90):
        forecast_date = start_date + timedelta(days=day_offset)
        predicted_quantity = random.randint(18, 30)
        actual_quantity = predicted_quantity + random.randint(-3, 3)
        forecast_error = predicted_quantity - actual_quantity
        error_pct = round(abs(forecast_error) / actual_quantity * 100, 2) if actual_quantity else 0

        sales_channel = random.choice(sales_channels)
        sale_time = datetime.combine(forecast_date, datetime.min.time()) + timedelta(hours=random.randint(10, 20))

        # Insert sales
        sql.append(f"INSERT INTO sales (restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel) "
                   f"VALUES ({restaurant_id}, '{sale_time}', {menu_item_id}, {actual_quantity}, '{sales_channel}');")

        # Forecast breakdown
        breakdown_id += 1
        sql.append(f"INSERT INTO forecast_breakdown (breakdown_id, forecast_id, menu_item_id, forecast_date, forecasted_quantity, restaurant_id) "
                   f"VALUES ({breakdown_id}, {forecast_id}, {menu_item_id}, '{forecast_date}', {predicted_quantity}, {restaurant_id});")

        # Daily accuracy
        sql.append(f"INSERT INTO daily_forecast_accuracy (accuracy_id, breakdown_id, restaurant_id, menu_item_id, forecast_date, predicted_quantity, actual_quantity, forecast_error, error_percentage) "
                   f"VALUES ({accuracy_id}, {breakdown_id}, {restaurant_id}, {menu_item_id}, '{forecast_date}', {predicted_quantity}, {actual_quantity}, {forecast_error}, {error_pct});")

        accuracy_id += 1
        total_predicted += predicted_quantity
        total_actual += actual_quantity

    # Insert forecast accuracy
    total_error = round(total_predicted - total_actual, 2)
    error_pct_total = round(abs(total_error) / total_actual * 100, 2) if total_actual else 0
    sql.append(f"INSERT INTO forecast_accuracy (accuracy_id, restaurant_id, menu_item_id, forecast_id, forecast_version, forecast_period_start, forecast_period_end, predicted_quantity, actual_quantity, forecast_error, error_percentage) "
               f"VALUES ({accuracy_id}, {restaurant_id}, {menu_item_id}, {forecast_id}, {forecast_version}, '{start_date}', '{start_date + timedelta(days=6)}', {total_predicted}, {total_actual}, {total_error}, {error_pct_total});")
    accuracy_id += 1

# --- Write to file
with open("seed_forecast_data.sql", "w") as f:
    f.write("\n".join(sql))

print("SQL seed script written to 'seed_forecast_data.sql'")
