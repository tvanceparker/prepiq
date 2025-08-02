import pytest
from decimal import Decimal
from app.services.utils.unit_conversion import (
    convert_unit,
    normalize_unit,
    round_decimal,
)


@pytest.mark.parametrize(
    "quantity, from_unit, to_unit, expected",
    [
        (1, "liter", "ml", Decimal("1000")),
        (500, "ml", "liter", Decimal("0.5")),
        (1, "gallon", "liter", Decimal("3.78541")),
        (1, "kg", "g", Decimal("1000")),
        (16, "oz", "lb", Decimal("1")),
        (1, "cup", "ml", Decimal("240")),
        (15, "ml", "tbsp", pytest.raises(ValueError)),  # invalid conversion
        (1, "count", "count", Decimal("1")),
    ],
)
def test_convert_unit(quantity, from_unit, to_unit, expected):
    if isinstance(expected, Decimal):
        result = convert_unit(quantity, from_unit, to_unit)
        assert result.quantize(Decimal("0.00001")) == expected.quantize(
            Decimal("0.00001")
        )
    else:
        with expected:
            convert_unit(quantity, from_unit, to_unit)


@pytest.mark.parametrize(
    "unit_input, normalized",
    [
        ("L", "liter"),
        ("Liters", "liter"),
        ("KILOGRAMS", "kg"),
        ("ounce", "oz"),
        ("tablespoons", "tbsp"),
        ("count", "count"),
        ("unknownunit", "unknownunit"),  # not in aliases
    ],
)
def test_normalize_unit(unit_input, normalized):
    assert normalize_unit(unit_input) == normalized


@pytest.mark.parametrize(
    "value, places, expected",
    [
        (Decimal("12.3456"), 2, 12.35),
        (Decimal("12.3449"), 2, 12.34),
        (Decimal("5"), 2, 5.0),
    ],
)
def test_round_decimal(value, places, expected):
    assert round_decimal(value, places) == expected
