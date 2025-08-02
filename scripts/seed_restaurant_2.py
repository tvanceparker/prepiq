import random
from datetime import datetime, timedelta

restaurant_id = 2
menu_items = [200, 201, 202, 203, 204]
days_to_generate = 60
start_date = datetime.today() - timedelta(days=days_to_generate)

# Base avg sales per day per item
# Two best sellers (200, 201) sell more than others
base_sales = {
    200: 15,
    201: 15,
    202: 8,
    203: 8,
    204: 8,
}

# Day of week multipliers (0=Mon, 6=Sun)
day_multipliers = {
    0: 0.7,  # Monday - low
    1: 1.0,  # Tuesday - medium
    2: 1.2,  # Wednesday - high
    3: 1.0,  # Thursday - medium
    4: 1.3,  # Friday - high
    5: 1.4,  # Saturday - highest
    6: 0.6,  # Sunday - lowest
}

filename = "seed_restaurant_2.sql"

with open(filename, "w") as f:
    f.write(f"-- Delete existing data for restaurant_id={restaurant_id}\n")
    f.write(f"DELETE FROM forecast_breakdown WHERE restaurant_id = {restaurant_id};\n")
    f.write(f"DELETE FROM daily_forecast_accuracy WHERE restaurant_id = {restaurant_id};\n")
    f.write(f"DELETE FROM forecast_accuracy WHERE restaurant_id = {restaurant_id};\n")
    f.write(f"DELETE FROM forecasts WHERE restaurant_id = {restaurant_id};\n")
    f.write(f"DELETE FROM sales WHERE restaurant_id = {restaurant_id};\n")
    f.write(f"DELETE FROM menu_items WHERE restaurant_id = {restaurant_id};\n\n")

    # Insert menu items with fixed IDs
    f.write("-- Insert 5 menu items\n")
    f.write(
        "INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES\n"
    )
    item_values = []
    names = ["Burger", "Fries", "Soda", "Salad", "Ice Cream"]
    prices = [6.99, 2.99, 1.50, 5.50, 3.99]
    categories = ["Food", "Food", "Drink", "Food", "Dessert"]

    for i, menu_id in enumerate(menu_items):
        name = names[i]
        price = prices[i]
        category = categories[i]
        item_values.append(
            f"({menu_id}, {restaurant_id}, '{name}', {price}, '{category}', 1)"
        )
    f.write(",\n".join(item_values) + ";\n\n")

    f.write("-- Insert 60 days of sales data\n")

    f.write("INSERT INTO sales (restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel) VALUES\n")

    sales_inserts = []
    for day_offset in range(days_to_generate):
        day_date = start_date + timedelta(days=day_offset)
        day_of_week = day_date.weekday()
        date_str = day_date.strftime("%Y-%m-%d")
        multiplier = day_multipliers.get(day_of_week, 1.0)

        for menu_id in menu_items:
            base = base_sales[menu_id]
            # Apply multiplier and some noise (+/- up to 15%)
            noisy_sales = base * multiplier * random.uniform(0.85, 1.15)
            qty_sold = max(1, int(round(noisy_sales)))  # at least 1 sale
            timestamp = f"{date_str} 12:00:00"
            sales_inserts.append(
                f"({restaurant_id}, '{timestamp}', {menu_id}, {qty_sold}, 'in_store')"
            )

        # Batch inserts 50 per statement to keep size reasonable
        if len(sales_inserts) >= 50:
            f.write(",\n".join(sales_inserts) + ";\n")
            sales_inserts = []

    # Insert any remaining
    if sales_inserts:
        f.write(",\n".join(sales_inserts) + ";\n")

print(f"SQL seed script generated: {filename}")
