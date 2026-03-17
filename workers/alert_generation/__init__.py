"""Alert generation / escalation worker package."""

from .worker import run_alert_generation_worker

__all__ = ["run_alert_generation_worker"]
