"""Read-only rolling-origin replay; candidates never create purchase orders.

Observed sales are accepted as demand only by the dataset's explicit assumption.
Corrected comparisons reproduce the four quantity heuristics with explicit
reference assumptions; they do not execute restaurant ORM orchestration. Scenarios use only errors realized before
an origin and dated supply is consumed FEFO, including in candidate scoring.
"""
from dataclasses import dataclass
from math import ceil, isfinite
from statistics import mean, pstdev


@dataclass(frozen=True)
class Scenario:
    name: str
    actual_demand: tuple[float, ...]
    lead_days: int
    review_days: int
    shelf_days: int
    pack_quantity: float
    minimum_quantity: float = 0
    unit_cost: float = 1
    shortage_cost: float = 8
    waste_cost: float = 1
    service_level_z: float = 1.28
    spoilage_rate: float = 0
    dependency_mode: str = "mixed"
    canonical_unit: str = "kg"

    def __post_init__(self):
        if self.lead_days < 0 or self.review_days < 1 or self.shelf_days < 1:
            raise ValueError('Lead must be nonnegative; review and shelf days must be positive')
        if self.pack_quantity <= 0 or self.minimum_quantity < 0:
            raise ValueError('Pack quantity must be positive and MOQ nonnegative')
        if any(not isfinite(x) or x < 0 for x in (*self.actual_demand, self.pack_quantity,
                self.minimum_quantity, self.unit_cost, self.shortage_cost, self.waste_cost,
                self.service_level_z, self.spoilage_rate)):
            raise ValueError('Demand, packs and costs must be finite and nonnegative')


def forecast_at(history, horizon, seasonal=False):
    recent = history[-28:]
    baseline = mean(recent) if recent else 0
    sigma = pstdev(recent) if len(recent) > 1 else 0
    if seasonal and len(history) >= 7:
        return [mean(history[d] for d in range((len(history) + offset) % 7, len(history), 7))
                for offset in range(horizon)], sigma
    return [baseline] * horizon, sigma


def project(lots, inbound, start, demand, shelf_days):
    """Returns owned copies so objective evaluation cannot mutate the replay."""
    lots = [list(lot) for lot in lots]
    inbound = list(inbound)
    waste = unmet = fulfilled = holding = 0.0
    stockout_days = 0
    for offset, wanted in enumerate(demand):
        day = start + offset
        for delivery, quantity in list(inbound):
            if delivery == day:
                lots.append([day + shelf_days - 1, quantity])
                inbound.remove((delivery, quantity))
        for lot in lots:
            if lot[0] < day:
                waste += lot[1]
                lot[1] = 0
        outstanding = wanted
        for lot in sorted(lots):
            take = min(outstanding, lot[1])
            lot[1] -= take
            outstanding -= take
            fulfilled += take
        unmet += outstanding
        stockout_days += int(outstanding > 1e-9)
        holding += sum(lot[1] for lot in lots)
    return dict(lots=lots, inbound=inbound, waste=waste, unmet=unmet,
                fulfilled=fulfilled, holding=holding, stockout_days=stockout_days)


def error_scenarios(history, horizon):
    # Every error's complete protection interval ended before this origin.
    errors = []
    for origin in range(7, len(history) - horizon + 1):
        predicted, _ = forecast_at(history[:origin], horizon)
        errors.append((sum(history[origin:origin + horizon]) - sum(predicted)) / horizon)
    errors.sort()
    if not errors:
        return [(1.0, 0.0)]
    return [(weight, errors[round((len(errors) - 1) * quantile)])
            for weight, quantile in [(0.2, 0.1), (0.6, 0.5), (0.2, 0.9)]]


