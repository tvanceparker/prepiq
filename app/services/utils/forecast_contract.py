from typing import Any, Dict, Literal, Optional


ForecastSource = Literal["cached", "fresh"]
ForecastSourceType = Literal["eod", "on_demand"]
ForecastStatus = Literal["ready", "stale", "degraded", "failed"]
ForecastAuthority = Literal["finalized_eod", "on_demand_preview", "unavailable"]
ForecastUsageAction = Literal["allow", "review", "block"]


def resolve_forecast_policy(
    *,
    forecast_source_type: ForecastSourceType,
    forecast_status: ForecastStatus,
) -> tuple[ForecastAuthority, ForecastUsageAction, str]:
    if forecast_status == "failed":
        return (
            "unavailable",
            "block",
            "No usable forecast is available. Block forecast-driven reorder and purchasing actions until a forecast is regenerated.",
        )

    if forecast_source_type == "on_demand":
        if forecast_status == "ready":
            return (
                "on_demand_preview",
                "review",
                "This on-demand forecast is a preview. Review it before treating it as the authoritative basis for reorder or purchasing.",
            )
        return (
            "on_demand_preview",
            "review",
            "This on-demand forecast is only suitable for review while the latest finalized EOD snapshot remains the authoritative source.",
        )

    if forecast_status == "ready":
        return (
            "finalized_eod",
            "allow",
            "This finalized EOD forecast is the authoritative downstream input for reorder and purchasing.",
        )

    if forecast_status == "stale":
        return (
            "finalized_eod",
            "review",
            "This finalized EOD forecast is behind the latest available EOD cycle. Review forecast-driven outputs before acting on them.",
        )

    return (
        "finalized_eod",
        "review",
        "This finalized EOD forecast completed with warnings. Review forecast-driven outputs before acting on them.",
    )


def build_forecast_contract(
    *,
    forecast_source: ForecastSource,
    forecast_source_type: ForecastSourceType,
    forecast_run_date: Optional[Any] = None,
    forecast_generated_at: Optional[Any],
    forecast_reused: bool,
    forecast_stale: bool,
    forecast_status: ForecastStatus,
    forecast_status_message: Optional[str],
    forecast_confidence_score: Optional[float] = None,
    forecast_version: Optional[int] = None,
) -> Dict[str, Any]:
    authority, usage_action, usage_message = resolve_forecast_policy(
        forecast_source_type=forecast_source_type,
        forecast_status=forecast_status,
    )

    return {
        "forecast_source": forecast_source,
        "forecast_source_type": forecast_source_type,
        "forecast_run_date": forecast_run_date,
        "forecast_generated_at": forecast_generated_at,
        "forecast_reused": forecast_reused,
        "forecast_stale": forecast_stale,
        "forecast_status": forecast_status,
        "forecast_status_message": forecast_status_message,
        "forecast_authority": authority,
        "forecast_usage_action": usage_action,
        "forecast_usage_message": usage_message,
        "forecast_confidence_score": forecast_confidence_score,
        "forecast_version": forecast_version,
    }
