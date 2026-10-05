# Synthetic reorder benchmark

Generated October 5, 2026 with `python -m scripts.benchmark_reorder --gbm --output notes/reorder-benchmark-results.json`. Production policy selection is unchanged. Four synthetic scenarios, eight quantity policies and four forecast methods. All quantities in these scenarios are kg; unit cost is a scenario assumption. The replay begins with zero stock, so cold-start shortages count. Review-gated orders are not fulfilled by an imaginary operator.

| Scenario | Policy | Fill rate | Waste kg | Purchase cost | Review decisions |
| --- | --- | ---: | ---: | ---: | ---: |
| steady_short_life | legacy | 46.4% | 0.0 | 280.0 | 0 |
| steady_short_life | corrected | 0.0% | 0.0 | 0.0 | 27 |
| steady_short_life | corrected_stable | 92.9% | 0.0 | 540.0 | 0 |
| steady_short_life | corrected_recipe | 92.9% | 130.0 | 680.0 | 0 |
| steady_short_life | corrected_intermittent | 0.0% | 0.0 | 0.0 | 0 |
| steady_short_life | periodic | 46.4% | 260.0 | 560.0 | 0 |
| steady_short_life | seasonal_periodic | 46.4% | 260.0 | 560.0 | 0 |
| steady_short_life | candidate | 92.9% | 0.0 | 540.0 | 0 |
| large_pack_small_demand | legacy | 32.1% | 72.0 | 90.0 | 0 |
| large_pack_small_demand | corrected | 0.0% | 0.0 | 0.0 | 18 |
| large_pack_small_demand | corrected_stable | 0.0% | 0.0 | 0.0 | 18 |
| large_pack_small_demand | corrected_recipe | 0.0% | 0.0 | 0.0 | 18 |
| large_pack_small_demand | corrected_intermittent | 0.0% | 0.0 | 0.0 | 0 |
| large_pack_small_demand | periodic | 32.1% | 72.0 | 90.0 | 0 |
| large_pack_small_demand | seasonal_periodic | 32.1% | 72.0 | 90.0 | 0 |
| large_pack_small_demand | candidate | 0.0% | 0.0 | 0.0 | 0 |
| intermittent_events | legacy | 14.6% | 52.0 | 74.0 | 0 |
| intermittent_events | corrected | 0.0% | 0.0 | 0.0 | 17 |
| intermittent_events | corrected_stable | 0.0% | 0.0 | 0.0 | 17 |
| intermittent_events | corrected_recipe | 10.4% | 12.0 | 22.0 | 12 |
| intermittent_events | corrected_intermittent | 18.8% | 12.0 | 32.0 | 0 |
| intermittent_events | periodic | 35.4% | 126.0 | 178.0 | 0 |
| intermittent_events | seasonal_periodic | 77.1% | 100.0 | 186.0 | 0 |
| intermittent_events | candidate | 37.5% | 26.0 | 66.0 | 0 |
| volatile_demand | legacy | 88.9% | 5.0 | 396.0 | 0 |
| volatile_demand | corrected | 0.0% | 0.0 | 0.0 | 27 |
| volatile_demand | corrected_stable | 0.0% | 0.0 | 0.0 | 27 |
| volatile_demand | corrected_recipe | 12.5% | 1.0 | 54.0 | 24 |
| volatile_demand | corrected_intermittent | 55.7% | 0.0 | 240.0 | 0 |
| volatile_demand | periodic | 94.3% | 52.0 | 474.0 | 0 |
| volatile_demand | seasonal_periodic | 94.3% | 66.0 | 480.0 | 0 |
| volatile_demand | candidate | 91.5% | 0.0 | 399.0 | 0 |

Forecast accuracy uses past training data and completed multi-step outcomes. Horizon intervals use earlier realized errors; coverage is diagnostic. Undefined scaled errors remain unavailable, rather than zero.

| Scenario | Forecast | MAE | Bias | WAPE | MASE | 80% interval coverage |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| steady_short_life | mean | 0.000 | 0.000 | 0.000 | — | 1.000 |
| steady_short_life | weekday | 0.000 | 0.000 | 0.000 | — | 1.000 |
| steady_short_life | tsb | 0.238 | -0.238 | 0.024 | — | 0.000 |
| steady_short_life | calendar_gbm | 0.000 | 0.000 | 0.000 | — | 1.000 |
| large_pack_small_demand | mean | 0.000 | 0.000 | 0.000 | — | 1.000 |
| large_pack_small_demand | weekday | 0.000 | 0.000 | 0.000 | — | 1.000 |
| large_pack_small_demand | tsb | 0.024 | -0.024 | 0.024 | — | 0.000 |
| large_pack_small_demand | calendar_gbm | 0.000 | 0.000 | 0.000 | — | 1.000 |
| intermittent_events | mean | 1.714 | 1.714 | — | — | 1.000 |
| intermittent_events | weekday | 0.000 | 0.000 | — | — | 1.000 |
| intermittent_events | tsb | 2.021 | 2.021 | — | — | 0.000 |
| intermittent_events | calendar_gbm | 0.073 | 0.073 | — | — | 1.000 |
| volatile_demand | mean | 2.810 | -0.429 | 0.351 | — | 1.000 |
| volatile_demand | weekday | 0.000 | 0.000 | 0.000 | — | 1.000 |
| volatile_demand | tsb | 2.899 | -0.698 | 0.362 | — | 0.000 |
| volatile_demand | calendar_gbm | 0.119 | -0.018 | 0.015 | — | 1.000 |

These are controlled comparisons, not restaurant performance claims. Candidate search helps on some fixtures and performs poorly on others. Missing imports, stockout-censored sales, uncertain delivery, prep capacity and customer cost tradeoffs need representative validation. Full arithmetic, origin dates and decisions are in [the JSON artifact](reorder-benchmark-results.json).
