"""Run from repository root: python -m scripts.benchmark_reorder --output report.json.

Optional --input accepts a JSON list of Scenario fields with actual_demand arrays.
Input quantities must share one canonical physical unit per scenario.
"""
import argparse
import json
from pathlib import Path
from app.services.reorder.benchmark import Scenario, demo_scenarios, simulate, compare_forecasts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--gbm', action='store_true', help='Also fit calendar H2O GBM at each past origin (requires Java)')
    args = parser.parse_args()
    scenarios = [Scenario(**row) for row in json.loads(args.input.read_text())] if args.input else demo_scenarios()
    results = [simulate(scenario, algorithm) for scenario in scenarios for algorithm in ['legacy', 'corrected', 'corrected_stable', 'corrected_recipe', 'corrected_intermittent', 'periodic', 'seasonal_periodic', 'candidate']]
    args.output.write_text(json.dumps({'data_source': 'user-provided' if args.input else 'synthetic',
        'production_algorithm_changed': False, 'corrected_comparison_scope': 'four reference quantity heuristics: fresh, stable, mixed recipe, expected-value intermittent',
        'demand_assumption': 'input is complete uncensored demand; observed sales need separate coverage/stockout validation',
        'results': results, 'forecast_comparisons': [row for scenario in scenarios for row in compare_forecasts(scenario, args.gbm)]}, indent=2))
    print(f'Wrote {len(results)} rolling-origin comparisons to {args.output}')


if __name__ == '__main__':
    main()
