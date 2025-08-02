from decimal import Decimal
from typing import Union
from decimal import Decimal, ROUND_HALF_UP

Unit = str

# Canonical mapping to normalize units
UNIT_ALIASES = {
    # Volume
    "liters": "liter",
    "l": "liter",
    "milliliter": "ml",
    "milliliters": "ml",
    "gallons": "gallon",
    "gal": "gallon",
    # Weight/Mass
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "g": "g",
    "gram": "g",
    "grams": "g",
    "lb": "lb",
    "lbs": "lb",
    "pound": "lb",
    "pounds": "lb",
    "oz": "oz",
    "ounce": "oz",
    "ounces": "oz",
    # Count
    "count": "count",
    "cup": "cup",
    "cups": "cup",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
}

# Conversion factors (normalized keys only)
UNIT_CONVERSIONS = {
    # Volume
    ("liter", "ml"): Decimal("1000"),
    ("ml", "liter"): Decimal("0.001"),
    ("gallon", "liter"): Decimal("3.78541"),
    ("liter", "gallon"): Decimal("1") / Decimal("3.78541"),
    # Weight
    ("lb", "g"): Decimal("453.592"),
    ("g", "lb"): Decimal("1") / Decimal("453.592"),
    ("lb", "kg"): Decimal("0.453592"),
    ("kg", "lb"): Decimal("1") / Decimal("0.453592"),
    ("oz", "g"): Decimal("28.3495"),
    ("g", "oz"): Decimal("1") / Decimal("28.3495"),
    ("oz", "kg"): Decimal("0.0283495"),
    ("kg", "oz"): Decimal("1") / Decimal("0.0283495"),
    ("lb", "oz"): Decimal("16"),
    ("oz", "lb"): Decimal("1") / Decimal("16"),
    ("kg", "g"): Decimal("1000"),
    ("g", "kg"): Decimal("0.001"),
    # Count
    ("count", "count"): Decimal("1.0"),
    # Cups
    ("cup", "ml"): Decimal("240"),
    ("ml", "cup"): Decimal("1") / Decimal("240"),
    ("cup", "liter"): Decimal("0.24"),
    ("liter", "cup"): Decimal("1") / Decimal("0.24"),
    # For completeness, add tbsp/tsp if needed
    ("tbsp", "ml"): Decimal("15"),
    ("tsp", "ml"): Decimal("5"),
}


def normalize_unit(unit: str) -> str:
    unit = unit.strip().lower()
    return UNIT_ALIASES.get(unit, unit)


def convert_unit(
    quantity: Union[float, Decimal], from_unit: Unit, to_unit: Unit
) -> Decimal:
    """
    Converts quantity from one unit to another using predefined conversion rates.
    Raises ValueError if conversion is unsupported.
    """
    print(f"convert_unit() called with quantity={quantity}, from_unit={from_unit}, to_unit={to_unit}")
    quantity = Decimal(str(quantity))
    from_unit = normalize_unit(from_unit)
    to_unit = normalize_unit(to_unit)

    if from_unit == to_unit:
        return quantity

    key = (from_unit, to_unit)
    if key in UNIT_CONVERSIONS:
        return quantity * UNIT_CONVERSIONS[key]

    # print(f"Unsupported unit conversion attempt: {from_unit} → {to_unit} (quantity: {quantity})")
    raise ValueError(f"Unsupported unit conversion: {from_unit} → {to_unit}")


def round_decimal(value, places: int = 2) -> float:
    return round(float(value), places)
