def smape(predicted: int, actual: int) -> float:
    if predicted == 0 and actual == 0:
        return 0.0  # Perfect prediction, no error
    denominator = (abs(predicted) + abs(actual)) / 2
    return abs(predicted - actual) / denominator * 100

def mape(predicted: int, actual: int) -> float:
    """
    Calculates MAPE (Mean Absolute Percentage Error) for a single forecast.
    - Returns 0.0 if actual is 0 and predicted is also 0 (perfect prediction).
    - Returns 100.0 if actual is 0 and predicted > 0 (maximum possible error).
    """
    if actual == 0:
        return 0.0 if predicted == 0 else 100.0
    return abs(predicted - actual) / abs(actual) * 100
