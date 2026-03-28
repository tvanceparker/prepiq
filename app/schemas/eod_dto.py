from datetime import date
from typing import List, Literal

from pydantic import BaseModel


class EODLaunchSummaryDTO(BaseModel):
    status: Literal["processing"]
    detail: str
    run_date: date
    trigger_source: Literal["manual"]
    run_mode: Literal["idempotent_run", "force_rerun"]
    protections: List[str]