def simulate(scenario, algorithm):
    lots, inbound = [], []
    waste = unmet = fulfilled = spent = holding = ordered = 0.0
    stockout_days = 0
    decisions = []
    for day, actual in enumerate(scenario.actual_demand):
        # Expired stock is never counted in the order position.
        for lot in lots:
            if lot[0] < day:
                waste += lot[1]
                lot[1] = 0
        for delivery, quantity in list(inbound):
            if delivery == day:
                lots.append([day + scenario.shelf_days - 1, quantity])
                inbound.remove((delivery, quantity))
        if day % scenario.review_days == 0:
            horizon = scenario.lead_days + min(scenario.review_days, scenario.shelf_days)
            predictions, sigma = forecast_at(scenario.actual_demand[:day], horizon,
                                             seasonal=algorithm == 'seasonal_periodic')
            position = sum(lot[1] for lot in lots) + sum(q for _, q in inbound)
            arrival_demand = sum(predictions[scenario.lead_days:])
            before = project(lots, inbound, day, predictions[:scenario.lead_days], scenario.shelf_days)
            all_supply = project(lots, inbound, day, predictions, scenario.shelf_days)
            post_shortfall = max(all_supply['unmet'] - before['unmet'], 0)
            target = sum(predictions) + (mean(predictions) if predictions else 0)
            required = max(target - position - before['unmet'], post_shortfall, 0)
            cap = arrival_demand * 1.1
            if algorithm == 'legacy':
                required = max(sum(predictions[:min(scenario.shelf_days, horizon)]) - position, 0)
            elif algorithm.startswith('corrected'):
                daily = mean(predictions) if predictions else 0
                reserve = daily
                if algorithm == 'corrected_stable':
                    reserve = scenario.service_level_z * sigma * scenario.lead_days ** 0.5
                    trigger = sum(predictions[:scenario.lead_days]) + reserve
                    required = max(sum(predictions) + reserve - position - before['unmet'], post_shortfall, 0) if position <= trigger else 0
                elif algorithm == 'corrected_recipe':
                    reserve = max(predictions, default=0) if scenario.dependency_mode in {'batch_only', 'mixed'} else daily
                    required = max(sum(predictions) + reserve - position - before['unmet'], post_shortfall, 0)
                elif algorithm == 'corrected_intermittent':
                    # Expected daily values are not a known dated event calendar.
                    positive = [p for p in predictions[scenario.lead_days:] if p > 0]
                    trigger = positive[0] if positive else 0
                    delta = max(max(predictions, default=0) - trigger, 0)
                    reserve = min(daily, delta if delta else daily) if len(positive) > 1 else 0
                    required = max(trigger + reserve - position - before['unmet'], 0)
                elif algorithm != 'corrected':
                    raise ValueError(f'Unknown corrected policy {algorithm}')
                cap = max(sum(predictions) + reserve - position - before['unmet'], 0)
                if algorithm == 'corrected':
                    cap = min(cap, arrival_demand * (1 + max(0.1 - scenario.spoilage_rate, 0)))
                required = min(required, cap)
            elif algorithm in {'periodic', 'seasonal_periodic'}:
                required = max(sum(predictions) + 1.28 * sigma * horizon ** 0.5 - position, 0)
            elif algorithm == 'candidate':
                feasible = [0] + [p * scenario.pack_quantity for p in range(1, int(cap // scenario.pack_quantity) + 1)
                                  if p * scenario.pack_quantity >= scenario.minimum_quantity]
                scores = []
                score_days = scenario.lead_days + scenario.shelf_days
                score_forecast, _ = forecast_at(scenario.actual_demand[:day], score_days)
                for quantity in feasible:
                    score = quantity * scenario.unit_cost
                    supplies = inbound + ([(day + scenario.lead_days, quantity)] if quantity else [])
                    for weight, error in error_scenarios(scenario.actual_demand[:day], horizon):
                        result = project(lots, supplies, day, [max(p + error, 0) for p in score_forecast], scenario.shelf_days)
                        # New delivery expires at the end of this interval, after its last usable day.
                        terminal_waste = sum(q for expiry, q in result['lots'] if expiry <= day + score_days - 1)
                        score += weight * (result['unmet'] * scenario.shortage_cost +
                                           (result['waste'] + terminal_waste) * scenario.waste_cost)
                    scores.append((score, quantity))
                required = min(scores)[1]
            else:
                raise ValueError(f'Unknown algorithm {algorithm}')
            quantity = ceil(max(required, scenario.minimum_quantity) / scenario.pack_quantity) * scenario.pack_quantity if required else 0
            review_required = (algorithm.startswith('corrected') or algorithm == 'candidate') and quantity > cap + 1e-9
            if review_required:
                quantity = 0  # shadow reproduces the automatic cart review gate
            if quantity:
                if scenario.lead_days == 0:
                    lots.append([day + scenario.shelf_days - 1, quantity])
                else:
                    inbound.append((day + scenario.lead_days, quantity))
                spent += quantity * scenario.unit_cost
                ordered += quantity
            decisions.append({'origin_day': day, 'history_days': day, 'forecast': predictions,
                              'order_quantity': quantity, 'review_required': review_required})
        result = project(lots, inbound, day, [actual], scenario.shelf_days)
        lots, inbound = result['lots'], result['inbound']
        waste += result['waste']; unmet += result['unmet']; fulfilled += result['fulfilled']
        holding += result['holding']; stockout_days += result['stockout_days']
    total = sum(scenario.actual_demand)
    return {'scenario': scenario.name, 'algorithm': algorithm,
            'waste_quantity': round(waste, 4), 'waste_cost': round(waste * scenario.waste_cost, 4),
            'fill_rate': round(fulfilled / total, 4) if total else 1,
            'stockout_quantity': round(unmet, 4), 'stockout_days': stockout_days,
            'purchase_cost': round(spent, 4), 'canonical_unit': scenario.canonical_unit,
            'average_inventory_quantity': round(holding / max(len(scenario.actual_demand), 1), 4),
            'review_decisions': sum(int(row['review_required']) for row in decisions), 'average_inventory_value': round(holding * scenario.unit_cost / max(len(scenario.actual_demand), 1), 4),
            'ordered_quantity': ordered, 'ending_stock': sum(q for _, q in lots),
            'inbound_remaining': sum(q for _, q in inbound), 'decisions': decisions}


def demo_scenarios():
    return [Scenario('steady_short_life', tuple([10.] * 56), 2, 2, 2, 5),
            Scenario('large_pack_small_demand', tuple([1.] * 56), 2, 3, 2, 10),
            Scenario('intermittent_events', tuple(12. if d % 7 == 5 else 0 for d in range(56)), 1, 3, 4, 2),
            Scenario('volatile_demand', tuple([4., 8., 12., 3., 15., 6., 5.] * 8), 1, 2, 3, 3)]


def compare_forecasts(scenario, include_gbm=False):
    """Rolling multi-step evaluation of calendar GBM, weekday, mean and TSB.

Horizon intervals use only previously realized horizon errors, and report their
empirical coverage. They are diagnostic intervals, not a service-level promise.
"""
    import numpy as np
    horizon = scenario.lead_days + scenario.review_days
    algorithms = ['mean', 'weekday', 'tsb'] + (['calendar_gbm'] if include_gbm else [])
    summaries = []
    for algorithm in algorithms:
        records = []
        realized_errors = []
        for origin in range(28, len(scenario.actual_demand) - horizon + 1, 7):
            history = scenario.actual_demand[:origin]
            if algorithm in {'mean', 'weekday'}:
                prediction, _ = forecast_at(history, horizon, seasonal=algorithm == 'weekday')
            elif algorithm == 'tsb':
                probability = 0.; size = next((x for x in history if x > 0), 0.)
                for observed in history:
                    probability += 0.1 * (int(observed > 0) - probability)
                    if observed > 0:
                        size += 0.1 * (observed - size)
                prediction = [probability * size] * horizon
            elif len(set(history)) <= 1:
                prediction = [history[0]] * horizon
            else:
                import h2o
                from h2o.estimators.gbm import H2OGradientBoostingEstimator
                from datetime import date, timedelta
                base = date(2026, 1, 1)
                def features(days):
                    dates = [base + timedelta(days=day) for day in days]
                    return {'day_of_week': [d.weekday() for d in dates], 'day': [d.day for d in dates],
                            'month': [d.month for d in dates], 'year': [d.year for d in dates]}
                if not h2o.connection():
                    h2o.init()
                training = h2o.H2OFrame({**features(range(origin)), 'quantity_sold': list(history)})
                future = h2o.H2OFrame(features(range(origin, origin + horizon)))
                training['day_of_week'] = training['day_of_week'].asfactor()
                future['day_of_week'] = future['day_of_week'].asfactor()
                model = H2OGradientBoostingEstimator(ntrees=30, min_rows=2, seed=42)
                model.train(x=['day_of_week', 'day', 'month', 'year'], y='quantity_sold', training_frame=training)
                predictions = model.predict(future)
                prediction = [max(float(x), 0) for x in predictions.as_data_frame().iloc[:, 0]]
                h2o.remove([model.model_id, training.frame_id, future.frame_id, predictions.frame_id])
            actual = scenario.actual_demand[origin:origin + horizon]
            # Outcomes from preceding overlapping evaluations are eligible only
            # after their complete horizon has elapsed.
            calibration = [error for end, error in realized_errors if end <= origin]
            lower = upper = covered = None
            if len(calibration) >= 2:
                lower = max(sum(prediction) + float(np.quantile(calibration, 0.1)), 0)
                upper = max(sum(prediction) + float(np.quantile(calibration, 0.9)), lower)
                covered = lower <= sum(actual) <= upper
            scale = mean(abs(history[d] - history[d - 7]) for d in range(7, len(history)))
            errors = [p - a for p, a in zip(prediction, actual)]
            records.append({'origin_day': origin, 'history_days': origin, 'horizon_days': horizon,
                            'forecast': prediction, 'actual': actual, 'errors': errors,
                            'model_state': 'constant_history_fallback' if algorithm == 'calendar_gbm' and len(set(history)) <= 1 else algorithm, 'seasonal_scale': scale,
                            'horizon_interval_80': [lower, upper], 'interval_covered': covered})
            realized_errors.append((origin + horizon, sum(actual) - sum(prediction)))
        errors = [error for record in records for error in record['errors']]
        total_actual = sum(sum(record['actual']) for record in records)
        coverages = [record['interval_covered'] for record in records if record['interval_covered'] is not None]
        scaled = [mean(abs(e) for e in record['errors']) / record['seasonal_scale'] for record in records if record['seasonal_scale'] > 0]
        summaries.append({'scenario': scenario.name, 'algorithm': algorithm,
            'mae': mean(abs(e) for e in errors) if errors else None, 'bias': mean(errors) if errors else None,
            'wape': sum(abs(e) for e in errors) / total_actual if total_actual else None,
            'mase': mean(scaled) if scaled else None, 'interval_coverage_80': mean(coverages) if coverages else None,
            'origins': records})
    return summaries
