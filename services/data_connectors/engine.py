from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import uuid
from typing import Any

CONNECTOR_TYPES = {
    "microsoft_365_security",
    "aws_cloudtrail",
    "google_workspace_audit",
    "firewall_syslog",
    "endpoint_security_events",
}


def normalize_connector_status(value: str) -> str:
    text = (value or "active").strip().lower()
    return text if text in {"active", "paused", "error", "testing", "removed"} else "active"


def _secret_key() -> bytes:
    seed = os.getenv("CONNECTOR_SECRET", "cybersentinel-local-secret").encode("utf-8", errors="ignore")
    return hashlib.sha256(seed).digest()


def protect_connector_secret(raw: dict[str, Any]) -> str:
    payload = json.dumps(raw or {}, separators=(",", ":")).encode("utf-8", errors="ignore")
    key = _secret_key()
    enc = bytes(b ^ key[i % len(key)] for i, b in enumerate(payload))
    return base64.b64encode(enc).decode("ascii")


def reveal_connector_secret(blob: str) -> dict[str, Any]:
    try:
        raw = base64.b64decode((blob or "").encode("ascii", errors="ignore"))
        key = _secret_key()
        dec = bytes(b ^ key[i % len(key)] for i, b in enumerate(raw))
        out = json.loads(dec.decode("utf-8", errors="ignore"))
        return out if isinstance(out, dict) else {}
    except Exception:
        return {}


def mask_connector_secret(raw: dict[str, Any]) -> dict[str, Any]:
    masked: dict[str, Any] = {}
    for k, v in (raw or {}).items():
        text = str(v)
        masked[k] = (text[:2] + "***" + text[-2:]) if len(text) > 6 else "***"
    return masked


def normalize_telemetry_event(source_system: str, event: dict[str, Any]) -> dict[str, Any]:
    return {
        "timestamp": str(event.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
        "source_system": str(source_system or event.get("source_system") or "connector"),
        "event_type": str(event.get("event_type") or "activity"),
        "user": str(event.get("user") or event.get("actor") or ""),
        "source_ip": str(event.get("source_ip") or event.get("src_ip") or ""),
        "target_asset": str(event.get("target_asset") or event.get("asset") or event.get("resource") or ""),
        "action": str(event.get("action") or event.get("event_type") or "activity"),
        "raw_event": dict(event),
    }


def simulate_connector_events(connector_type: str, org_id: str) -> list[dict[str, Any]]:
    base_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if connector_type == "aws_cloudtrail":
        rows = [
            {"timestamp": base_time, "event_type": "assume_role", "user": "svc-api", "source_ip": "52.12.44.10", "target_asset": "iam-role/admin", "resource": "iam-role/admin"},
            {"timestamp": base_time, "event_type": "console_login", "user": "analyst@company.com", "source_ip": "18.203.1.10", "target_asset": "aws-console"},
        ]
    elif connector_type == "microsoft_365_security":
        rows = [
            {"timestamp": base_time, "event_type": "mailbox_rule_created", "user": "finance.user@company.com", "source_ip": "40.101.22.1", "target_asset": "Exchange Online"},
            {"timestamp": base_time, "event_type": "risky_signin", "user": "executive@company.com", "source_ip": "13.107.6.152", "target_asset": "Entra ID"},
        ]
    elif connector_type == "google_workspace_audit":
        rows = [
            {"timestamp": base_time, "event_type": "oauth_grant", "user": "user@company.com", "source_ip": "34.120.8.8", "target_asset": "Google Workspace"},
        ]
    elif connector_type == "firewall_syslog":
        rows = [
            {"timestamp": base_time, "event_type": "deny", "user": "", "source_ip": "185.199.111.10", "target_asset": "edge-fw-01", "action": "blocked"},
            {"timestamp": base_time, "event_type": "allow", "user": "", "source_ip": "91.242.47.19", "target_asset": "vpn-gateway", "action": "allowed"},
        ]
    else:
        rows = [
            {"timestamp": base_time, "event_type": "malware_detected", "user": "host-user", "source_ip": "10.0.0.15", "target_asset": "endpoint-22"},
            {"timestamp": base_time, "event_type": "process_blocked", "user": "host-user", "source_ip": "10.0.0.15", "target_asset": "endpoint-22"},
        ]
    return [{**normalize_telemetry_event(connector_type, row), "org_id": org_id, "connector_event_id": f"conn_evt_{uuid.uuid4().hex[:10]}"} for row in rows]
