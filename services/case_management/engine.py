from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

ALLOWED_CASE_STATUS = {"open", "investigating", "contained", "resolved", "closed"}
ALLOWED_CASE_SEVERITY = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_case_status(value: str) -> str:
    text = (value or "open").strip().lower()
    return text if text in ALLOWED_CASE_STATUS else "open"


def normalize_case_severity(value: str) -> str:
    text = (value or "MEDIUM").strip().upper()
    return text if text in ALLOWED_CASE_SEVERITY else "MEDIUM"


def validate_case_payload(case: dict[str, Any]) -> dict[str, Any]:
    return {
        "case_id": str(case.get("case_id") or "").strip(),
        "incident_id": str(case.get("incident_id") or "").strip(),
        "title": str(case.get("title") or "").strip()[:180],
        "description": str(case.get("description") or "").strip()[:4000],
        "severity": normalize_case_severity(str(case.get("severity") or "MEDIUM")),
        "status": normalize_case_status(str(case.get("status") or "open")),
        "assigned_analyst": str(case.get("assigned_analyst") or "").strip()[:180],
        "created_at": str(case.get("created_at") or _utc_now_iso()).strip(),
        "updated_at": str(case.get("updated_at") or _utc_now_iso()).strip(),
        "org_id": str(case.get("org_id") or "org_default").strip(),
    }


def create_case_timeline_event(event_type: str, actor: str, description: str, payload: dict[str, Any] | None = None) -> tuple[str, str, str, str]:
    safe_payload = json.dumps(payload or {})
    return (
        str(event_type or "case_event")[:80],
        str(actor or "system")[:120],
        str(description or "")[:500],
        safe_payload,
    )
