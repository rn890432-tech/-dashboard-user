"""Attack replay service helpers.

Service responsibilities:
- collect related events
- order events by timestamp
- reconstruct replay timeline
"""

from __future__ import annotations

from typing import Any


def normalize_timestamp(value: str | None) -> str:
    if not value:
        return ""
    text = value.strip()
    return text if "T" in text else text.replace(" ", "T") + "Z"


def sort_timeline(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(events, key=lambda e: str(e.get("time") or e.get("timestamp") or ""))
    for i, ev in enumerate(ordered, start=1):
        if "step" not in ev:
            ev["step"] = i
    return ordered
