from __future__ import annotations

from dataclasses import dataclass
from typing import Any


SUPPORTED_DEFENSE_MODES: set[str] = {
    "monitor_only",
    "analyst_approval_required",
    "full_autonomous",
}

SUPPORTED_DEFENSE_ACTIONS: set[str] = {
    "block_ip",
    "block_domain",
    "disable_user_account",
    "revoke_sessions",
    "isolate_device",
    "enforce_mfa",
    "notify_slack",
    "notify_email",
}


def normalize_defense_mode(value: str) -> str:
    mode = (value or "monitor_only").strip().lower()
    if mode not in SUPPORTED_DEFENSE_MODES:
        return "monitor_only"
    return mode


@dataclass
class DefenseEvaluationInput:
    incident_id: str
    severity: str
    attack_classifications: list[str]
    indicators: list[str]
    has_identity_signal: bool


def _trigger_from_classification(classification: str) -> str:
    mapping = {
        "phishing": "phishing_detected",
        "malware": "malware_detected",
        "credential_access": "credential_access_detected",
        "data_exfiltration": "data_exfiltration_detected",
    }
    return mapping.get(classification, "suspicious_activity_detected")


def evaluate_incident_for_response(
    payload: DefenseEvaluationInput,
    playbooks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    severity = (payload.severity or "MEDIUM").upper()
    classifications = [str(c or "").strip().lower() for c in payload.attack_classifications if str(c or "").strip()]
    if not classifications:
        classifications = ["suspicious_activity"]

    triggers = {_trigger_from_classification(c) for c in classifications}
    severity_boost = {"CRITICAL": 0.1, "HIGH": 0.06, "MEDIUM": 0.0, "LOW": -0.05, "INFO": -0.08}.get(severity, 0.0)

    recommendations: list[dict[str, Any]] = []
    for pb in playbooks:
        trigger = str(pb.get("trigger") or "")
        if trigger not in triggers and severity not in {"CRITICAL", "HIGH"}:
            continue

        base_conf = float(pb.get("base_confidence") or 0.65)
        for action in pb.get("actions", []):
            a = str(action or "").strip().lower()
            if a == "notify_security_team":
                a = "notify_slack"
            if a not in SUPPORTED_DEFENSE_ACTIONS:
                continue

            conf = max(0.1, min(0.99, base_conf + severity_boost))
            if payload.has_identity_signal and a in {"disable_user_account", "revoke_sessions", "enforce_mfa"}:
                conf = min(0.99, conf + 0.04)

            target = payload.indicators[0] if payload.indicators else ""
            recommendations.append(
                {
                    "incident_id": payload.incident_id,
                    "playbook_name": str(pb.get("playbook_name") or "Autonomous Response"),
                    "trigger": trigger or "high_severity_incident",
                    "action": a,
                    "target": target,
                    "confidence": round(conf, 2),
                    "rationale": (
                        f"Action '{a}' selected by playbook '{pb.get('playbook_name')}' "
                        f"for severity={severity} and signals={','.join(classifications)}."
                    ),
                }
            )

    # deterministic order: higher confidence first, then action name
    recommendations.sort(key=lambda r: (-float(r["confidence"]), str(r["action"])))
    return recommendations[:12]
