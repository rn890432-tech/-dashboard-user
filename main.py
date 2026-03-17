import asyncio
import hashlib
import ipaddress
import json
import logging as _logging
import math
import os
import random as _random
import re
import sqlite3
import time
import uuid
from urllib import request
from urllib.error import URLError
from contextlib import asynccontextmanager
from typing import Any, Awaitable, Callable, Optional
from starlette.responses import Response as _StarletteResponse  # type: ignore

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from pydantic import BaseModel  # type: ignore
from services.auto_defense_engine import (
    DEFAULT_RESPONSE_PLAYBOOKS,
    SUPPORTED_DEFENSE_ACTIONS,
    DefenseEvaluationInput,
    evaluate_incident_for_response,
    normalize_defense_mode,
)
from services.attack_simulation import (
    ATTACK_SIMULATION_SCENARIOS,
    SUPPORTED_SIMULATION_RESPONSE_ACTIONS,
    AttackSimulationEngine,
    build_simulation_attack_details,
    ensure_attack_simulation_tables,
    load_recent_simulation_attacks,
)
from services.case_management import (
    ALLOWED_CASE_STATUS,
    create_case_timeline_event,
    normalize_case_status,
    validate_case_payload,
)
from services.data_connectors import (
    CONNECTOR_TYPES,
    mask_connector_secret,
    normalize_connector_status,
    normalize_telemetry_event,
    protect_connector_secret,
    simulate_connector_events,
)
from services.risk_scoring_engine import calculate_executive_risk_snapshot
from services.threat_actor_attribution import attribute_threat_actor
from services.threat_attribution import analyze_attribution
from services.threat_feed_aggregator import DEFAULT_FEED_SOURCES, aggregate_threat_feeds

# ── Streaming pipeline ────────────────────────────────────────────────────────
from services.event_broker import event_broker  # noqa: E402
from services.event_stream import event_stream_producer  # noqa: E402
from workers.rule_evaluation import run_rule_evaluation_worker  # noqa: E402
from workers.alert_generation import run_alert_generation_worker  # noqa: E402
from workers.graph_update import run_graph_update_worker  # noqa: E402

DB_PATH = "redteam.db"

ALLOWED_THREAT_STATUS = {"open", "investigating", "resolved", "false_positive"}
ALLOWED_INCIDENT_STATUS = {"open", "investigating", "contained", "resolved", "closed"}
ALLOWED_ATTACK_CLASSIFICATIONS = {
    "phishing",
    "malware",
    "credential_access",
    "reconnaissance",
    "lateral_movement",
    "data_exfiltration",
    "policy_violation",
    "suspicious_activity",
}

CLASSIFICATION_PLAYBOOKS: dict[str, list[str]] = {
    "phishing": [
        "Block suspicious domain and sender infrastructure at mail and DNS gateways.",
        "Force credential reset and re-authentication for impacted users.",
        "Isolate affected endpoint sessions and collect forensic artifacts.",
    ],
    "malware": [
        "Isolate host from network immediately using EDR containment.",
        "Block matched hash across endpoint and gateway controls.",
        "Acquire memory and disk evidence before remediation actions.",
    ],
    "credential_access": [
        "Reset credentials and invalidate active sessions/tokens.",
        "Enforce MFA challenge for impacted identities.",
        "Review authentication logs for lateral spread indicators.",
    ],
    "reconnaissance": [
        "Block probing source and rate-limit perimeter endpoints.",
        "Increase telemetry retention for perimeter and DNS logs.",
        "Hunt for companion IOC activity in adjacent segments.",
    ],
    "lateral_movement": [
        "Segment affected network paths and restrict east-west traffic.",
        "Quarantine suspected pivot hosts and privileged accounts.",
        "Audit remote execution and admin tooling telemetry.",
    ],
    "data_exfiltration": [
        "Block outbound egress channel and suspicious transfer endpoints.",
        "Rotate secrets and credentials for exposed systems.",
        "Initiate data-loss and legal notification workflow.",
    ],
    "policy_violation": [
        "Validate control policy mapping and alerting thresholds.",
        "Correct misconfigured enforcement points.",
        "Run targeted regression checks against updated controls.",
    ],
    "suspicious_activity": [
        "Escalate to human analyst for contextual triage.",
        "Increase telemetry collection for affected entities.",
        "Track recurrence and pivot into related indicators.",
    ],
}

MITRE_PLAYBOOKS: dict[str, list[str]] = {
    "T1566": [
        "Harden email filtering and quarantine lookalike sender campaigns.",
        "Reset exposed credentials and enforce phishing-resistant MFA.",
        "Run mailbox hunting for similar lure indicators.",
    ],
    "T1059": [
        "Block suspicious script interpreter execution via policy.",
        "Contain host and collect script/process lineage telemetry.",
        "Deploy detections for encoded/obfuscated command execution.",
    ],
    "T1078": [
        "Disable compromised account and invalidate refresh tokens.",
        "Audit privileged access and anomalous login geolocation.",
        "Enforce conditional access and least privilege controls.",
    ],
    "T1027": [
        "Flag obfuscated binaries and block execution by hash/signature.",
        "Collect unpacked payload artifacts in sandbox.",
        "Tune detections for packed/encoded content patterns.",
    ],
}


class StreamHub:
    def __init__(self) -> None:
        self.connections: set[Any] = set()

    async def connect(self, ws: Any) -> None:
        await ws.accept()
        self.connections.add(ws)

    def disconnect(self, ws: Any) -> None:
        self.connections.discard(ws)

    async def broadcast(self, event: str, data: object) -> None:
        if not self.connections:
            return
        message = {"event": event, "data": data} # type: ignore # pyright: ignore[reportUnknownVariableType]
        stale: list[Any] = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)


stream_hub = StreamHub()
threat_feed_auto_task: Optional[asyncio.Task[Any]] = None


def queue_broadcast(event: str, data: object) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(stream_hub.broadcast(event, data))


simulation_engine = AttackSimulationEngine(DB_PATH, queue_broadcast)


def normalize_severity(value: str) -> str:
    return (value or "MEDIUM").strip().upper()


def normalize_status(value: str) -> str:
    return (value or "open").strip().lower()


def _extract_user_identity(raw_event: Optional[str]) -> Optional[str]:
    if not raw_event:
        return None
    parsed = _extract_json_object(str(raw_event))
    if not parsed:
        return None
    for key in ("user", "username", "account", "email", "principal"):
        val = parsed.get(key)
        if val:
            text = str(val).strip()
            if text:
                return text
    return None


def llm_enabled() -> bool:
    return os.getenv("SOC_LLM_ENABLE", "false").strip().lower() in {"1", "true", "yes", "on"}


def _safe_steps(raw_steps: object, fallback: list[str]) -> list[str]:
    if not isinstance(raw_steps, list):
        return fallback
    cleaned: list[str] = []
    for s in raw_steps: # pyright: ignore[reportUnknownVariableType]
        text = str(s).strip() # pyright: ignore[reportUnknownArgumentType] # pyright: ignore[reportUnknownArgumentType]
        if not text:
            continue
        # Deterministic guardrail: max 180 chars per step, no markdown bullets needed.
        cleaned.append(text[:180])
        if len(cleaned) >= 8:
            break
    return cleaned or fallback


def _extract_json_object(text: str) -> Optional[dict[str, object]]:
    text = (text or "").strip()
    if not text:
        return None
    if text.startswith("```"):
        text = text.strip("`")
        if "\n" in text:
            text = text.split("\n", 1)[1]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end + 1])
        if isinstance(parsed, dict):
            return parsed # type: ignore # pyright: ignore[reportUnknownVariableType]
    except Exception:
        return None
    return None


def _mitre_base(technique: Optional[str]) -> list[str]:
    if not technique:
        return []
    normalized = technique.strip().upper()
    return MITRE_PLAYBOOKS.get(normalized, [])


def _llm_enrich_playbook(
    *,
    classification: str,
    severity: str,
    mitre_technique: Optional[str],
    recommendation: str,
    base_steps: list[str],
    notes: str,
) -> Optional[dict[str, object]]:
    """Optional best-effort LLM enrichment. Returns None if unavailable/fails.

    Guardrails:
    - deterministic rule engine classification remains authoritative
    - output must be JSON and steps are length/volume constrained
    - if anything fails, caller keeps rule engine output
    """
    if not llm_enabled():
        return None
    api_key = os.getenv("SOC_LLM_API_KEY", "").strip()
    if not api_key:
        return None

    url = os.getenv("SOC_LLM_URL", "https://api.openai.com/v1/chat/completions").strip()
    model = os.getenv("SOC_LLM_MODEL", "gpt-4o-mini").strip()

    system_prompt = (
        "You are a SOC co-pilot. Return ONLY strict JSON with keys: "
        "recommendation (string), playbook_steps (array of short strings), rationale (string). "
        "Do not change attack classification. Keep defensive, lawful, and enterprise-safe guidance."
    )
    user_prompt = { # pyright: ignore[reportUnknownVariableType] # type: ignore
        "classification": classification,
        "severity": severity,
        "mitre_technique": mitre_technique,
        "current_recommendation": recommendation,
        "base_steps": base_steps,
        "notes": notes,
    }

    payload = { # pyright: ignore[reportUnknownVariableType] # pyright: ignore[reportUnknownVariableType]
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
        "response_format": {"type": "json_object"},
    }
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=8) as resp: # nosec B310
            body = resp.read().decode("utf-8", errors="ignore")
    except (URLError, TimeoutError, OSError):
        return None

    parsed = _extract_json_object(body)
    if not parsed:
        try:
            outer = json.loads(body)
            content = outer["choices"][0]["message"]["content"]
            parsed = _extract_json_object(str(content))
        except Exception:
            return None
    if not parsed:
        return None

    llm_rec = str(parsed.get("recommendation") or recommendation).strip()[:360]
    llm_steps = _safe_steps(parsed.get("playbook_steps"), base_steps)
    rationale = str(parsed.get("rationale") or "LLM enrichment applied under guardrails.").strip()[:260]
    return {
        "recommendation": llm_rec or recommendation,
        "playbook_steps": llm_steps,
        "rationale": rationale,
    }


def _action_for_classification(classification: str) -> str:
    mapping = {
        "phishing": "block_domain",
        "malware": "isolate_host",
        "credential_access": "reset_credentials",
        "reconnaissance": "block_ip",
        "lateral_movement": "segment_network",
        "data_exfiltration": "block_egress",
        "policy_violation": "tune_detection_policy",
        "suspicious_activity": "monitor_activity",
    }
    return mapping.get(classification, "monitor_activity")


def _rule_engine_decision_from_alert(alert: sqlite3.Row) -> dict[str, object]:
    classification = str(alert["attack_classification"] or "suspicious_activity")
    confidence = float(alert["analyst_confidence"] or 0.65)
    action = _action_for_classification(classification)
    recommendation = str(alert["analyst_recommendation"] or "Escalate for analyst triage.")

    if str(alert["analyst_status"] or "") == "closed_false_positive":
        action = "take_no_action"
        confidence = min(confidence, 0.6)

    return {
        "action": action,
        "confidence": round(confidence, 2),
        "classification": classification,
        "recommendation": recommendation,
    }


def _llm_dry_run_decision(alert: sqlite3.Row, rule_decision: dict[str, object]) -> dict[str, object]:
    # Safe default when LLM is disabled/unavailable.
    fallback = { # pyright: ignore[reportUnknownVariableType] # pyright: ignore[reportUnknownVariableType] # type: ignore
        "action": rule_decision["action"],
        "confidence": max(0.5, float(rule_decision["confidence"]) - 0.05), # pyright: ignore[reportArgumentType]
        "classification": rule_decision["classification"],
        "recommendation": str(rule_decision["recommendation"]),
        "decision_source": "llm_unavailable",
    }

    if not llm_enabled():
        return fallback # type: ignore
    api_key = os.getenv("SOC_LLM_API_KEY", "").strip()
    if not api_key:
        return fallback # type: ignore

    url = os.getenv("SOC_LLM_URL", "https://api.openai.com/v1/chat/completions").strip()
    model = os.getenv("SOC_LLM_MODEL", "gpt-4o-mini").strip()

    prompt_payload = { # pyright: ignore[reportUnknownVariableType]
        "alert": {
            "alert_type": alert["alert_type"],
            "severity": alert["severity"],
            "matched_indicator": alert["matched_indicator"],
            "attack_classification": alert["attack_classification"],
            "analyst_status": alert["analyst_status"],
        },
        "rule_engine_decision": rule_decision,
        "allowed_actions": [
            "block_ip",
            "block_domain",
            "isolate_host",
            "reset_credentials",
            "segment_network",
            "block_egress",
            "monitor_activity",
            "tune_detection_policy",
            "take_no_action",
        ],
        "instructions": "Return JSON only with keys action, confidence, recommendation. Keep defensive enterprise SOC guidance.",
    }
    req_payload = { # pyright: ignore[reportUnknownVariableType]
        "model": model,
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": "You are a SOC decision co-pilot. Return strict JSON only. Never provide offensive instructions.",
            },
            {"role": "user", "content": json.dumps(prompt_payload)},
        ],
        "response_format": {"type": "json_object"},
    }

    req = request.Request(
        url,
        data=json.dumps(req_payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=8) as resp: # nosec B310
            body = resp.read().decode("utf-8", errors="ignore")
        outer = json.loads(body)
        content = str(outer["choices"][0]["message"]["content"])
        parsed = _extract_json_object(content) or _extract_json_object(body)
        if not parsed:
            return fallback # type: ignore
    except Exception:
        return fallback # type: ignore

    action = str(parsed.get("action") or fallback["action"]).strip().lower() # pyright: ignore[reportUnknownArgumentType]
    allowed = {
        "block_ip",
        "block_domain",
        "isolate_host",
        "reset_credentials",
        "segment_network",
        "block_egress",
        "monitor_activity",
        "tune_detection_policy",
        "take_no_action",
    }
    if action not in allowed:
        action = str(fallback["action"]) # type: ignore

    try:
        conf = float(parsed.get("confidence") or fallback["confidence"]) # type: ignore
    except Exception:
        conf = float(fallback["confidence"]) # pyright: ignore[reportUnknownArgumentType]
    conf = max(0.0, min(1.0, conf))

    rec: str = str(parsed.get("recommendation") or fallback["recommendation"]).strip()[:360] # pyright: ignore[reportUnknownArgumentType]
    return {
        "action": action,
        "confidence": round(conf, 2),
        "classification": str(rule_decision["classification"]),
        "recommendation": rec or str(fallback["recommendation"]), # pyright: ignore[reportUnknownArgumentType]
        "decision_source": "llm_guardrailed",
    }


def _normalize_ts(value: Optional[str]) -> str:
    if not value:
        return ""
    ts = value.strip()
    if "T" in ts:
        return ts
    return ts.replace(" ", "T") + "Z"


def _hash_to_geo(seed: str) -> tuple[float, float]:
    digest = hashlib.sha256(seed.encode("utf-8", errors="ignore")).hexdigest()
    n1 = int(digest[:16], 16)
    n2 = int(digest[16:32], 16)
    # Avoid poles for better visualization.
    lat = ((n1 % 14000) / 100.0) - 70.0
    lon = ((n2 % 36000) / 100.0) - 180.0
    return round(lat, 4), round(lon, 4)


def _ip_to_geo(ip_value: Optional[str], fallback_seed: str = "") -> tuple[float, float]:
    if ip_value:
        try:
            parts = [int(x) for x in ip_value.split(".")]
            if len(parts) == 4:
                # Deterministic rough mapping from IPv4 octets.
                lat = ((parts[0] * 256 + parts[1]) % 14000) / 100.0 - 70.0
                lon = ((parts[2] * 256 + parts[3]) % 36000) / 100.0 - 180.0
                return round(lat, 4), round(lon, 4)
        except Exception:
            pass
    return _hash_to_geo(fallback_seed or ip_value or "unknown")


def _normalize_event_severity(value: str) -> str:
    sev = (value or "MEDIUM").strip().upper()
    if sev not in {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}:
        return "MEDIUM"
    return sev


def _geo_to_region_label(lat: float, lon: float) -> str: # type: ignore
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    return f"{abs(round(lat, 1))}°{ns}, {abs(round(lon, 1))}°{ew}"


def _curved_arc_control(src_lat: float, src_lon: float, dst_lat: float, dst_lon: float) -> dict[str, float]:
    mid_lat = (src_lat + dst_lat) / 2.0
    mid_lon = (src_lon + dst_lon) / 2.0
    # Simple arc bulge based on geographic distance.
    dist = math.sqrt((dst_lat - src_lat) ** 2 + (dst_lon - src_lon) ** 2)
    bulge = min(25.0, 8.0 + dist * 0.06)
    return {"ctrl_lat": round(mid_lat + bulge, 4), "ctrl_lon": round(mid_lon, 4)}


COUNTRY_POINTS: dict[str, tuple[float, float]] = {
    "United States": (38.0, -97.0),
    "Russia": (61.0, 105.0),
    "China": (35.0, 103.0),
    "Germany": (51.0, 10.0),
    "Brazil": (-14.0, -51.0),
    "United Kingdom": (55.0, -3.0),
    "India": (21.0, 78.0),
    "Japan": (36.0, 138.0),
    "France": (46.0, 2.0),
    "Canada": (56.0, -106.0),
    "Australia": (-25.0, 133.0),
}


def _country_from_geo(lat: float, lon: float) -> str:
    # Fast nearest-country fallback for visualization labels.
    best_country = "Unknown"
    best_dist = 1e18
    for country, (clat, clon) in COUNTRY_POINTS.items():
        d = (lat - clat) ** 2 + (lon - clon) ** 2
        if d < best_dist:
            best_dist = d
            best_country = country
    return best_country


def _country_from_ip(ip_value: str, lat: float, lon: float) -> str:
    text = (ip_value or "").strip()
    if text:
        try:
            first = int(text.split(".")[0])
            bucket = [
                "Russia",
                "United States",
                "China",
                "Germany",
                "Brazil",
                "United Kingdom",
                "India",
                "Japan",
                "France",
                "Canada",
                "Australia",
            ]
            return bucket[first % len(bucket)]
        except Exception:
            pass
    return _country_from_geo(lat, lon)


def _sector_from_context(title: str, indicator: str, asset: str) -> str:
    merged = f"{title} {indicator} {asset}".lower()
    if any(k in merged for k in ["bank", "finance", "payment", "swift", "payroll"]):
        return "Finance"
    if any(k in merged for k in ["hospital", "health", "clinic", "ehr"]):
        return "Healthcare"
    if any(k in merged for k in ["gov", "ministry", "public", "state"]):
        return "Government"
    if any(k in merged for k in ["edu", "school", "university"]):
        return "Education"
    if any(k in merged for k in ["factory", "ot", "scada", "ics", "industrial"]):
        return "Industrial"
    return "Enterprise"


def _attack_type_from_threat_type(raw_type: str) -> str:
    t = (raw_type or "").strip().lower()
    if "phish" in t:
        return "phishing_campaign"
    if "malware" in t:
        return "malware_delivery"
    if "brute" in t or "credential" in t:
        return "brute_force"
    if "exploit" in t:
        return "exploit_attempt"
    if "exfil" in t:
        return "data_exfiltration"
    return t or "suspicious_activity"


def _compute_top_counts(items: list[str], top_n: int = 5) -> list[dict[str, object]]:
    counts: dict[str, int] = {}
    for item in items:
        key = (item or "Unknown").strip() or "Unknown"
        counts[key] = counts.get(key, 0) + 1
    rows = [{"name": k, "count": v} for k, v in counts.items()] # pyright: ignore[reportUnknownVariableType]
    rows.sort(key=lambda r: int(r["count"]), reverse=True) # pyright: ignore[reportUnknownMemberType] # type: ignore
    return rows[:top_n] # pyright: ignore[reportUnknownVariableType]


def _build_live_attack_events(limit: int, window_minutes: int, organization_id: Optional[str] = None) -> dict[str, object]:
    safe_limit = min(max(limit, 20), 500)
    safe_window = min(max(window_minutes, 1), 180)

    with get_conn() as conn:
        threats = conn.execute(
            """SELECT id, threat_name, type, mitre_technique, severity, source_ip, dest_ip, indicator_domain, description, timestamp
               FROM threats ORDER BY timestamp DESC LIMIT ?""",
            (safe_limit,),
        ).fetchall()
        alerts = conn.execute(
            """SELECT id, alert_type, severity, matched_indicator, attack_classification, analyst_confidence, timestamp
               FROM alerts ORDER BY timestamp DESC LIMIT ?""",
            (safe_limit,),
        ).fetchall()
        attributions = conn.execute(
            "SELECT incident_id, possible_actor, confidence FROM incident_attributions ORDER BY created_at DESC LIMIT 300"
        ).fetchall()

    actor_hint = next((dict(r) for r in attributions), None)

    attacks: list[dict[str, object]] = []
    for row in threats:
        src_ip = str(row["source_ip"] or "")
        dst_ip = str(row["dest_ip"] or "")
        src_lat, src_lon = _ip_to_geo(src_ip, f"threat_src_{row['id']}")
        dst_lat, dst_lon = _ip_to_geo(dst_ip, f"threat_dst_{row['id']}")
        src_country = _country_from_ip(src_ip, src_lat, src_lon)
        dst_country = _country_from_ip(dst_ip, dst_lat, dst_lon)
        attack_type = _attack_type_from_threat_type(str(row["type"] or ""))
        severity = _normalize_event_severity(str(row["severity"] or "MEDIUM"))
        target_sector = _sector_from_context(str(row["threat_name"] or ""), str(row["indicator_domain"] or ""), str(row["description"] or ""))

        actor_name = ""
        actor_conf = 0.0
        if actor_hint and float(actor_hint.get("confidence") or 0) >= 0.7:
            actor_name = str(actor_hint.get("possible_actor") or "")
            actor_conf = float(actor_hint.get("confidence") or 0)

        attacks.append(
            {
                "id": f"threat_{row['id']}",
                "src_ip": src_ip,
                "src_country": src_country,
                "dst_country": dst_country,
                "attack_type": attack_type,
                "severity": severity,
                "timestamp": _normalize_ts(str(row["timestamp"] or "")),
                "source": {"lat": src_lat, "lon": src_lon, "label": src_country, "ip": src_ip},
                "target": {"lat": dst_lat, "lon": dst_lon, "label": dst_country, "ip": dst_ip},
                "arc": _curved_arc_control(src_lat, src_lon, dst_lat, dst_lon),
                "mitre_technique": str(row["mitre_technique"] or ""),
                "mitre_label": MITRE_LABELS.get(str(row["mitre_technique"] or "").upper(), ""),
                "related_alert_ids": [],
                "target_sector": target_sector,
                "title": str(row["threat_name"] or row["type"] or "Threat Event"),
                "threat_actor": {"name": actor_name, "confidence": round(actor_conf, 2)} if actor_name else None,
                "kind": "threat",
            }
        )

    for row in alerts[: max(10, safe_limit // 3)]:
        indicator = str(row["matched_indicator"] or "")
        src_lat, src_lon = _hash_to_geo(f"alert_src_{indicator}_{row['id']}")
        dst_lat, dst_lon = _hash_to_geo(f"alert_dst_{indicator}_{row['id']}")
        src_country = _country_from_geo(src_lat, src_lon)
        dst_country = _country_from_geo(dst_lat, dst_lon)
        classification = str(row["attack_classification"] or "suspicious_activity")
        attack_type = classification if classification else "suspicious_activity"
        severity = _normalize_event_severity(str(row["severity"] or "MEDIUM"))

        attacks.append(
            {
                "id": f"alert_{row['id']}",
                "src_ip": "",
                "src_country": src_country,
                "dst_country": dst_country,
                "attack_type": attack_type,
                "severity": severity,
                "timestamp": _normalize_ts(str(row["timestamp"] or "")),
                "source": {"lat": src_lat, "lon": src_lon, "label": src_country, "ip": ""},
                "target": {"lat": dst_lat, "lon": dst_lon, "label": dst_country, "ip": ""},
                "arc": _curved_arc_control(src_lat, src_lon, dst_lat, dst_lon),
                "mitre_technique": "",
                "mitre_label": "",
                "related_alert_ids": [str(row["id"])],
                "target_sector": _sector_from_context(str(row["alert_type"] or ""), indicator, ""),
                "title": str(row["alert_type"] or "Alert Event"),
                "threat_actor": None,
                "kind": "alert",
            }
        )

    with get_conn() as conn:
        attacks.extend(
            load_recent_simulation_attacks(
                conn,
                limit=max(20, safe_limit // 2),
                window_minutes=safe_window,
                organization_id=organization_id,
            )
        )

    # Seed showcase events if dataset is sparse (for demo UX continuity).
    if len(attacks) < 8:
        showcase = [
            ("Russia", "United States", "brute_force", "HIGH"),
            ("China", "Germany", "exploit_attempt", "CRITICAL"),
            ("Brazil", "United Kingdom", "phishing_campaign", "MEDIUM"),
        ]
        for i, (src_c, dst_c, typ, sev) in enumerate(showcase, start=1):
            src_lat, src_lon = COUNTRY_POINTS[src_c]
            dst_lat, dst_lon = COUNTRY_POINTS[dst_c]
            attacks.append(
                {
                    "id": f"demo_showcase_{i}",
                    "src_ip": "",
                    "src_country": src_c,
                    "dst_country": dst_c,
                    "attack_type": typ,
                    "severity": sev,
                    "timestamp": _normalize_ts(str(time.strftime("%Y-%m-%d %H:%M:%S"))),
                    "source": {"lat": src_lat, "lon": src_lon, "label": src_c, "ip": ""},
                    "target": {"lat": dst_lat, "lon": dst_lon, "label": dst_c, "ip": ""},
                    "arc": _curved_arc_control(src_lat, src_lon, dst_lat, dst_lon),
                    "mitre_technique": "",
                    "mitre_label": "",
                    "related_alert_ids": [],
                    "target_sector": "Enterprise",
                    "title": typ.replace("_", " ").title(),
                    "threat_actor": None,
                    "kind": "demo",
                }
            )

    attacks.sort(key=lambda a: str(a.get("timestamp") or ""), reverse=True)
    attacks = attacks[:safe_limit]

    # Approximate attacks/minute in selected window.
    apm = round(len(attacks) / max(1, safe_window), 2)
    top_attacking_countries = _compute_top_counts([str(a.get("src_country") or "Unknown") for a in attacks], top_n=6)
    most_targeted_sectors = _compute_top_counts([str(a.get("target_sector") or "Unknown") for a in attacks], top_n=6)
    top_attack_types = _compute_top_counts([str(a.get("attack_type") or "unknown") for a in attacks], top_n=6)

    severity_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for attack in attacks:
        sev = _normalize_event_severity(str(attack.get("severity") or "MEDIUM"))
        if sev == "INFO":
            sev = "LOW"
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "generated_at": _normalize_ts(str(time.strftime("%Y-%m-%d %H:%M:%S"))),
        "window_minutes": safe_window,
        "attacks_per_minute": apm,
        "total_attacks": len(attacks),
        "severity_counts": severity_counts,
        "top_attacking_countries": top_attacking_countries,
        "most_targeted_sectors": most_targeted_sectors,
        "top_attack_types": top_attack_types,
        "attacks": attacks,
    }


def _build_attack_investigation_details(attack_id: str) -> dict[str, object]:
    if attack_id.startswith("threat_"):
        threat_id = attack_id.replace("threat_", "", 1)
        with get_conn() as conn:
            threat = conn.execute("SELECT * FROM threats WHERE id=?", (threat_id,)).fetchone()
            if not threat:
                raise HTTPException(status_code=404, detail="Attack not found")

            incidents = conn.execute(
                "SELECT * FROM incidents WHERE threat_id=? ORDER BY created_at DESC LIMIT 8",
                (threat_id,),
            ).fetchall()

            indicator_candidates = [
                str(threat["source_ip"] or ""),
                str(threat["dest_ip"] or ""),
                str(threat["indicator_domain"] or ""),
                str(threat["indicator_hash"] or ""),
            ]
            alerts: list[dict[str, object]] = []
            seen: set[str] = set()
            for ind in [x for x in indicator_candidates if x]:
                rows = conn.execute(
                    "SELECT * FROM alerts WHERE matched_indicator LIKE ? ORDER BY timestamp DESC LIMIT 8",
                    (f"%{ind}%",),
                ).fetchall()
                for row in rows:
                    aid = str(row["id"])
                    if aid in seen:
                        continue
                    seen.add(aid)
                    alerts.append(
                        {
                            "id": aid,
                            "type": str(row["alert_type"] or "alert"),
                            "severity": str(row["severity"] or "MEDIUM"),
                            "classification": str(row["attack_classification"] or ""),
                            "matched_indicator": str(row["matched_indicator"] or ""),
                            "timestamp": _normalize_ts(str(row["timestamp"] or "")),
                        }
                    )

            mitre = str(threat["mitre_technique"] or "")
            mitre_obj = { # type: ignore
                "technique": mitre,
                "label": MITRE_LABELS.get(mitre.upper(), ""),
                "playbook_steps": MITRE_PLAYBOOKS.get(mitre.upper(), []),
            }

            attribution = None
            if incidents:
                row = conn.execute(
                    "SELECT * FROM incident_attributions WHERE incident_id=? ORDER BY created_at DESC LIMIT 1",
                    (str(incidents[0]["id"]),),
                ).fetchone()
                if row:
                    attribution = {
                        "possible_actor": row["possible_actor"],
                        "confidence": row["confidence"],
                    }

        return {
            "attack_id": attack_id,
            "incident_details": [
                {
                    "id": str(i["id"]),
                    "title": str(i["title"] or "Incident"),
                    "severity": str(i["severity"] or "MEDIUM"),
                    "status": str(i["status"] or "open"),
                    "created_at": _normalize_ts(str(i["created_at"] or "")),
                }
                for i in incidents
            ],
            "related_alerts": alerts,
            "mitre_mapping": mitre_obj,
            "attribution": attribution,
        }

    if attack_id.startswith("alert_"):
        alert_id = attack_id.replace("alert_", "", 1)
        with get_conn() as conn:
            alert = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
            if not alert:
                raise HTTPException(status_code=404, detail="Attack not found")
            indicator = str(alert["matched_indicator"] or "")
            threat_rows = conn.execute(
                "SELECT * FROM threats WHERE source_ip LIKE ? OR dest_ip LIKE ? OR indicator_domain LIKE ? OR indicator_hash LIKE ? ORDER BY timestamp DESC LIMIT 5",
                (f"%{indicator}%", f"%{indicator}%", f"%{indicator}%", f"%{indicator}%"),
            ).fetchall()

        mitre_technique = ""
        if threat_rows:
            mitre_technique = str(threat_rows[0]["mitre_technique"] or "")

        return {
            "attack_id": attack_id,
            "incident_details": [],
            "related_alerts": [
                {
                    "id": str(alert["id"]),
                    "type": str(alert["alert_type"] or "alert"),
                    "severity": str(alert["severity"] or "MEDIUM"),
                    "classification": str(alert["attack_classification"] or ""),
                    "matched_indicator": indicator,
                    "timestamp": _normalize_ts(str(alert["timestamp"] or "")),
                }
            ],
            "mitre_mapping": {
                "technique": mitre_technique,
                "label": MITRE_LABELS.get(mitre_technique.upper(), ""),
                "playbook_steps": MITRE_PLAYBOOKS.get(mitre_technique.upper(), []),
            },
            "attribution": None,
        }

    if attack_id.startswith("sim_evt_"):
        with get_conn() as conn:
            try:
                return build_simulation_attack_details(conn, attack_id)
            except ValueError as exc:
                raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Demo fallback
    return {
        "attack_id": attack_id,
        "incident_details": [],
        "related_alerts": [],
        "mitre_mapping": {"technique": "", "label": "", "playbook_steps": []},
        "attribution": None,
    }


def _extract_indicator_value(matched_indicator: Optional[str]) -> Optional[str]:
    if not matched_indicator:
        return None
    text = str(matched_indicator)
    if ":" not in text:
        return text
    return text.split(":", 1)[1]


def _extract_indicator_type_and_value(matched_indicator: Optional[str]) -> tuple[str, str]:
    if not matched_indicator:
        return "", ""
    text = str(matched_indicator).strip()
    if ":" not in text:
        return "", text
    p0, p1 = text.split(":", 1)
    return p0.strip().lower(), p1.strip()


def _upsert_indicator_with_conn(
    conn: sqlite3.Connection,
    *,
    ind_type: str,
    value: str,
    source: str,
    confidence: float,
) -> None:
    conn.execute(
        """INSERT INTO indicators (type, value, source, confidence_score, last_seen)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(type, value) DO UPDATE SET
               source=excluded.source,
               confidence_score=excluded.confidence_score,
               last_seen=datetime('now')""",
        (ind_type, value, source, confidence),
    )


def _ensure_default_feed_sources(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) FROM threat_feed_sources").fetchone()[0]
    if int(existing or 0) > 0:
        return
    for src in DEFAULT_FEED_SOURCES:
        conn.execute(
            """INSERT INTO threat_feed_sources (
                id, name, indicator_type, reliability, items_json, is_enabled,
                ingest_interval_minutes, last_status
            ) VALUES (?, ?, ?, ?, ?, 1, 30, 'seeded')""",
            (
                str(src.get("source_id") or ""),
                str(src.get("name") or "Threat Feed"),
                str(src.get("indicator_type") or ""),
                float(src.get("reliability") or 0.7),
                json.dumps(list(src.get("items") or [])),
            ),
        )


def _load_enabled_feed_sources(conn: sqlite3.Connection) -> list[dict[str, object]]:
    rows = conn.execute(
        """SELECT * FROM threat_feed_sources
           WHERE is_enabled=1
           ORDER BY name ASC"""
    ).fetchall()
    sources: list[dict[str, object]] = []
    for r in rows:
        try:
            items = json.loads(str(r["items_json"] or "[]"))
        except Exception:
            items = []
        feed_url = str(r["feed_url"] or "") if "feed_url" in r.keys() else ""
        sources.append(
            {
                "source_id": str(r["id"] or ""),
                "name": str(r["name"] or "Threat Feed"),
                "indicator_type": str(r["indicator_type"] or ""),
                "reliability": float(r["reliability"] or 0.7),
                "items": list(items) if isinstance(items, list) else [], # pyright: ignore[reportUnknownArgumentType]
                "enabled": True,
            }
        )
        if feed_url:
            sources[-1]["feed_url"] = feed_url
            sources[-1]["feed_format"] = str(r["indicator_type"] or "txt")
    if not sources:
        return list(DEFAULT_FEED_SOURCES)
    return sources


def _run_threat_feed_aggregation(trigger: str = "manual") -> dict[str, object]:
    run_id = str(uuid.uuid4())
    with get_conn() as conn:
        sources = _load_enabled_feed_sources(conn)
        aggregated = aggregate_threat_feeds(sources)

        ingested = 0
        breakdown = {"ip": 0, "domain": 0, "hash": 0}

        # ── Re-fetch URL-based feed sources ─────────────────────────────────
        import urllib.request as _ureq
        import re as _re2
        for src in sources:
            feed_url = str(src.get("feed_url") or "")
            if not feed_url:
                continue
            fmt = str(src.get("feed_format") or "txt").lower()
            src_label = feed_url[:120]
            try:
                req_obj = _ureq.Request(feed_url, headers={"User-Agent": "ThreatIntelAggregator/1.0"})  # nosec
                with _ureq.urlopen(req_obj, timeout=15) as resp:  # nosec
                    raw = resp.read(2 * 1024 * 1024).decode("utf-8", errors="replace")
            except Exception:
                continue
            if fmt == "stix":
                try:
                    feed_data = json.loads(raw)
                    for obj in (feed_data.get("objects", []) if isinstance(feed_data, dict) else []):
                        if not isinstance(obj, dict) or obj.get("type") != "indicator":
                            continue
                        pattern = str(obj.get("pattern") or "")
                        for ip in _re2.findall(r"\[ipv4-addr:value\s*=\s*'([^']+)'\]", pattern):
                            _upsert_indicator_with_conn(conn, ind_type="ip", value=ip, source=src_label, confidence=0.8)
                            ingested += 1; breakdown["ip"] = breakdown.get("ip", 0) + 1
                        for dom in _re2.findall(r"\[domain-name:value\s*=\s*'([^']+)'\]", pattern):
                            _upsert_indicator_with_conn(conn, ind_type="domain", value=dom, source=src_label, confidence=0.8)
                            ingested += 1; breakdown["domain"] = breakdown.get("domain", 0) + 1
                        for h in _re2.findall(r"\[file:hashes\.'[^']+'\s*=\s*'([a-fA-F0-9]{32,64})'\]", pattern):
                            _upsert_indicator_with_conn(conn, ind_type="hash", value=h, source=src_label, confidence=0.85)
                            ingested += 1; breakdown["hash"] = breakdown.get("hash", 0) + 1
                except Exception:
                    pass
            elif fmt == "csv":
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 2 and parts[0].lower() in ("ip", "domain", "hash", "url"):
                        it, val = parts[0].lower(), parts[1]
                        conf = float(parts[2]) if len(parts) >= 3 else 0.7
                        _upsert_indicator_with_conn(conn, ind_type=it, value=val, source=src_label, confidence=conf)
                        ingested += 1; breakdown[it] = breakdown.get(it, 0) + 1
            else:  # txt
                ip_re = _re2.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
                hash_re = _re2.compile(r"^[a-fA-F0-9]{32,64}$")
                domain_re = _re2.compile(r"^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
                url_re2 = _re2.compile(r"^https?://")
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if ip_re.match(line):
                        it = "ip"
                    elif url_re2.match(line):
                        it = "url"
                    elif hash_re.match(line):
                        it = "hash"
                    elif domain_re.match(line):
                        it = "domain"
                    else:
                        continue
                    _upsert_indicator_with_conn(conn, ind_type=it, value=line, source=src_label, confidence=0.7)
                    ingested += 1; breakdown[it] = breakdown.get(it, 0) + 1

        # ── In-memory aggregated indicators from default/seeded sources ──────
        for ind in list(aggregated.get("indicators") or []):
            if not isinstance(ind, dict):
                continue
            ind_type = str(ind.get("type") or "").strip().lower() # pyright: ignore[reportUnknownMemberType, reportUnknownMemberType, reportUnknownArgumentType]
            value = str(ind.get("value") or "").strip() # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType]
            source = str(ind.get("source") or "threat_feed") # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType]
            confidence = float(ind.get("confidence") or 0.7) # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType] # pyright: ignore[reportUnknownArgumentType]
            ai_relevance = float(ind.get("ai_relevance") or confidence) # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
            source_id = str(ind.get("source_id") or source.lower().replace(" ", "_")) # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
            enrichment = ind.get("enrichment") or {} # type: ignore # pyright: ignore[reportUnknownVariableType]

            if not ind_type or not value:
                continue

            _upsert_indicator_with_conn(
                conn,
                ind_type=ind_type,
                value=value,
                source=source,
                confidence=confidence,
            )
            conn.execute(
                """INSERT INTO indicator_enrichment (
                    indicator_type, value, source_id, ai_relevance, enrichment_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(indicator_type, value, source_id) DO UPDATE SET
                    ai_relevance=excluded.ai_relevance,
                    enrichment_json=excluded.enrichment_json,
                    updated_at=datetime('now')""",
                (ind_type, value, source_id, ai_relevance, json.dumps(enrichment)),
            )
            ingested += 1
            breakdown[ind_type] = breakdown.get(ind_type, 0) + 1

        conn.execute(
            """INSERT INTO threat_feed_runs (
                id, trigger_mode, status, indicators_ingested,
                breakdown_json, summary_json, completed_at
            ) VALUES (?, ?, 'completed', ?, ?, ?, datetime('now'))""",
            (
                run_id,
                trigger,
                ingested,
                json.dumps(breakdown),
                json.dumps({
                    "sources": aggregated.get("sources", []),
                    "total_indicators": aggregated.get("total_indicators", 0),
                }),
            ),
        )
        for src in sources:
            conn.execute(
                """UPDATE threat_feed_sources
                   SET last_run_at=datetime('now'), last_status='completed'
                   WHERE id=?""",
                (str(src.get("source_id") or ""),),
            )
        conn.commit()

    queue_broadcast(
        "threat_intel_aggregated",
        {
            "run_id": run_id,
            "trigger_mode": trigger,
            "ingested": ingested,
            "breakdown": breakdown,
        },
    )
    return {
        "run_id": run_id,
        "trigger_mode": trigger,
        "ingested": ingested,
        "breakdown": breakdown,
        "status": "completed",
    }


async def _threat_feed_auto_loop() -> None:
    while True:
        try:
            with get_conn() as conn:
                enabled_row = conn.execute(
                    "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_enabled'"
                ).fetchone()
                interval_row = conn.execute(
                    "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_interval_minutes'"
                ).fetchone()
                enabled = str(enabled_row["config_value"] if enabled_row else "true").strip().lower() in {"1", "true", "yes", "on"}
                interval_minutes = int(str(interval_row["config_value"] if interval_row else "30") or "30")

                last_run = conn.execute(
                    "SELECT completed_at FROM threat_feed_runs ORDER BY completed_at DESC LIMIT 1"
                ).fetchone()

            if enabled:
                should_run = False
                if not last_run or not last_run["completed_at"]:
                    should_run = True
                else:
                    with get_conn() as conn:
                        diff_row = conn.execute(
                            "SELECT CAST((julianday('now') - julianday(?)) * 24 * 60 AS INTEGER)",
                            (str(last_run["completed_at"]),),
                        ).fetchone()
                    elapsed = int(diff_row[0] or 0) if diff_row else 0
                    should_run = elapsed >= max(5, interval_minutes)

                if should_run:
                    await asyncio.to_thread(_run_threat_feed_aggregation, "auto")
        except Exception:
            # Keep loop resilient; status remains available via API runs.
            pass

        await asyncio.sleep(60)


def _build_investigation_enrichment(
    conn: sqlite3.Connection,
    *,
    incident_id: Optional[str] = None,
    limit: int = 30,
) -> dict[str, object]:
    indicator_keys: set[tuple[str, str]] = set()
    focus_incident = None
    if incident_id:
        focus_incident = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
        if not focus_incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        threat_row = None
        if focus_incident["threat_id"]:
            threat_row = conn.execute("SELECT * FROM threats WHERE id=?", (focus_incident["threat_id"],)).fetchone()

        for key, ind_type in [("source_ip", "ip"), ("dest_ip", "ip"), ("indicator_domain", "domain"), ("indicator_hash", "hash")]:
            if threat_row and threat_row[key]:
                indicator_keys.add((ind_type, str(threat_row[key]).strip().lower() if ind_type != "ip" else str(threat_row[key]).strip()))

        incident_alerts = _incident_alerts_by_correlation(conn, focus_incident, threat_row, limit=max(20, limit))
        for item in incident_alerts:
            t, v = _extract_indicator_type_and_value(str(item.get("matched_indicator") or ""))
            if t and v:
                indicator_keys.add((t, v.strip().lower() if t != "ip" else v.strip()))
    else:
        alerts = conn.execute("SELECT matched_indicator FROM alerts ORDER BY timestamp DESC LIMIT 120").fetchall()
        for row in alerts:
            t, v = _extract_indicator_type_and_value(str(row["matched_indicator"] or ""))
            if t and v:
                indicator_keys.add((t, v.strip().lower() if t != "ip" else v.strip()))

    matches: list[dict[str, object]] = []
    for ind_type, value in list(indicator_keys)[: max(40, limit * 2)]:
        ind_row = conn.execute(
            "SELECT * FROM indicators WHERE type=? AND value=?",
            (ind_type, value),
        ).fetchone()
        if not ind_row:
            continue

        enr_rows = conn.execute(
            """SELECT * FROM indicator_enrichment
               WHERE indicator_type=? AND value=?
               ORDER BY ai_relevance DESC LIMIT 5""",
            (ind_type, value),
        ).fetchall()

        enrichment_items = []
        best_score = 0.0
        for er in enr_rows:
            try:
                ejson = json.loads(str(er["enrichment_json"] or "{}"))
            except Exception:
                ejson = {}
            score = float(er["ai_relevance"] or 0.0)
            best_score = max(best_score, score)
            enrichment_items.append( # type: ignore
                {
                    "source_id": str(er["source_id"] or ""),
                    "ai_relevance": round(score, 2),
                    "details": ejson,
                    "updated_at": str(er["updated_at"] or ""),
                }
            )

        if enrichment_items:
            matches.append(
                {
                    "type": ind_type,
                    "value": value,
                    "source": str(ind_row["source"] or ""),
                    "confidence_score": float(ind_row["confidence_score"] or 0.0),
                    "best_ai_relevance": round(best_score, 2),
                    "enrichment": enrichment_items,
                }
            )

    matches.sort(key=lambda m: float(m.get("best_ai_relevance") or 0), reverse=True) # type: ignore # pyright: ignore[reportArgumentType]
    top_matches = matches[:limit]

    return {
        "incident_id": incident_id,
        "matched_indicators": top_matches,
        "count": len(top_matches),
        "summary": {
            "high_priority": len([m for m in top_matches if float(m.get("best_ai_relevance") or 0) >= 0.85]), # type: ignore
            "medium_priority": len([m for m in top_matches if 0.65 <= float(m.get("best_ai_relevance") or 0) < 0.85]), # type: ignore
            "low_priority": len([m for m in top_matches if float(m.get("best_ai_relevance") or 0) < 0.65]), # pyright: ignore[reportArgumentType]
        },
    }


MITRE_LABELS: dict[str, str] = {
    "T1566": "Phishing",
    "T1059": "Command and Scripting Interpreter",
    "T1078": "Valid Accounts",
    "T1027": "Obfuscated/Compressed Files",
    "T1190": "Exploit Public-Facing Application",
    "T1133": "External Remote Services",
    "T1547": "Boot/Logon Autostart Execution",
    "T1053": "Scheduled Task/Job",
    "T1548": "Abuse Elevation Control Mechanism",
    "T1055": "Process Injection",
    "T1562": "Impair Defenses",
    "T1070": "Indicator Removal",
    "T1021": "Remote Services",
    "T1570": "Lateral Tool Transfer",
    "T1071": "Application Layer Protocol",
    "T1048": "Exfiltration Over Alternative Protocol",
    "T1567": "Exfiltration Over Web Service",
    "T1486": "Data Encrypted for Impact",
    "T1489": "Service Stop",
}

MITRE_KILL_CHAIN: list[dict[str, object]] = [
    {"phase": "Reconnaissance", "techniques": ["T1595", "T1592", "T1589"]},
    {"phase": "Initial access", "techniques": ["T1566", "T1190", "T1133", "T1078"]},
    {"phase": "Execution", "techniques": ["T1059", "T1053", "T1547"]},
    {"phase": "Persistence", "techniques": ["T1547", "T1053", "T1078"]},
    {"phase": "Privilege escalation", "techniques": ["T1548", "T1055", "T1078"]},
    {"phase": "Defense evasion", "techniques": ["T1562", "T1070", "T1027"]},
    {"phase": "Lateral movement", "techniques": ["T1021", "T1570"]},
    {"phase": "Collection", "techniques": ["T1005", "T1074"]},
    {"phase": "Command and control", "techniques": ["T1071"]},
    {"phase": "Data exfiltration", "techniques": ["T1048", "T1567"]},
    {"phase": "Impact", "techniques": ["T1486", "T1489"]},
]


def _event_phase(event_type: str, description: str) -> str:
    text = f"{event_type} {description}".lower()
    if any(k in text for k in ["recon", "scanning", "enumerat"]):
        return "Reconnaissance"
    if any(k in text for k in ["phishing", "initial", "email", "link_clicked", "received", "exploit_public"]):
        return "Initial access"
    if any(k in text for k in ["credential", "command", "script", "execution", "privilege"]):
        return "Execution"
    if any(k in text for k in ["persist", "autostart", "scheduled_task", "boot", "registry"]):
        return "Persistence"
    if any(k in text for k in ["elevat", "priv_esc", "escalat"]):
        return "Privilege escalation"
    if any(k in text for k in ["evasion", "impair", "disable", "tamper", "obfuscat"]):
        return "Defense evasion"
    if any(k in text for k in ["lateral", "pivot", "movement", "east-west", "remote_service"]):
        return "Lateral movement"
    if any(k in text for k in ["collect", "stage", "keylog", "screen_cap"]):
        return "Collection"
    if any(k in text for k in ["c2", "beacon", "command_control", "callback"]):
        return "Command and control"
    if any(k in text for k in ["exfil", "egress", "download", "staging", "data"]):
        return "Data exfiltration"
    if any(k in text for k in ["ransom", "encrypt", "wipe", "destroy", "impact"]):
        return "Impact"
    return "Investigation"


def _bookmark_moments(events: list[dict[str, object]]) -> list[dict[str, object]]:
    wanted = ["Initial access", "Lateral movement", "Data exfiltration"]
    found: list[dict[str, object]] = []
    for phase in wanted:
        match = next((e for e in events if str(e.get("phase")) == phase), None)
        if match:
            found.append(
                {
                    "phase": phase,
                    "step": int(match.get("step") or 1), # type: ignore
                    "timestamp": str(match.get("timestamp") or ""),
                    "title": str(match.get("title") or phase),
                }
            )
    return found


def _timeline_json_for_export(incident_id: str, replay: dict[str, object]) -> dict[str, object]:
    timeline: list[dict[str, object]] = []
    for ev in replay.get("events", []): # type: ignore
        if not isinstance(ev, dict):
            continue
        timeline.append(
            {
                "time": str(ev.get("timestamp") or "")[-9:-1] if ev.get("timestamp") else "", # pyright: ignore[reportUnknownMemberType] # type: ignore
                "event": ev.get("type"), # type: ignore
                "phase": ev.get("phase"), # type: ignore
                "user": ev.get("actor"), # type: ignore
                "source_ip": ev.get("src_ip"), # type: ignore
                "target_asset": ev.get("asset"), # pyright: ignore[reportUnknownMemberType]
                "associated_alert": ev.get("associated_alert"), # type: ignore
                "related_indicator": ev.get("related_indicator") or ev.get("indicator"), # type: ignore
            }
        )
    return {"incident_id": incident_id, "timeline": timeline}


def _simple_pdf_bytes(title: str, lines: list[str]) -> bytes:
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    content_lines = ["BT /F1 11 Tf 50 780 Td 14 TL"]
    content_lines.append(f"({title.replace('(', '[').replace(')', ']')}) Tj T*")
    for line in escaped:
        content_lines.append(f"({line[:120]}) Tj T*")
    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj\n")
    objects.append(f"5 0 obj << /Length {len(content)} >> stream\n".encode("ascii") + content + b"\nendstream endobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    xref_positions = [0]
    for obj in objects:
        xref_positions.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for pos in xref_positions[1:]:
        pdf.extend(f"{pos:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


def _build_incident_replay(conn: sqlite3.Connection, incident_id: str) -> Optional[dict[str, object]]:
    incident = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    if not incident:
        return None

    events: list[dict[str, object]] = []
    events.append(
        {
            "timestamp": _normalize_ts(str(incident["created_at"] or "")),
            "type": "incident_created",
            "title": str(incident["title"]),
            "description": str(incident["description"] or "Incident created"),
            "actor": "system",
            "severity": str(incident["severity"] or "MEDIUM"),
            "phase": "Initial access",
        }
    )

    timeline_rows = conn.execute(
        "SELECT * FROM incident_events WHERE incident_id=? ORDER BY timestamp ASC",
        (incident_id,),
    ).fetchall()
    for row in timeline_rows:
        events.append(
            {
                "timestamp": _normalize_ts(str(row["timestamp"] or "")),
                "type": str(row["event_type"] or "note"),
                "title": "Incident Timeline Event",
                "description": str(row["description"] or ""),
                "actor": str(row["actor"] or "system"),
                "phase": _event_phase(str(row["event_type"] or ""), str(row["description"] or "")),
            }
        )

    threat_id = incident["threat_id"]
    if threat_id:
        threat = conn.execute("SELECT * FROM threats WHERE id=?", (threat_id,)).fetchone()
        if threat:
            events.append(
                {
                    "timestamp": _normalize_ts(str(threat["timestamp"] or "")),
                    "type": "threat_detected",
                    "title": str(threat["threat_name"] or threat["type"] or "Threat"),
                    "description": str(threat["description"] or "Threat linked to incident"),
                    "actor": "sensor",
                    "indicator": str(threat["indicator_domain"] or threat["indicator_hash"] or threat["source_ip"] or ""),
                    "source_ip": str(threat["source_ip"] or ""),
                    "target_asset": str(threat["dest_ip"] or ""),
                    "related_indicator": str(threat["indicator_domain"] or threat["indicator_hash"] or threat["source_ip"] or ""),
                    "mitre_technique": str(threat["mitre_technique"] or ""),
                    "mitre_label": MITRE_LABELS.get(str(threat["mitre_technique"] or "").upper(), ""),
                    "phase": _event_phase("threat_detected", str(threat["description"] or "")),
                }
            )

            indicator_candidates = [
                threat["source_ip"],
                threat["dest_ip"],
                threat["indicator_domain"],
                threat["indicator_hash"],
            ]
            for ind in [x for x in indicator_candidates if x]:
                alert_rows = conn.execute(
                    "SELECT * FROM alerts WHERE matched_indicator LIKE ? ORDER BY timestamp ASC LIMIT 20",
                    (f"%{ind}%",),
                ).fetchall()
                for a in alert_rows:
                    events.append(
                        {
                            "timestamp": _normalize_ts(str(a["timestamp"] or "")),
                            "type": "ioc_alert",
                            "title": str(a["alert_type"] or "IOC Alert"),
                            "description": str(a["matched_indicator"] or ""),
                            "actor": "correlator",
                            "severity": str(a["severity"] or "MEDIUM"),
                            "associated_alert": str(a["id"]),
                            "related_indicator": str(a["matched_indicator"] or ""),
                            "phase": _event_phase("ioc_alert", str(a["matched_indicator"] or "")),
                        }
                    )

    events = sorted(events, key=lambda x: str(x.get("timestamp") or ""))
    for i, ev in enumerate(events, start=1):
        ev["step"] = i

    bookmarks = _bookmark_moments(events)

    return {
        "scenario_id": f"incident_{incident_id}",
        "title": f"Incident Replay: {incident['title']}",
        "kind": "incident",
        "status": str(incident["status"] or "open"),
        "severity": str(incident["severity"] or "MEDIUM"),
        "total_steps": len(events),
        "bookmarks": bookmarks,
        "events": events,
    }


def _build_alert_replay(conn: sqlite3.Connection, alert_id: str) -> Optional[dict[str, object]]:
    alert = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    if not alert:
        return None

    events: list[dict[str, object]] = []
    events.append(
        {
            "timestamp": _normalize_ts(str(alert["timestamp"] or "")),
            "type": "alert_created",
            "title": str(alert["alert_type"] or "Alert"),
            "description": str(alert["matched_indicator"] or ""),
            "actor": "correlator",
            "severity": str(alert["severity"] or "MEDIUM"),
            "associated_alert": str(alert["id"]),
            "related_indicator": str(alert["matched_indicator"] or ""),
            "phase": _event_phase("alert_created", str(alert["matched_indicator"] or "")),
        }
    )

    if alert["source_event_id"]:
        telemetry = conn.execute(
            "SELECT * FROM telemetry_events WHERE id=?",
            (alert["source_event_id"],),
        ).fetchone()
        if telemetry:
            events.append(
                {
                    "timestamp": _normalize_ts(str(telemetry["timestamp"] or "")),
                    "type": "telemetry_event",
                    "title": str(telemetry["source"] or "Telemetry"),
                    "description": str(telemetry["action"] or "event observed"),
                    "actor": "ingestor",
                    "src_ip": str(telemetry["src_ip"] or ""),
                    "dst_ip": str(telemetry["dst_ip"] or ""),
                    "asset": str(telemetry["asset"] or ""),
                    "source_ip": str(telemetry["src_ip"] or ""),
                    "target_asset": str(telemetry["asset"] or telemetry["dst_ip"] or ""),
                    "related_indicator": str(alert["matched_indicator"] or ""),
                    "phase": _event_phase("telemetry_event", str(telemetry["action"] or "")),
                }
            )

    indicator_value = _extract_indicator_value(str(alert["matched_indicator"] or ""))
    if indicator_value:
        threat_rows = conn.execute(
            """SELECT * FROM threats
               WHERE source_ip=? OR dest_ip=? OR indicator_domain=? OR indicator_hash=?
               ORDER BY timestamp ASC LIMIT 20""",
            (indicator_value, indicator_value, indicator_value, indicator_value),
        ).fetchall()
        for t in threat_rows:
            events.append(
                {
                    "timestamp": _normalize_ts(str(t["timestamp"] or "")),
                    "type": "threat_context",
                    "title": str(t["threat_name"] or t["type"] or "Threat context"),
                    "description": str(t["description"] or ""),
                    "actor": "sensor",
                    "severity": str(t["severity"] or "MEDIUM"),
                    "source_ip": str(t["source_ip"] or ""),
                    "target_asset": str(t["dest_ip"] or ""),
                    "related_indicator": str(t["indicator_domain"] or t["indicator_hash"] or t["source_ip"] or ""),
                    "mitre_technique": str(t["mitre_technique"] or ""),
                    "mitre_label": MITRE_LABELS.get(str(t["mitre_technique"] or "").upper(), ""),
                    "phase": _event_phase("threat_context", str(t["description"] or "")),
                }
            )

    events = sorted(events, key=lambda x: str(x.get("timestamp") or ""))
    for i, ev in enumerate(events, start=1):
        ev["step"] = i

    bookmarks = _bookmark_moments(events)

    return {
        "scenario_id": f"alert_{alert_id}",
        "title": f"Alert Replay: {alert['alert_type']}",
        "kind": "alert",
        "status": str(alert["analyst_status"] or "open"),
        "severity": str(alert["severity"] or "MEDIUM"),
        "total_steps": len(events),
        "bookmarks": bookmarks,
        "events": events,
    }


# ── Database ──────────────────────────────────────────────────────────────────

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, name TEXT, email TEXT,
                role TEXT, department TEXT
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS audit (
                actor_id TEXT, action TEXT, target_user_id TEXT,
                previous_role TEXT, new_role TEXT, timestamp TEXT,
                ip_address TEXT, status TEXT
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS threats (
                id TEXT PRIMARY KEY,
                threat_name TEXT,
                type TEXT,
                mitre_technique TEXT,
                severity TEXT DEFAULT 'MEDIUM',
                source_ip TEXT,
                indicator_domain TEXT,
                indicator_hash TEXT,
                dest_ip TEXT,
                description TEXT,
                timestamp TEXT DEFAULT (datetime('now')),
                status TEXT DEFAULT 'open'
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                severity TEXT DEFAULT 'MEDIUM',
                status TEXT DEFAULT 'open',
                affected_assets TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                threat_id TEXT
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS incident_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id TEXT,
                timestamp TEXT DEFAULT (datetime('now')),
                description TEXT,
                actor TEXT DEFAULT 'system',
                event_type TEXT DEFAULT 'note'
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS indicators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                value TEXT,
                source TEXT,
                confidence_score REAL DEFAULT 0.5,
                last_seen TEXT DEFAULT (datetime('now')),
                UNIQUE(type, value)
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS telemetry_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT,
                timestamp TEXT,
                src_ip TEXT,
                dst_ip TEXT,
                indicator_domain TEXT,
                indicator_hash TEXT,
                asset TEXT,
                action TEXT,
                raw_event TEXT
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                alert_type TEXT,
                severity TEXT,
                matched_indicator TEXT,
                source_event_id INTEGER,
                source_event TEXT,
                attack_classification TEXT,
                analyst_confidence REAL,
                analyst_recommendation TEXT,
                analyst_playbook_steps TEXT,
                analyst_decision_source TEXT DEFAULT 'rule_engine',
                analyst_status TEXT DEFAULT 'open',
                analyst_notes TEXT,
                analyst_assigned_to TEXT,
                analyst_triage_at TEXT,
                analyst_verdict TEXT,
                timestamp TEXT DEFAULT (datetime('now'))
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS soc_ai_dry_runs (
                id TEXT PRIMARY KEY,
                alert_id TEXT,
                rule_action TEXT,
                rule_confidence REAL,
                rule_payload TEXT,
                llm_action TEXT,
                llm_confidence REAL,
                llm_payload TEXT,
                analyst_choice TEXT,
                applied_action TEXT,
                applied_confidence REAL,
                applied_source TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        # Safe forward migration for existing DBs.
        threat_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(threats)").fetchall()
        }
        if "threat_name" not in threat_cols:
            conn.execute("ALTER TABLE threats ADD COLUMN threat_name TEXT")
        if "mitre_technique" not in threat_cols:
            conn.execute("ALTER TABLE threats ADD COLUMN mitre_technique TEXT")
        if "indicator_domain" not in threat_cols:
            conn.execute("ALTER TABLE threats ADD COLUMN indicator_domain TEXT")
        if "indicator_hash" not in threat_cols:
            conn.execute("ALTER TABLE threats ADD COLUMN indicator_hash TEXT")

        incident_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(incidents)").fetchall()
        }
        if "description" not in incident_cols:
            conn.execute("ALTER TABLE incidents ADD COLUMN description TEXT")
        if "affected_assets" not in incident_cols:
            conn.execute("ALTER TABLE incidents ADD COLUMN affected_assets TEXT")

        telemetry_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(telemetry_events)").fetchall()
        }
        if telemetry_cols and "asset" not in telemetry_cols:
            conn.execute("ALTER TABLE telemetry_events ADD COLUMN asset TEXT")
        if telemetry_cols and "indicator_domain" not in telemetry_cols:
            conn.execute("ALTER TABLE telemetry_events ADD COLUMN indicator_domain TEXT")
        if telemetry_cols and "indicator_hash" not in telemetry_cols:
            conn.execute("ALTER TABLE telemetry_events ADD COLUMN indicator_hash TEXT")

        alert_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(alerts)").fetchall()
        }
        if "attack_classification" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN attack_classification TEXT")
        if "analyst_confidence" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_confidence REAL")
        if "analyst_recommendation" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_recommendation TEXT")
        if "analyst_playbook_steps" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_playbook_steps TEXT")
        if "analyst_decision_source" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_decision_source TEXT DEFAULT 'rule_engine'")
        if "analyst_status" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_status TEXT DEFAULT 'open'")
        if "analyst_notes" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_notes TEXT")
        if "analyst_assigned_to" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_assigned_to TEXT")
        if "analyst_triage_at" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_triage_at TEXT")
        if "analyst_verdict" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN analyst_verdict TEXT")

        dry_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(soc_ai_dry_runs)").fetchall()
        }
        if dry_cols and "analyst_choice" not in dry_cols:
            conn.execute("ALTER TABLE soc_ai_dry_runs ADD COLUMN analyst_choice TEXT")
        if dry_cols and "applied_action" not in dry_cols:
            conn.execute("ALTER TABLE soc_ai_dry_runs ADD COLUMN applied_action TEXT")
        if dry_cols and "applied_confidence" not in dry_cols:
            conn.execute("ALTER TABLE soc_ai_dry_runs ADD COLUMN applied_confidence REAL")
        if dry_cols and "applied_source" not in dry_cols:
            conn.execute("ALTER TABLE soc_ai_dry_runs ADD COLUMN applied_source TEXT")
        if dry_cols and "notes" not in dry_cols:
            conn.execute("ALTER TABLE soc_ai_dry_runs ADD COLUMN notes TEXT")

        defense_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(autonomous_defense_log)").fetchall()
        }
        if defense_cols and "incident_id" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN incident_id TEXT")
        if defense_cols and "target" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN target TEXT")
        if defense_cols and "approved_by" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN approved_by TEXT")
        if defense_cols and "approval_state" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN approval_state TEXT DEFAULT 'not_required'")
        if defense_cols and "execution_mode" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN execution_mode TEXT DEFAULT 'monitor_only'")
        if defense_cols and "playbook_name" not in defense_cols:
            conn.execute("ALTER TABLE autonomous_defense_log ADD COLUMN playbook_name TEXT")

        conn.execute(
            """CREATE TABLE IF NOT EXISTS replay_annotations (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                step INTEGER NOT NULL,
                text TEXT NOT NULL,
                author TEXT DEFAULT 'analyst',
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS investigation_snapshots (
                id TEXT PRIMARY KEY,
                name TEXT,
                filters_json TEXT,
                payload_json TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS autonomous_defense_log (
                id TEXT PRIMARY KEY,
                alert_id TEXT NOT NULL,
                incident_id TEXT,
                action TEXT NOT NULL,
                target TEXT,
                confidence REAL DEFAULT 0.0,
                classification TEXT,
                executed_by TEXT DEFAULT 'analyst',
                approved_by TEXT,
                approval_state TEXT DEFAULT 'not_required',
                execution_mode TEXT DEFAULT 'monitor_only',
                playbook_name TEXT,
                rationale TEXT,
                status TEXT DEFAULT 'executed',
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS soc_cases (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT DEFAULT 'MEDIUM',
                status TEXT DEFAULT 'open',
                assigned_analyst TEXT,
                incident_id TEXT,
                org_id TEXT DEFAULT 'org_default',
                created_by TEXT DEFAULT 'system',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS case_timeline_events (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                event_type TEXT DEFAULT 'note',
                actor TEXT DEFAULT 'system',
                description TEXT,
                payload_json TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        case_cols = {row["name"] for row in conn.execute("PRAGMA table_info(soc_cases)").fetchall()}
        if case_cols and "org_id" not in case_cols:
            conn.execute("ALTER TABLE soc_cases ADD COLUMN org_id TEXT DEFAULT 'org_default'")

        conn.execute(
            """CREATE TABLE IF NOT EXISTS data_connectors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                connector_type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                config_encrypted TEXT,
                org_id TEXT DEFAULT 'org_default',
                created_by TEXT DEFAULT 'system',
                last_synced_at TEXT,
                events_ingested INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        connector_cols = {row["name"] for row in conn.execute("PRAGMA table_info(data_connectors)").fetchall()}
        if connector_cols and "org_id" not in connector_cols:
            conn.execute("ALTER TABLE data_connectors ADD COLUMN org_id TEXT DEFAULT 'org_default'")

        conn.execute(
            """CREATE TABLE IF NOT EXISTS detection_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                severity TEXT DEFAULT 'MEDIUM',
                enabled INTEGER DEFAULT 1,
                logic_json TEXT NOT NULL DEFAULT '{}',
                mitre_technique TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                org_id TEXT DEFAULT 'org_default',
                created_by TEXT DEFAULT 'system',
                hit_count INTEGER DEFAULT 0,
                last_triggered_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS platform_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT,
                updated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        # ── Forward migrations on existing tables ────────────────────────────
        # alerts: add org_id, rule_id, rule_name columns if they don't exist yet
        alert_cols = {r["name"] for r in conn.execute("PRAGMA table_info(alerts)").fetchall()}
        if "org_id" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN org_id TEXT DEFAULT 'org_default'")
        if "rule_id" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN rule_id TEXT DEFAULT NULL")
        if "rule_name" not in alert_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN rule_name TEXT DEFAULT NULL")

        # rule_event_stats: per-evaluation audit log for detection rules
        conn.execute(
            """CREATE TABLE IF NOT EXISTS rule_event_stats (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                org_id TEXT NOT NULL,
                alert_id TEXT,
                matched INTEGER DEFAULT 0,
                latency_ms REAL DEFAULT 0,
                event_source TEXT,
                event_ts TEXT,
                evaluated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS threat_feed_sources (
                id TEXT PRIMARY KEY,
                name TEXT,
                indicator_type TEXT,
                reliability REAL DEFAULT 0.7,
                feed_url TEXT,
                items_json TEXT,
                is_enabled INTEGER DEFAULT 1,
                ingest_interval_minutes INTEGER DEFAULT 30,
                last_run_at TEXT,
                last_status TEXT DEFAULT 'never'
            )"""
        )

        feed_src_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(threat_feed_sources)").fetchall()
        }
        if feed_src_cols and "feed_url" not in feed_src_cols:
            conn.execute("ALTER TABLE threat_feed_sources ADD COLUMN feed_url TEXT")

        conn.execute(
            """CREATE TABLE IF NOT EXISTS threat_feed_runs (
                id TEXT PRIMARY KEY,
                trigger_mode TEXT DEFAULT 'manual',
                status TEXT DEFAULT 'completed',
                indicators_ingested INTEGER DEFAULT 0,
                breakdown_json TEXT,
                summary_json TEXT,
                started_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS indicator_enrichment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                indicator_type TEXT,
                value TEXT,
                source_id TEXT,
                ai_relevance REAL DEFAULT 0.0,
                enrichment_json TEXT,
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(indicator_type, value, source_id)
            )"""
        )

        cfg_row = conn.execute(
            "SELECT config_value FROM defense_engine_config WHERE config_key='mode'"
        ).fetchone()
        if not cfg_row:
            conn.execute(
                "INSERT INTO defense_engine_config (config_key, config_value) VALUES ('mode', 'monitor_only')"
            )

        auto_feed_cfg = conn.execute(
            "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_enabled'"
        ).fetchone()
        if not auto_feed_cfg:
            conn.execute(
                "INSERT INTO defense_engine_config (config_key, config_value) VALUES ('threat_intel_auto_ingest_enabled', 'true')"
            )

        auto_feed_interval_cfg = conn.execute(
            "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_interval_minutes'"
        ).fetchone()
        if not auto_feed_interval_cfg:
            conn.execute(
                "INSERT INTO defense_engine_config (config_key, config_value) VALUES ('threat_intel_auto_ingest_interval_minutes', '30')"
            )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS threat_actors (
                actor_id TEXT PRIMARY KEY,
                actor_name TEXT NOT NULL,
                aliases TEXT,
                associated_malware TEXT,
                known_ips TEXT,
                known_domains TEXT,
                attack_techniques TEXT,
                target_industries TEXT,
                known_campaigns TEXT,
                historical_activity TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        conn.execute(
            """CREATE TABLE IF NOT EXISTS incident_attributions (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                possible_actor TEXT,
                confidence REAL,
                matching_techniques TEXT,
                matching_indicators TEXT,
                analysis_json TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )

        existing_actors = conn.execute("SELECT COUNT(*) FROM threat_actors").fetchone()[0]
        if existing_actors == 0:
            seed_actors = [
                (
                    "actor_apt28",
                    "APT28",
                    json.dumps(["Fancy Bear"]),
                    json.dumps(["xagent", "sofacy"]),
                    json.dumps(["45.33.12.90", "185.86.151.11"]),
                    json.dumps(["malicious-site.com", "update-security-check.net"]),
                    json.dumps(["T1566", "T1059", "T1071"]),
                    json.dumps(["government", "defense"]),
                    json.dumps(["Operation GhostWeb", "Parliament Spearphish Wave"]),
                    "Repeated spear-phishing and command execution tradecraft over multiple years.",
                ),
                (
                    "actor_lazarus",
                    "Lazarus Group",
                    json.dumps(["Hidden Cobra"]),
                    json.dumps(["wannaCry", "appleJeus"]),
                    json.dumps(["175.45.176.0", "210.52.109.22"]),
                    json.dumps(["finance-auth-update.com", "secure-ledger-sync.net"]),
                    json.dumps(["T1105", "T1041", "T1027"]),
                    json.dumps(["finance", "crypto", "telecom"]),
                    json.dumps(["Bankshot Operation", "CryptoLure Campaign"]),
                    "Infrastructure reuse patterns across malware-led operations.",
                ),
                (
                    "actor_fin7",
                    "FIN7",
                    json.dumps(["Carbanak Group"]),
                    json.dumps(["carbanak", "griffon"]),
                    json.dumps(["91.242.47.19", "46.183.221.33"]),
                    json.dumps(["invoice-review-portal.com", "payment-support-check.net"]),
                    json.dumps(["T1566", "T1021", "T1059"]),
                    json.dumps(["retail", "hospitality", "finance"]),
                    json.dumps(["POS Harvest Wave", "Executive Invoice Spearphish"]),
                    "Financially motivated campaigns with broad enterprise phishing and lateral movement.",
                ),
            ]
            conn.executemany(
                """INSERT INTO threat_actors (
                    actor_id, actor_name, aliases, associated_malware, known_ips,
                    known_domains, attack_techniques, target_industries,
                    known_campaigns, historical_activity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                seed_actors,
            )

        ensure_attack_simulation_tables(conn)

        existing_users = int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] or 0)
        if existing_users == 0:
            conn.executemany(
                "INSERT INTO users (id, name, email, role, department) VALUES (?, ?, ?, ?, ?)",
                [
                    ("user_owner", "Tenant Owner", "owner@default-soc.example", "ADMIN", "Executive"),
                    ("user_analyst", "SOC Analyst", "analyst@default-soc.example", "ANALYST", "SOC"),
                    ("user_billing", "Billing Admin", "billing@default-soc.example", "ADMIN", "Finance"),
                ],
            )
        existing_memberships = int(conn.execute("SELECT COUNT(*) FROM organization_memberships").fetchone()[0] or 0)
        if existing_memberships == 0:
            conn.executemany(
                """INSERT OR IGNORE INTO organization_memberships (
                    id, organization_id, user_id, email, display_name, role, status
                ) VALUES (?, 'org_default', ?, ?, ?, ?, 'active')""",
                [
                    ("mem_owner", "user_owner", "owner@default-soc.example", "Tenant Owner", "OWNER"),
                    ("mem_analyst", "user_analyst", "analyst@default-soc.example", "SOC Analyst", "ANALYST"),
                    ("mem_billing", "user_billing", "billing@default-soc.example", "Billing Admin", "BILLING_ADMIN"),
                ],
            )

        _ensure_default_feed_sources(conn)

        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI): # type: ignore
    global threat_feed_auto_task
    init_db()

    # ── Start async streaming workers ─────────────────────────────────────────
    _shutdown_event = asyncio.Event()
    _worker_tasks = [
        asyncio.create_task(
            run_rule_evaluation_worker(_shutdown_event),
            name="worker:rule_evaluation",
        ),
        asyncio.create_task(
            run_alert_generation_worker(_shutdown_event),
            name="worker:alert_generation",
        ),
        asyncio.create_task(
            run_graph_update_worker(_shutdown_event),
            name="worker:graph_update",
        ),
    ]
    _logging.getLogger("soc_api").info(
        "Streaming workers started: %s",
        ", ".join(t.get_name() for t in _worker_tasks),
    )

    threat_feed_auto_task = asyncio.create_task(_threat_feed_auto_loop())
    try:
        yield
    finally:
        # Signal workers to drain and stop
        _shutdown_event.set()
        for task in _worker_tasks:
            task.cancel()
        await asyncio.gather(*_worker_tasks, return_exceptions=True)

        if threat_feed_auto_task:
            threat_feed_auto_task.cancel()
            try:
                await threat_feed_auto_task
            except asyncio.CancelledError:
                pass
            threat_feed_auto_task = None


app = FastAPI(lifespan=lifespan) # type: ignore

app.add_middleware( # type: ignore
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Org-Id", "X-User-Role", "X-User-Id"],
)

# Ensure schema exists for non-lifespan entrypoints (e.g., scripts/TestClient without context manager).
init_db()

# ── Logger ────────────────────────────────────────────────────────────────────
_SOC_LOG = _logging.getLogger("soc_api")
if not _SOC_LOG.handlers:
    _h = _logging.StreamHandler()
    _h.setFormatter(_logging.Formatter("%(message)s"))
    _SOC_LOG.addHandler(_h)
_SOC_LOG.setLevel(_logging.INFO)

# ── Tenant guard middleware ───────────────────────────────────────────────────
# Runs INSIDE the logging middleware so rejections are always logged.
# Guarded path prefixes require X-Org-Id. X-User-Role is validated when present.
_GUARDED_PREFIXES = ("/api/cases", "/api/connectors", "/api/risk", "/api/rules")
_SKIP_GUARD_METHODS = {"OPTIONS"}
_SKIP_GUARD_EXACT = {"/api/connectors/types"}
_VALID_ROLES = {"OWNER", "ADMIN", "BILLING_ADMIN", "ANALYST", "VIEWER"}


@app.middleware("http") # type: ignore
async def tenant_guard_middleware(request: Request, call_next: Callable[[Request], Awaitable[_StarletteResponse]]) -> _StarletteResponse:  # type: ignore
    path = request.url.path
    method = request.method

    if method not in _SKIP_GUARD_METHODS and path not in _SKIP_GUARD_EXACT:
        if any(path.startswith(p) for p in _GUARDED_PREFIXES):
            org_id = request.headers.get("X-Org-Id", "").strip()
            user_role = request.headers.get("X-User-Role", "").strip()

            if not org_id:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "X-Org-Id header is required for this endpoint"},
                )
            if user_role and user_role not in _VALID_ROLES:
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"Invalid X-User-Role '{user_role}'. Must be one of {sorted(_VALID_ROLES)}"},
                )

            # Attach resolved context to request state for use in route handlers
            request.state.org_id = org_id
            request.state.user_role = user_role or "VIEWER"
            request.state.user_id = request.headers.get("X-User-Id", "unknown").strip()

    return await call_next(request)


# ── Request logging middleware ────────────────────────────────────────────────
# Outermost middleware: logs every request including guard rejections.

@app.middleware("http") # type: ignore
async def request_logging_middleware(request: Request, call_next: Callable[[Request], Awaitable[_StarletteResponse]]) -> _StarletteResponse:  # type: ignore
    start = time.monotonic()
    response = await call_next(request)
    elapsed_ms = round((time.monotonic() - start) * 1000)
    _SOC_LOG.info(
        "[%s] %s %s | org=%s role=%s user=%s | status=%d %dms",
        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        request.method,
        request.url.path,
        request.headers.get("X-Org-Id", "-"),
        request.headers.get("X-User-Role", "-"),
        request.headers.get("X-User-Id", "-"),
        response.status_code,
        elapsed_ms,
    )
    return response


# ── RBAC / tenant helpers ─────────────────────────────────────────────────────
# Call these at the top of every guarded route handler.

_WRITE_ROLES: frozenset[str] = frozenset({"OWNER", "ADMIN"})
_CASE_WRITE_ROLES: frozenset[str] = frozenset({"OWNER", "ADMIN", "ANALYST"})
_CONNECTOR_WRITE_ROLES: frozenset[str] = frozenset({"OWNER", "ADMIN", "BILLING_ADMIN"})
_CONNECTOR_READ_ROLES: frozenset[str] = frozenset({"OWNER", "ADMIN", "BILLING_ADMIN", "ANALYST", "VIEWER"})
_ALL_ROLES: frozenset[str] = _CONNECTOR_READ_ROLES


def _require_role(request: Request, allowed: frozenset[str]) -> None:  # type: ignore
    """Raise 403 if the request's role is not in *allowed*."""
    role = getattr(request.state, "user_role", "VIEWER")
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{role}' is not permitted for this operation. Required: {sorted(allowed)}",
        )


def _org_from_request(request: Request) -> str:  # type: ignore
    """Return the org_id validated by tenant_guard_middleware."""
    return getattr(request.state, "org_id", request.headers.get("X-Org-Id", "org_default")).strip() or "org_default"


# ── Pydantic models ───────────────────────────────────────────────────────────

class ThreatIn(BaseModel): # type: ignore
    threat_name: str
    type: str
    mitre_technique: Optional[str] = None
    severity: str = "MEDIUM"
    source_ip: Optional[str] = None
    indicator_domain: Optional[str] = None
    indicator_hash: Optional[str] = None
    dest_ip: Optional[str] = None
    description: str


class IncidentIn(BaseModel): # pyright: ignore[reportUntypedBaseClass]
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM"
    status: str = "open"
    affected_assets: list[str] = []
    threat_id: Optional[str] = None


class IncidentEventIn(BaseModel): # type: ignore
    description: str
    actor: str = "system"
    event_type: str = "note"


class TelemetryIn(BaseModel): # type: ignore
    source: str
    timestamp: str
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    indicator_domain: Optional[str] = None
    indicator_hash: Optional[str] = None
    asset: Optional[str] = None
    action: Optional[str] = None


class AlertIn(BaseModel): # type: ignore
    alert_type: str
    severity: str
    matched_indicator: str
    source_event: dict[str, object]
    source_event_id: Optional[int] = None


class SocAiDryRunIn(BaseModel): # type: ignore
    alert_id: str


class SocAiDecisionApplyIn(BaseModel): # type: ignore
    choice: str  # rule_engine | llm | none
    notes: Optional[str] = None


class ThreatAttributionAnalyzeIn(BaseModel): # type: ignore
    incident_id: str


class ThreatIntelActorImportItem(BaseModel): # type: ignore
    actor_name: str
    aliases: list[str] = []
    associated_malware: list[str] = []
    known_ips: list[str] = []
    known_domains: list[str] = []
    attack_techniques: list[str] = []
    target_industries: list[str] = []
    known_campaigns: list[str] = []
    historical_activity: str = ""


class ThreatIntelImportIn(BaseModel): # type: ignore
    actors: list[ThreatIntelActorImportItem] = []
    feed_url: Optional[str] = None
    feed_format: str = "stix"  # stix | csv | txt


class ThreatIntelSearchIn(BaseModel): # type: ignore
    indicator: str
    indicator_type: Optional[str] = None  # ip, domain, hash, url


class ThreatIntelAggregatorAutoConfigIn(BaseModel): # type: ignore
    enabled: bool = True
    interval_minutes: int = 30


class ThreatIntelAggregatorRunIn(BaseModel): # type: ignore
    trigger_mode: str = "manual"


class AlertTriageIn(BaseModel): # type: ignore
    verdict: str  # true_positive | false_positive | escalated | inconclusive | benign
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class CaseCreateIn(BaseModel): # type: ignore
    title: str
    description: str = ""
    severity: str = "MEDIUM"
    status: str = "open"
    assigned_analyst: str = ""
    incident_id: Optional[str] = None
    org_id: str = "org_default"
    created_by: str = "analyst"


class CasePatchIn(BaseModel): # type: ignore
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None


class CaseNoteIn(BaseModel): # type: ignore
    text: str
    author: str = "analyst"


class ConnectorCreateIn(BaseModel): # type: ignore
    name: str
    connector_type: str
    config: dict[str, object] = {}
    org_id: str = "org_default"
    created_by: str = "analyst"


class ConnectorPatchIn(BaseModel): # type: ignore
    name: Optional[str] = None
    status: Optional[str] = None
    config: Optional[dict[str, object]] = None


class OrganizationCreateIn(BaseModel): # type: ignore
    name: str
    slug: Optional[str] = None
    plan_code: str = "pro"


class OrganizationMembershipIn(BaseModel): # type: ignore
    user_id: str
    email: str = ""
    display_name: str = ""
    role: str = "VIEWER"


class BillingSubscriptionUpsertIn(BaseModel): # type: ignore
    plan_code: str = "pro"
    status: str = "active"
    seats: int = 5
    price_monthly: float = 499.0
    currency: str = "USD"
    cancel_at_period_end: bool = False


class BillingInvoiceIn(BaseModel): # type: ignore
    amount_due: float
    currency: str = "USD"
    description: str = "Manual invoice"
    due_in_days: int = 14


class SimulationStartIn(BaseModel): # type: ignore
    organization_id: str = "org_default"
    actor_user_id: str = "user_owner"
    scenario: str
    origin_country: str
    target_country: str
    target_sector: str = "enterprise"


class SimulationResponseActionIn(BaseModel): # type: ignore
    organization_id: str = "org_default"
    actor_user_id: str = "user_analyst"
    action: str
    target: str = ""
    notes: str = ""


class SimulationReplayIn(BaseModel): # type: ignore
    speed_multiplier: float = 1.0


def _pydantic_dict(model: BaseModel) -> dict[str, object]: # type: ignore
    if hasattr(model, "model_dump"): # pyright: ignore[reportUnknownArgumentType]
        return model.model_dump()  # type: ignore
    return model.dict()  # type: ignore


TENANT_ROLE_HIERARCHY: dict[str, int] = {
    "VIEWER": 1,
    "ANALYST": 2,
    "BILLING_ADMIN": 3,
    "ADMIN": 4,
    "OWNER": 5,
}


def _normalize_tenant_role(role: str) -> str:
    normalized = (role or "VIEWER").strip().upper()
    return normalized if normalized in TENANT_ROLE_HIERARCHY else "VIEWER"


def _organization_role(conn: sqlite3.Connection, organization_id: str, user_id: str) -> Optional[str]:
    row = conn.execute(
        "SELECT role FROM organization_memberships WHERE organization_id=? AND user_id=? AND status='active'",
        (organization_id, user_id),
    ).fetchone()
    if not row:
        return None
    return _normalize_tenant_role(str(row["role"] or "VIEWER"))


def _require_org_role(conn: sqlite3.Connection, organization_id: str, user_id: str, minimum_role: str) -> str:
    current = _organization_role(conn, organization_id, user_id)
    if not current:
        raise HTTPException(status_code=403, detail="User is not a member of the requested organization")
    if TENANT_ROLE_HIERARCHY[current] < TENANT_ROLE_HIERARCHY[_normalize_tenant_role(minimum_role)]:
        raise HTTPException(status_code=403, detail=f"Requires at least {minimum_role} role")
    return current


def _get_subscription(conn: sqlite3.Connection, organization_id: str) -> Optional[dict[str, object]]:
    row = conn.execute(
        "SELECT * FROM billing_subscriptions WHERE organization_id=? ORDER BY updated_at DESC LIMIT 1",
        (organization_id,),
    ).fetchone()
    return dict(row) if row else None


def safe_node_id(prefix: str, value: str) -> str:
    return f"{prefix}_{re.sub(r'[^a-zA-Z0-9_.:-]', '_', value)}"


def upsert_indicator(ind_type: str, value: str, source: str, confidence: float) -> None:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO indicators (type, value, source, confidence_score, last_seen)
               VALUES (?, ?, ?, ?, datetime('now'))
               ON CONFLICT(type, value) DO UPDATE SET
                   source=excluded.source,
                   confidence_score=excluded.confidence_score,
                   last_seen=datetime('now')""",
            (ind_type, value, source, confidence),
        )
        conn.commit()
    queue_broadcast(
        "new_indicator",
        {
            "type": ind_type,
            "value": value,
            "source": source,
            "confidence_score": confidence,
            "last_seen": "now",
        },
    )


def create_alert_row(
    alert_type: str,
    severity: str,
    matched_indicator: str,
    source_event: dict[str, object],
    source_event_id: Optional[int] = None,
    org_id: str = "org_default",
    rule_id: Optional[str] = None,
    rule_name: Optional[str] = None,
) -> dict[str, object]:
    alert_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO alerts
               (id, alert_type, severity, matched_indicator, source_event_id,
                source_event, org_id, rule_id, rule_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                alert_id,
                alert_type,
                normalize_severity(severity),
                matched_indicator,
                source_event_id,
                json.dumps(source_event),
                org_id,
                rule_id,
                rule_name,
            ),
        )
        conn.commit()
    alert: dict[str, object] = {
        "id": alert_id,
        "alert_type": alert_type,
        "severity": normalize_severity(severity),
        "matched_indicator": matched_indicator,
        "source_event_id": source_event_id,
        "source_event": source_event,
    }
    queue_broadcast("new_alert", alert)
    queue_broadcast(
        "new_attack",
        {
            "id": f"alert_{alert_id}",
            "src_ip": str(source_event.get("src_ip") or ""),
            "dst_ip": str(source_event.get("dst_ip") or ""),
            "attack_type": str(alert_type or "ioc_match"),
            "severity": normalize_severity(severity),
            "matched_indicator": matched_indicator,
        },
    )
    analyst = analyze_alert_autonomously(alert_id)
    if analyst:
        alert.update({
            "attack_classification": analyst["attack_classification"],
            "analyst_confidence": analyst["analyst_confidence"],
            "analyst_recommendation": analyst["analyst_recommendation"],
            "analyst_playbook_steps": analyst["analyst_playbook_steps"],
            "analyst_decision_source": analyst["analyst_decision_source"],
            "analyst_status": analyst["analyst_status"],
            "analyst_notes": analyst["analyst_notes"],
        })
    return alert


# ── Rule-engine event evaluation ─────────────────────────────────────────────
def evaluate_rules_for_event(
    event: dict[str, Any],
    org_id: str,
    source_event_id: Optional[int] = None,
    event_source: str = "telemetry",
) -> list[dict[str, Any]]:
    """Evaluate all enabled org rules against *event*.

    For every matching rule:
      - creates an alert record (calls create_alert_row)
      - increments rule hit_count / last_triggered_at
      - inserts a rule_event_stats row with latency_ms
      - broadcasts graph_update with the alert via queue_broadcast

    Returns a list of generated alert summaries.
    """
    generated: list[dict[str, Any]] = []
    t_start = time.monotonic()

    with get_conn() as conn:
        rules = conn.execute(
            "SELECT id, name, severity, logic_json, mitre_technique FROM detection_rules "
            "WHERE org_id=? AND enabled=1",
            (org_id,),
        ).fetchall()

    for rule in rules:
        rule_t_start = time.monotonic()
        try:
            logic: dict[str, Any] = json.loads(rule["logic_json"] or "{}")
        except (json.JSONDecodeError, TypeError):
            logic = {}

        matched = _apply_rule_to_event(logic, event)
        latency_ms = (time.monotonic() - rule_t_start) * 1000
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        stat_id = f"res_{uuid.uuid4().hex[:12]}"
        alert_id_ref: Optional[str] = None

        if matched:
            indicator = (
                str(event.get("matched_indicator") or "")
                or str(event.get("src_ip") or "")
                or str(event.get("indicator_domain") or "")
                or f"rule:{rule['id']}"
            )
            alert = create_alert_row(
                alert_type="rule_match",
                severity=str(rule["severity"]),
                matched_indicator=indicator,
                source_event=event,
                source_event_id=source_event_id,
                org_id=org_id,
                rule_id=str(rule["id"]),
                rule_name=str(rule["name"]),
            )
            alert_id_ref = str(alert["id"])
            generated.append({
                "alert_id": alert_id_ref,
                "rule_id": rule["id"],
                "rule_name": rule["name"],
                "severity": rule["severity"],
                "mitre_technique": rule["mitre_technique"],
                "org_id": org_id,
                "timestamp": now_ts,
            })

            # Broadcast graph update so the Investigation Graph reflects real-time alerts
            queue_broadcast(
                "graph_update",
                {
                    "type": "rule_alert",
                    "alert_id": alert_id_ref,
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "severity": rule["severity"],
                    "org_id": org_id,
                    "src_ip": event.get("src_ip"),
                    "dst_ip": event.get("dst_ip"),
                    "mitre_technique": rule["mitre_technique"],
                    "timestamp": now_ts,
                },
            )

            # Update rule counters
            with get_conn() as conn:
                conn.execute(
                    "UPDATE detection_rules SET hit_count = hit_count + 1, "
                    "last_triggered_at = ?, updated_at = ? WHERE id = ?",
                    (now_ts, now_ts, rule["id"]),
                )
                conn.commit()

        # Always write a stats row (matched or not) for latency tracking
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO rule_event_stats
                   (id, rule_id, org_id, alert_id, matched, latency_ms,
                    event_source, event_ts, evaluated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    stat_id, rule["id"], org_id, alert_id_ref,
                    int(matched), round(latency_ms, 3),
                    event_source, str(event.get("timestamp") or now_ts), now_ts,
                ),
            )
            conn.commit()

    _total_latency_ms = (time.monotonic() - t_start) * 1000  # noqa: unused but useful for future metrics
    return generated


def correlate_telemetry(telemetry_event_id: int, telemetry: TelemetryIn) -> list[dict[str, object]]:
    candidates: list[tuple[str, str]] = []
    if telemetry.src_ip:
        candidates.append(("ip", telemetry.src_ip))
    if telemetry.dst_ip:
        candidates.append(("ip", telemetry.dst_ip))
    if telemetry.indicator_domain:
        candidates.append(("domain", telemetry.indicator_domain))
    if telemetry.indicator_hash:
        candidates.append(("hash", telemetry.indicator_hash))

    matches: list[dict[str, object]] = []
    if not candidates:
        return matches

    source_event = _pydantic_dict(telemetry)
    with get_conn() as conn:
        for ind_type, value in candidates:
            row = conn.execute(
                "SELECT type, value, confidence_score FROM indicators WHERE type=? AND value=?",
                (ind_type, value),
            ).fetchone()
            if not row:
                continue
            severity = "CRITICAL" if float(row["confidence_score"] or 0) >= 0.9 else "HIGH"
            match = create_alert_row(
                alert_type="ioc_match",
                severity=severity,
                matched_indicator=f"{row['type']}:{row['value']}",
                source_event=source_event,
                source_event_id=telemetry_event_id,
            )
            matches.append(match)
    return matches


def _is_private_ip(ip_value: Optional[str]) -> bool:
    if not ip_value:
        return False
    try:
        return ipaddress.ip_address(ip_value).is_private
    except ValueError:
        return False


def _build_recommendation(classification: str, is_false_positive: bool) -> str:
    if is_false_positive:
        return "Close as false positive; keep passive monitoring and tune detection rule threshold."
    mapping = {
        "phishing": "Block domain at DNS gateway, isolate affected endpoints, reset impacted credentials.",
        "malware": "Isolate host, run EDR containment, collect memory/image, and block hash across fleet.",
        "credential_access": "Force password reset + MFA challenge, invalidate tokens, review login anomalies.",
        "reconnaissance": "Rate-limit source, block offending IPs, and increase perimeter telemetry retention.",
        "lateral_movement": "Segment network path, quarantine source host, and audit privilege escalation paths.",
        "data_exfiltration": "Block egress route, rotate secrets, and start incident response data-loss workflow.",
        "policy_violation": "Review policy rule mapping and validate control-plane enforcement coverage.",
        "suspicious_activity": "Escalate to human analyst with enriched context and maintain high-frequency monitoring.",
    }
    return mapping.get(classification, "Escalate for analyst triage and collect additional host/network evidence.")


def _classify_alert(alert_row: sqlite3.Row, source_event: dict[str, object], related_event_count: int) -> tuple[str, float, bool, str]:
    matched = str(alert_row["matched_indicator"] or "")
    action = str(source_event.get("action") or "").lower()
    src_ip = str(source_event.get("src_ip") or "")
    dst_ip = str(source_event.get("dst_ip") or "")

    classification = "suspicious_activity"
    confidence = 0.64
    notes = "Default heuristic applied."

    if matched.startswith("domain:"):
        classification = "phishing"
        confidence = 0.86
        notes = "Domain IOC matched known phishing intelligence."
    elif matched.startswith("hash:"):
        classification = "malware"
        confidence = 0.93
        notes = "File hash matched known malware signature."
    elif matched.startswith("ip:"):
        if action in {"allowed", "accept", "success"}:
            classification = "credential_access"
            confidence = 0.79
            notes = "Malicious IP with allowed/auth success pattern indicates possible credential abuse."
        elif action in {"blocked", "deny"}:
            classification = "reconnaissance"
            confidence = 0.74
            notes = "Blocked malicious IP indicates perimeter reconnaissance/probing."
        else:
            classification = "suspicious_activity"
            confidence = 0.7
            notes = "Malicious IP matched without explicit action semantics."

    if related_event_count >= 25:
        classification = "data_exfiltration"
        confidence = max(confidence, 0.9)
        notes = "High correlated event volume suggests coordinated exfiltration behavior."
    elif related_event_count >= 12 and classification in {"credential_access", "reconnaissance", "suspicious_activity"}:
        classification = "lateral_movement"
        confidence = max(confidence, 0.83)
        notes = "Repeated event spread indicates potential lateral movement progression."

    likely_false_positive = (
        action in {"blocked", "deny"}
        and _is_private_ip(src_ip)
        and (not dst_ip or _is_private_ip(dst_ip))
        and related_event_count <= 1
    )
    if likely_false_positive:
        notes = "Internal blocked traffic with no repetition; likely control effectiveness, not compromise."
        confidence = min(confidence, 0.58)

    return classification, confidence, likely_false_positive, notes


def _infer_mitre_for_alert(conn: sqlite3.Connection, alert_row: sqlite3.Row, source_event: dict[str, object]) -> Optional[str]:
    # Priority 1: explicit event context
    event_mitre = source_event.get("mitre_technique")
    if event_mitre:
        return str(event_mitre).strip().upper()

    # Priority 2: indicator-backed threat lookup
    matched = str(alert_row["matched_indicator"] or "")
    if ":" in matched:
        ioc_type, ioc_value = matched.split(":", 1)
        if ioc_type == "ip":
            row = conn.execute(
                """SELECT mitre_technique FROM threats
                   WHERE source_ip=? OR dest_ip=?
                   ORDER BY timestamp DESC LIMIT 1""",
                (ioc_value, ioc_value),
            ).fetchone()
        elif ioc_type == "domain":
            row = conn.execute(
                "SELECT mitre_technique FROM threats WHERE indicator_domain=? ORDER BY timestamp DESC LIMIT 1",
                (ioc_value,),
            ).fetchone()
        elif ioc_type == "hash":
            row = conn.execute(
                "SELECT mitre_technique FROM threats WHERE indicator_hash=? ORDER BY timestamp DESC LIMIT 1",
                (ioc_value,),
            ).fetchone()
        else:
            row = None
        if row and row["mitre_technique"]:
            return str(row["mitre_technique"]).strip().upper()
    return None


def analyze_alert_autonomously(alert_id: str) -> Optional[dict[str, object]]:
    with get_conn() as conn:
        alert_row = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not alert_row:
            return None

        source_event: dict[str, object] = {}
        if alert_row["source_event"]:
            try:
                source_event = json.loads(str(alert_row["source_event"]))
            except Exception:
                source_event = {}

        related_event_count = 0
        src_ip = source_event.get("src_ip")
        dst_ip = source_event.get("dst_ip")
        asset = source_event.get("asset")
        if src_ip or dst_ip or asset:
            q = """SELECT COUNT(*) FROM telemetry_events WHERE 1=1"""
            params: list[object] = []
            if src_ip:
                q += " AND src_ip=?"
                params.append(src_ip)
            if dst_ip:
                q += " OR dst_ip=?"
                params.append(dst_ip)
            if asset:
                q += " OR asset=?"
                params.append(asset)
            related_event_count = int(conn.execute(q, params).fetchone()[0] or 0)

        classification, confidence, is_false_positive, notes = _classify_alert(
            alert_row,
            source_event,
            related_event_count,
        )
        recommendation = _build_recommendation(classification, is_false_positive)
        mitre_technique = _infer_mitre_for_alert(conn, alert_row, source_event)
        playbook_steps = _mitre_base(mitre_technique) or CLASSIFICATION_PLAYBOOKS.get(classification, [])
        decision_source = "rule_engine"

        if not is_false_positive:
            enriched = _llm_enrich_playbook(
                classification=classification,
                severity=str(alert_row["severity"] or "MEDIUM"),
                mitre_technique=mitre_technique,
                recommendation=recommendation,
                base_steps=playbook_steps,
                notes=notes,
            )
            if enriched:
                recommendation = str(enriched["recommendation"])
                playbook_steps = list(enriched["playbook_steps"]) if isinstance(enriched.get("playbook_steps"), list) else playbook_steps # type: ignore
                notes = f"{notes} {str(enriched.get('rationale') or '').strip()}".strip()
                decision_source = "llm_guardrailed"

        analyst_status = "closed_false_positive" if is_false_positive else "investigated"

        conn.execute(
            """UPDATE alerts
               SET attack_classification=?, analyst_confidence=?, analyst_recommendation=?,
                   analyst_playbook_steps=?, analyst_decision_source=?, analyst_status=?, analyst_notes=?
               WHERE id=?""",
            (
                classification,
                confidence,
                recommendation,
                json.dumps(playbook_steps),
                decision_source,
                analyst_status,
                notes,
                alert_id,
            ),
        )
        conn.commit()

        analyzed: dict[str, object] = {
            "id": alert_id,
            "attack_classification": classification,
            "analyst_confidence": confidence,
            "analyst_recommendation": recommendation,
            "analyst_playbook_steps": playbook_steps,
            "analyst_decision_source": decision_source,
            "mitre_technique": mitre_technique,
            "analyst_status": analyst_status,
            "analyst_notes": notes,
            "related_event_count": related_event_count,
            "false_positive_closed": is_false_positive,
        }

    queue_broadcast("analyst_update", analyzed)
    return analyzed


def _get_defense_mode(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT config_value FROM defense_engine_config WHERE config_key='mode'"
    ).fetchone()
    return normalize_defense_mode(str(row["config_value"] if row else "monitor_only"))


def _set_defense_mode(conn: sqlite3.Connection, mode: str) -> str:
    normalized = normalize_defense_mode(mode)
    conn.execute(
        """INSERT INTO defense_engine_config (config_key, config_value, updated_at)
           VALUES ('mode', ?, datetime('now'))
           ON CONFLICT(config_key) DO UPDATE SET
             config_value=excluded.config_value,
             updated_at=datetime('now')""",
        (normalized,),
    )
    return normalized


def _extract_indicator_list_for_incident(
    incident: sqlite3.Row,
    threat_row: Optional[sqlite3.Row],
) -> list[str]:
    indicators: list[str] = []
    for key in ("source_ip", "dest_ip", "indicator_domain", "indicator_hash"):
        if threat_row and threat_row[key]:
            indicators.append(str(threat_row[key]))
    for asset in str(incident["affected_assets"] or "").split(","):
        if asset.strip():
            indicators.append(asset.strip())
    return indicators[:20]


def _incident_alerts_by_correlation(
    conn: sqlite3.Connection,
    incident: sqlite3.Row,
    threat_row: Optional[sqlite3.Row],
    limit: int = 20,
) -> list[dict[str, object]]:
    indicators = _extract_indicator_list_for_incident(incident, threat_row)
    results: list[dict[str, object]] = []
    seen: set[str] = set()

    for ind in indicators:
        rows = conn.execute(
            "SELECT * FROM alerts WHERE matched_indicator LIKE ? ORDER BY timestamp DESC LIMIT 10",
            (f"%{ind}%",),
        ).fetchall()
        for row in rows:
            aid = str(row["id"])
            if aid in seen:
                continue
            seen.add(aid)
            item = dict(row)
            if item.get("analyst_playbook_steps"):
                try:
                    item["analyst_playbook_steps"] = json.loads(str(item["analyst_playbook_steps"]))
                except Exception:
                    item["analyst_playbook_steps"] = []
            results.append(item)
            if len(results) >= limit:
                return results

    if not results:
        rows = conn.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 5").fetchall()
        for row in rows:
            item = dict(row)
            if item.get("analyst_playbook_steps"):
                try:
                    item["analyst_playbook_steps"] = json.loads(str(item["analyst_playbook_steps"]))
                except Exception:
                    item["analyst_playbook_steps"] = []
            results.append(item)
    return results


def _recommend_defense_actions_for_incident(
    conn: sqlite3.Connection,
    incident_id: str,
) -> dict[str, object]:
    incident = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    threat_row: Optional[sqlite3.Row] = None
    if incident["threat_id"]:
        threat_row = conn.execute("SELECT * FROM threats WHERE id=?", (incident["threat_id"],)).fetchone()

    alerts = _incident_alerts_by_correlation(conn, incident, threat_row, limit=25)
    classifications = [
        str(a.get("attack_classification") or "suspicious_activity").lower()
        for a in alerts
    ]
    has_identity_signal = any(
        str(a.get("attack_classification") or "").lower() == "credential_access"
        for a in alerts
    )
    indicators = _extract_indicator_list_for_incident(incident, threat_row)

    payload = DefenseEvaluationInput(
        incident_id=str(incident_id),
        severity=str(incident["severity"] or "MEDIUM"),
        attack_classifications=classifications,
        indicators=indicators,
        has_identity_signal=has_identity_signal,
    )
    recommendations = evaluate_incident_for_response(payload, DEFAULT_RESPONSE_PLAYBOOKS)

    pending_rows = conn.execute(
        """SELECT * FROM autonomous_defense_log
           WHERE incident_id=? AND status='pending'
           ORDER BY created_at DESC LIMIT 50""",
        (incident_id,),
    ).fetchall()

    return {
        "incident_id": incident_id,
        "severity": str(incident["severity"] or "MEDIUM"),
        "mode": _get_defense_mode(conn),
        "recommendations": recommendations,
        "pending_actions": [dict(r) for r in pending_rows],
    }


def _record_defense_action(
    conn: sqlite3.Connection,
    *,
    alert_id: Optional[str],
    incident_id: Optional[str],
    action: str,
    target: str,
    confidence: float,
    classification: str,
    executed_by: str,
    rationale: str,
    status: str,
    approval_state: str,
    execution_mode: str,
    playbook_name: str,
    approved_by: str = "",
) -> dict[str, object]:
    log_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO autonomous_defense_log (
               id, alert_id, incident_id, action, target, confidence, classification,
               executed_by, approved_by, approval_state, execution_mode, playbook_name,
               rationale, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            log_id,
            alert_id or "",
            incident_id,
            action,
            target,
            round(confidence, 2),
            classification,
            executed_by,
            approved_by or None,
            approval_state,
            execution_mode,
            playbook_name,
            rationale,
            status,
        ),
    )
    if incident_id:
        conn.execute(
            """INSERT INTO incident_events (incident_id, description, actor, event_type)
               VALUES (?, ?, ?, 'defense_action')""",
            (
                incident_id,
                f"Defense action {action} ({status}) target={target or '-'} mode={execution_mode}",
                executed_by,
            ),
        )
    return {
        "log_id": log_id,
        "alert_id": alert_id,
        "incident_id": incident_id,
        "action": action,
        "target": target,
        "confidence": round(confidence, 2),
        "classification": classification,
        "executed_by": executed_by,
        "approval_state": approval_state,
        "execution_mode": execution_mode,
        "playbook_name": playbook_name,
        "rationale": rationale,
        "status": status,
    }


# ── Multi-tenant SaaS endpoints ─────────────────────────────────────────────

@app.get("/api/organizations") # type: ignore
def list_organizations() -> object:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM customer_organizations ORDER BY created_at ASC"
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/organizations", status_code=201) # type: ignore
def create_organization(req: OrganizationCreateIn) -> object:
    org_id = f"org_{uuid.uuid4().hex[:10]}"
    slug = (req.slug or req.name.lower().replace(" ", "-")).strip()[:64]
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO customer_organizations (id, name, slug, status, plan_code) VALUES (?, ?, ?, 'active', ?)",
            (org_id, req.name.strip()[:120], slug, (req.plan_code or "pro").strip()[:40]),
        )
        conn.execute(
            """INSERT INTO billing_subscriptions (
                id, organization_id, plan_code, status, seats, price_monthly, currency,
                current_period_start, current_period_end
            ) VALUES (?, ?, ?, 'trialing', 5, 0, 'USD', datetime('now'), datetime('now', '+14 day'))""",
            (f"sub_{uuid.uuid4().hex[:10]}", org_id, (req.plan_code or "pro").strip()[:40]),
        )
        conn.commit()
    return {"id": org_id, "slug": slug, "name": req.name, "plan_code": req.plan_code, "status": "active"}


@app.get("/api/organizations/{organization_id}") # type: ignore
def get_organization(organization_id: str) -> object:
    with get_conn() as conn:
        org = conn.execute("SELECT * FROM customer_organizations WHERE id=?", (organization_id,)).fetchone()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        sub = _get_subscription(conn, organization_id)
        member_count = int(conn.execute(
            "SELECT COUNT(*) FROM organization_memberships WHERE organization_id=? AND status='active'",
            (organization_id,),
        ).fetchone()[0] or 0)
    return {"organization": dict(org), "subscription": sub, "member_count": member_count}


@app.get("/api/organizations/{organization_id}/members") # type: ignore
def organization_members(organization_id: str) -> object:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT m.*, u.department, u.role AS global_role
               FROM organization_memberships m
               LEFT JOIN users u ON u.id = m.user_id
               WHERE m.organization_id=?
               ORDER BY m.created_at ASC""",
            (organization_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/organizations/{organization_id}/members", status_code=201) # type: ignore
def add_organization_member(organization_id: str, req: OrganizationMembershipIn, actor_user_id: str = "user_owner") -> object:
    membership_id = f"mem_{uuid.uuid4().hex[:10]}"
    with get_conn() as conn:
        _require_org_role(conn, organization_id, actor_user_id, "ADMIN")
        role = _normalize_tenant_role(req.role)
        user = conn.execute("SELECT id, name, email FROM users WHERE id=?", (req.user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        conn.execute(
            """INSERT OR REPLACE INTO organization_memberships (
                id, organization_id, user_id, email, display_name, role, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'active')""",
            (
                membership_id,
                organization_id,
                req.user_id,
                req.email or str(user["email"] or ""),
                req.display_name or str(user["name"] or req.user_id),
                role,
            ),
        )
        conn.commit()
    return {"id": membership_id, "organization_id": organization_id, "user_id": req.user_id, "role": role, "status": "active"}


@app.patch("/api/organizations/{organization_id}/members/{user_id}/role") # type: ignore
def update_organization_member_role(organization_id: str, user_id: str, new_role: str, actor_user_id: str = "user_owner") -> object:
    with get_conn() as conn:
        _require_org_role(conn, organization_id, actor_user_id, "ADMIN")
        normalized = _normalize_tenant_role(new_role)
        result = conn.execute(
            "UPDATE organization_memberships SET role=? WHERE organization_id=? AND user_id=?",
            (normalized, organization_id, user_id),
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Membership not found")
    return {"organization_id": organization_id, "user_id": user_id, "role": normalized, "status": "updated"}


@app.get("/api/billing/organizations/{organization_id}/subscription") # type: ignore
def get_billing_subscription(organization_id: str) -> object:
    with get_conn() as conn:
        subscription = _get_subscription(conn, organization_id)
        invoices = conn.execute(
            "SELECT * FROM billing_invoices WHERE organization_id=? ORDER BY invoice_date DESC LIMIT 20",
            (organization_id,),
        ).fetchall()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"subscription": subscription, "invoices": [dict(i) for i in invoices]}


@app.post("/api/billing/organizations/{organization_id}/subscription") # type: ignore
def upsert_billing_subscription(organization_id: str, req: BillingSubscriptionUpsertIn, actor_user_id: str = "user_billing") -> object:
    with get_conn() as conn:
        _require_org_role(conn, organization_id, actor_user_id, "BILLING_ADMIN")
        sub_id = f"sub_{uuid.uuid4().hex[:10]}"
        conn.execute(
            """INSERT INTO billing_subscriptions (
                id, organization_id, plan_code, status, seats, price_monthly, currency,
                current_period_start, current_period_end, cancel_at_period_end, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+30 day'), ?, datetime('now'))
            ON CONFLICT(organization_id) DO UPDATE SET
                plan_code=excluded.plan_code,
                status=excluded.status,
                seats=excluded.seats,
                price_monthly=excluded.price_monthly,
                currency=excluded.currency,
                cancel_at_period_end=excluded.cancel_at_period_end,
                current_period_end=excluded.current_period_end,
                updated_at=datetime('now')""",
            (
                sub_id,
                organization_id,
                req.plan_code[:40],
                req.status[:30],
                max(1, min(req.seats, 10000)),
                max(0.0, float(req.price_monthly)),
                req.currency[:8],
                1 if req.cancel_at_period_end else 0,
            ),
        )
        conn.commit()
        subscription = _get_subscription(conn, organization_id)
    return {"status": "updated", "subscription": subscription}


@app.post("/api/billing/organizations/{organization_id}/invoices", status_code=201) # type: ignore
def create_billing_invoice(organization_id: str, req: BillingInvoiceIn, actor_user_id: str = "user_billing") -> object:
    invoice_id = f"inv_{uuid.uuid4().hex[:10]}"
    with get_conn() as conn:
        _require_org_role(conn, organization_id, actor_user_id, "BILLING_ADMIN")
        sub = _get_subscription(conn, organization_id)
        conn.execute(
            """INSERT INTO billing_invoices (
                id, organization_id, subscription_id, amount_due, amount_paid, currency, status, description, due_date
            ) VALUES (?, ?, ?, ?, 0, ?, 'open', ?, datetime('now', ?))""",
            (
                invoice_id,
                organization_id,
                str((sub or {}).get("id") or ""),
                float(req.amount_due),
                req.currency[:8],
                req.description[:180],
                f"+{max(1, min(req.due_in_days, 120))} day",
            ),
        )
        conn.commit()
    return {"invoice_id": invoice_id, "organization_id": organization_id, "status": "open"}


@app.get("/api/billing/organizations/{organization_id}/overview") # type: ignore
def billing_overview(organization_id: str) -> object:
    with get_conn() as conn:
        sub = _get_subscription(conn, organization_id)
        invoices = [dict(r) for r in conn.execute(
            "SELECT * FROM billing_invoices WHERE organization_id=? ORDER BY invoice_date DESC LIMIT 50",
            (organization_id,),
        ).fetchall()]
    total_due = round(sum(float(i.get("amount_due") or 0.0) for i in invoices if str(i.get("status") or "") == "open"), 2)
    total_paid = round(sum(float(i.get("amount_paid") or 0.0) for i in invoices), 2)
    return {
        "organization_id": organization_id,
        "subscription": sub,
        "open_invoice_count": len([i for i in invoices if str(i.get("status") or "") == "open"]),
        "total_due": total_due,
        "total_paid": total_paid,
        "recent_invoices": invoices[:10],
    }


# ── Cyber War Room simulation endpoints ─────────────────────────────────────

@app.get("/api/simulation/scenarios") # type: ignore
def simulation_scenarios() -> object:
    return [
        {"key": key, "label": str(meta.get("label") or key), "steps": len(list(meta.get("events") or []))}
        for key, meta in ATTACK_SIMULATION_SCENARIOS.items()
    ]


@app.post("/api/simulation/start", status_code=201) # type: ignore
async def simulation_start(req: SimulationStartIn) -> object:
    with get_conn() as conn:
        _require_org_role(conn, req.organization_id, req.actor_user_id, "ANALYST")
        sub = _get_subscription(conn, req.organization_id)
        if not sub or str(sub.get("status") or "") not in {"active", "trialing"}:
            raise HTTPException(status_code=402, detail="Organization does not have an active subscription")
    try:
        result = await simulation_engine.start_simulation(
            scenario_key=req.scenario,
            organization_id=req.organization_id,
            actor_user_id=req.actor_user_id,
            origin_country=req.origin_country,
            target_country=req.target_country,
            target_sector=req.target_sector,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@app.get("/api/simulation/runs") # type: ignore
def simulation_runs(organization_id: Optional[str] = None, limit: int = 40) -> object:
    safe_limit = min(max(limit, 1), 200)
    with get_conn() as conn:
        if organization_id:
            rows = conn.execute(
                "SELECT * FROM simulation_runs WHERE organization_id=? ORDER BY started_at DESC LIMIT ?",
                (organization_id, safe_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM simulation_runs ORDER BY started_at DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()
    result: list[dict[str, object]] = []
    for row in rows:
        item = dict(row)
        if item.get("metadata_json"):
            try:
                item["metadata_json"] = json.loads(str(item["metadata_json"]))
            except Exception:
                pass
        result.append(item)
    return result


@app.get("/api/simulation/{run_id}/timeline") # type: ignore
def simulation_timeline(run_id: str) -> object:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM simulation_events WHERE run_id=? ORDER BY sequence_no ASC, created_at ASC",
            (run_id,),
        ).fetchall()
    out: list[dict[str, object]] = []
    for row in rows:
        item = dict(row)
        if item.get("payload_json"):
            try:
                item["payload_json"] = json.loads(str(item["payload_json"]))
            except Exception:
                pass
        out.append(item)
    return out


@app.get("/api/simulation/{run_id}/stats") # type: ignore
def simulation_stats(run_id: str) -> object:
    try:
        return simulation_engine.get_run_stats(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/simulation/{run_id}/pause") # type: ignore
def simulation_pause(run_id: str) -> object:
    try:
        return simulation_engine.pause_simulation(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/simulation/{run_id}/resume") # type: ignore
def simulation_resume(run_id: str) -> object:
    try:
        return simulation_engine.resume_simulation(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/simulation/{run_id}/stop") # type: ignore
def simulation_stop(run_id: str) -> object:
    return simulation_engine.stop_simulation(run_id)


@app.post("/api/simulation/{run_id}/replay") # type: ignore
async def simulation_replay(run_id: str, req: SimulationReplayIn) -> object:
    return await simulation_engine.replay_simulation(run_id, req.speed_multiplier)


@app.post("/api/simulation/{run_id}/response-action") # type: ignore
def simulation_response_action(run_id: str, req: SimulationResponseActionIn) -> object:
    with get_conn() as conn:
        _require_org_role(conn, req.organization_id, req.actor_user_id, "ANALYST")
    try:
        return simulation_engine.record_response_action(
            run_id=run_id,
            organization_id=req.organization_id,
            action=req.action,
            target=req.target,
            actor_user_id=req.actor_user_id,
            notes=req.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── User endpoints ────────────────────────────────────────────────────────────

@app.get("/users") # type: ignore
def list_users():
    with get_conn() as conn:
        rows = conn.execute("SELECT id, name, email, role, department FROM users").fetchall()
    return [dict(row) for row in rows]


@app.patch("/users/{user_id}/role") # type: ignore
def update_user_role(user_id: str, new_role: str, actor_id: str):
    with get_conn() as conn:
        user = conn.execute("SELECT role FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        previous_role = user["role"]
        conn.execute("UPDATE users SET role=? WHERE id=?", (new_role, user_id))
        conn.execute(
            """
            INSERT INTO audit (
                actor_id, action, target_user_id, previous_role, new_role,
                timestamp, ip_address, status
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
            """,
            (actor_id, "update_role", user_id, previous_role, new_role, "127.0.0.1", "success"),
        )
        conn.commit()

    return {"id": user_id, "role": new_role, "status": "updated"}


# ── Audit endpoints ───────────────────────────────────────────────────────────

@app.get("/audit") # type: ignore
def get_audit():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM audit ORDER BY rowid DESC").fetchall()
    return [dict(row) for row in rows]


# ── Threat endpoints ──────────────────────────────────────────────────────────

@app.post("/threats", status_code=201) # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
def ingest_threat(threat: ThreatIn):
    threat_id = str(uuid.uuid4())
    severity = normalize_severity(threat.severity)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO threats (
                    id, threat_name, type, mitre_technique, severity,
                    source_ip, indicator_domain, indicator_hash, dest_ip, description
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                threat_id,
                threat.threat_name,
                threat.type,
                threat.mitre_technique,
                severity,
                threat.source_ip,
                threat.indicator_domain,
                threat.indicator_hash,
                threat.dest_ip,
                threat.description,
            ),
        )
        conn.commit()
    payload = {
        "id": threat_id,
        "title": threat.threat_name,
        "attack_type": _attack_type_from_threat_type(threat.type),
        "severity": severity,
        "src_ip": threat.source_ip or "",
        "dst_ip": threat.dest_ip or "",
    }
    queue_broadcast("new_attack", payload)
    return {"id": threat_id, "status": "created"}


@app.get("/threats") # type: ignore
def list_threats(severity: Optional[str] = None, status: Optional[str] = None):
    query = "SELECT * FROM threats WHERE 1=1"
    params: list[str] = []
    if severity:
        query += " AND severity=?"
        params.append(normalize_severity(severity))
    if status:
        query += " AND status=?"
        params.append(normalize_status(status))
    query += " ORDER BY timestamp DESC LIMIT 100"
    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


@app.patch("/threats/{threat_id}/status") # type: ignore
def update_threat_status(threat_id: str, status: str):
    normalized = normalize_status(status)
    if normalized not in ALLOWED_THREAT_STATUS:
        raise HTTPException(status_code=400, detail=f"status must be one of {ALLOWED_THREAT_STATUS}")
    with get_conn() as conn:
        result = conn.execute("UPDATE threats SET status=? WHERE id=?", (normalized, threat_id))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Threat not found")
    return {"id": threat_id, "status": normalized}


# ── Incident endpoints ────────────────────────────────────────────────────────

@app.post("/incidents", status_code=201) # type: ignore
def create_incident(incident: IncidentIn):
    incident_id = str(uuid.uuid4())
    severity = normalize_severity(incident.severity)
    status = normalize_status(incident.status)
    if status not in ALLOWED_INCIDENT_STATUS:
        raise HTTPException(status_code=400, detail=f"status must be one of {ALLOWED_INCIDENT_STATUS}")
    affected_assets = ",".join([a.strip() for a in incident.affected_assets if a.strip()])
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO incidents (id, title, description, severity, status, affected_assets, threat_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                incident_id,
                incident.title,
                incident.description,
                severity,
                status,
                affected_assets,
                incident.threat_id,
            ),
        )
        conn.execute(
            """INSERT INTO incident_events (incident_id, description, actor, event_type)
               VALUES (?, ?, 'system', 'created')""",
            (incident_id, f"Incident created: {incident.title}"),
        )
        conn.commit()

        # High severity auto-trigger for defense engine.
        if severity in {"HIGH", "CRITICAL"}:
            mode = _get_defense_mode(conn)
            eval_payload = _recommend_defense_actions_for_incident(conn, incident_id)
            recommendations = list(eval_payload.get("recommendations") or []) # pyright: ignore[reportUnknownVariableType]
            for rec in recommendations[:3]:
                action = str(rec.get("action") or "").strip().lower()
                if action not in SUPPORTED_DEFENSE_ACTIONS:
                    continue
                target = str(rec.get("target") or "")
                confidence = float(rec.get("confidence") or 0.65)
                rationale = str(rec.get("rationale") or "Auto-triggered from incident severity")
                playbook_name = str(rec.get("playbook_name") or "Autonomous Response")
                status = "executed" if mode == "full_autonomous" else ("pending" if mode == "analyst_approval_required" else "monitored")
                approval_state = "approved" if mode == "full_autonomous" else ("pending" if mode == "analyst_approval_required" else "not_required")
                _record_defense_action(
                    conn,
                    alert_id=None,
                    incident_id=incident_id,
                    action=action,
                    target=target,
                    confidence=confidence,
                    classification="incident_auto_evaluation",
                    executed_by="auto-defense-engine",
                    rationale=rationale,
                    status=status,
                    approval_state=approval_state,
                    execution_mode=mode,
                    playbook_name=playbook_name,
                )
            conn.commit()
    queue_broadcast(
        "incident_created",
        {
            "id": incident_id,
            "title": incident.title,
            "severity": severity,
            "status": status,
        },
    )
    queue_broadcast(
        "incident_detected",
        {
            "id": incident_id,
            "title": incident.title,
            "severity": severity,
            "status": status,
            "threat_id": incident.threat_id,
        },
    )
    return {"id": incident_id, "status": "created"}


@app.get("/incidents") # type: ignore
def list_incidents():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC").fetchall()
    result: list[dict[str, object]] = []
    for row in rows:
        item = dict(row)
        item["affected_assets"] = [a for a in (item.get("affected_assets") or "").split(",") if a]
        result.append(item)
    return result


@app.get("/incidents/{incident_id}") # type: ignore
def get_incident(incident_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    item = dict(row)
    item["affected_assets"] = [a for a in (item.get("affected_assets") or "").split(",") if a]
    return item


@app.get("/incidents/{incident_id}/timeline") # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
def get_incident_timeline(incident_id: str):
    with get_conn() as conn:
        if not conn.execute("SELECT id FROM incidents WHERE id=?", (incident_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Incident not found")
        rows = conn.execute(
            "SELECT * FROM incident_events WHERE incident_id=? ORDER BY timestamp ASC",
            (incident_id,),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/incidents/{incident_id}/events") # type: ignore
def add_incident_event(incident_id: str, event: IncidentEventIn):
    with get_conn() as conn:
        if not conn.execute("SELECT id FROM incidents WHERE id=?", (incident_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Incident not found")
        conn.execute(
            """INSERT INTO incident_events (incident_id, description, actor, event_type)
               VALUES (?, ?, ?, ?)""",
            (incident_id, event.description, event.actor, event.event_type),
        )
        conn.commit()
    return {"status": "added"}


@app.patch("/incidents/{incident_id}/status") # type: ignore
def update_incident_status(incident_id: str, status: str):
    normalized = normalize_status(status)
    if normalized not in ALLOWED_INCIDENT_STATUS:
        raise HTTPException(status_code=400, detail=f"status must be one of {ALLOWED_INCIDENT_STATUS}")
    with get_conn() as conn:
        result = conn.execute(
            "UPDATE incidents SET status=? WHERE id=?", (normalized, incident_id)
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
    return {"id": incident_id, "status": normalized}


@app.get("/incidents/{incident_id}/alerts") # type: ignore
def get_incident_alerts(incident_id: str):
    """Return alerts correlated with this incident via shared indicators."""
    with get_conn() as conn:
        incident = conn.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        threat_row = None
        if incident["threat_id"]:
            threat_row = conn.execute("SELECT * FROM threats WHERE id=?", (incident["threat_id"],)).fetchone()

        alerts = _incident_alerts_by_correlation(conn, incident, threat_row, limit=40)
    return alerts


# ── Telemetry + Threat Intel + IOC correlation ──────────────────────────────

@app.post("/api/telemetry/ingest") # type: ignore
def ingest_telemetry(request: Request, telemetry: TelemetryIn) -> object:  # type: ignore
    org_id = _org_from_request(request)
    payload: dict[str, object] = dict(_pydantic_dict(telemetry))
    with get_conn() as conn:
        result = conn.execute(
            """INSERT INTO telemetry_events (
                    source, timestamp, src_ip, dst_ip,
                    indicator_domain, indicator_hash, asset, action, raw_event
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                telemetry.source,
                telemetry.timestamp,
                telemetry.src_ip,
                telemetry.dst_ip,
                telemetry.indicator_domain,
                telemetry.indicator_hash,
                telemetry.asset,
                telemetry.action,
                json.dumps(payload),
            ),
        )
        conn.commit()
        telemetry_event_id = int(result.lastrowid or 0)

    # IoC correlation (existing sync path — kept for backward compat)
    matches = correlate_telemetry(telemetry_event_id, telemetry)

    # Detection rule evaluation (existing sync path — kept for backward compat)
    rule_alerts = evaluate_rules_for_event(
        payload,
        org_id=org_id,
        source_event_id=telemetry_event_id,
        event_source=str(telemetry.source),
    )

    # ── Async streaming pipeline (non-blocking fire-and-forget) ───────────────
    # Publishes to the broker so async workers (rule_evaluation, ioc_correlation,
    # graph_update) can process this event concurrently in the event loop.
    event_stream_producer.publish_telemetry_sync(
        event=payload,
        org_id=org_id,
        source="ingest_api",
        source_event_id=telemetry_event_id,
        event_source=str(telemetry.source),
    )

    return {
        "status": "ingested",
        "telemetry_event_id": telemetry_event_id,
        "ioc_matches": matches,
        "rule_alerts": rule_alerts,
    }


@app.get("/api/threat-intel/update") # type: ignore
def update_threat_intel_feeds() -> object:
    # Backward-compatible endpoint now backed by the AI feed aggregator engine.
    result = _run_threat_feed_aggregation("legacy_update_endpoint")
    return {
        "status": result.get("status", "completed"),
        "inserted_or_updated": result.get("ingested", 0),
        "feeds": ["malicious_ip_lists", "malware_hashes", "phishing_domains"],
        "run_id": result.get("run_id"),
    }


@app.get("/api/threat-intel/aggregator/status") # type: ignore
def threat_intel_aggregator_status() -> object:
    with get_conn() as conn:
        enabled_row = conn.execute(
            "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_enabled'"
        ).fetchone()
        interval_row = conn.execute(
            "SELECT config_value FROM defense_engine_config WHERE config_key='threat_intel_auto_ingest_interval_minutes'"
        ).fetchone()
        last_run = conn.execute(
            "SELECT * FROM threat_feed_runs ORDER BY completed_at DESC LIMIT 1"
        ).fetchone()
        sources = conn.execute(
            "SELECT id, name, indicator_type, reliability, feed_url, is_enabled, ingest_interval_minutes, last_run_at, last_status FROM threat_feed_sources ORDER BY name ASC"
        ).fetchall()
        total_runs = conn.execute("SELECT COUNT(*) FROM threat_feed_runs").fetchone()[0]

    enabled = str(enabled_row["config_value"] if enabled_row else "true").strip().lower() in {"1", "true", "yes", "on"}
    interval_minutes = int(str(interval_row["config_value"] if interval_row else "30") or "30")

    return {
        "auto_ingest_enabled": enabled,
        "interval_minutes": interval_minutes,
        "total_runs": int(total_runs or 0),
        "last_run": dict(last_run) if last_run else None,
        "sources": [dict(r) for r in sources],
    }


@app.post("/api/threat-intel/aggregator/run") # type: ignore
def threat_intel_aggregator_run(req: ThreatIntelAggregatorRunIn) -> object:
    trigger = (req.trigger_mode or "manual").strip().lower()[:40]
    result = _run_threat_feed_aggregation(trigger)
    return result


@app.post("/api/threat-intel/aggregator/auto-config") # type: ignore
def threat_intel_aggregator_auto_config(req: ThreatIntelAggregatorAutoConfigIn) -> object:
    interval = min(max(int(req.interval_minutes or 30), 5), 240)
    enabled = bool(req.enabled)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO defense_engine_config (config_key, config_value, updated_at)
               VALUES ('threat_intel_auto_ingest_enabled', ?, datetime('now'))
               ON CONFLICT(config_key) DO UPDATE SET
                  config_value=excluded.config_value,
                  updated_at=datetime('now')""",
            ("true" if enabled else "false",),
        )
        conn.execute(
            """INSERT INTO defense_engine_config (config_key, config_value, updated_at)
               VALUES ('threat_intel_auto_ingest_interval_minutes', ?, datetime('now'))
               ON CONFLICT(config_key) DO UPDATE SET
                  config_value=excluded.config_value,
                  updated_at=datetime('now')""",
            (str(interval),),
        )
        conn.commit()
    return {
        "status": "updated",
        "auto_ingest_enabled": enabled,
        "interval_minutes": interval,
    }


@app.get("/api/threat-intel/aggregator/runs") # type: ignore
def threat_intel_aggregator_runs(limit: int = 30) -> object:
    safe_limit = min(max(limit, 1), 200)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM threat_feed_runs ORDER BY completed_at DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    out: list[dict[str, object]] = []
    for row in rows:
        item = dict(row)
        for field in ("breakdown_json", "summary_json"):
            if item.get(field):
                try:
                    item[field] = json.loads(str(item[field]))
                except Exception:
                    pass
        out.append(item)
    return out


@app.get("/api/investigation/enrichment") # type: ignore
def investigation_enrichment(incident_id: Optional[str] = None, limit: int = 30) -> object:
    safe_limit = min(max(limit, 1), 100)
    with get_conn() as conn:
        return _build_investigation_enrichment(conn, incident_id=incident_id, limit=safe_limit)


@app.get("/api/threat-intel/actors") # type: ignore
def threat_intel_actors_list() -> object:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT actor_id, actor_name, aliases, attack_techniques, target_industries, updated_at FROM threat_actors ORDER BY actor_name ASC"
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["aliases"] = json.loads(d.get("aliases") or "[]")
        d["attack_techniques"] = json.loads(d.get("attack_techniques") or "[]")
        d["target_industries"] = json.loads(d.get("target_industries") or "[]")
        out.append(d) # type: ignore
    return out # type: ignore


@app.get("/api/threat-intel/actors/{actor_id}") # type: ignore
def threat_intel_actor_profile(actor_id: str) -> object:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM threat_actors WHERE actor_id=?",
            (actor_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Threat actor not found")
    d = dict(row)
    for k in [
        "aliases",
        "associated_malware",
        "known_ips",
        "known_domains",
        "attack_techniques",
        "target_industries",
        "known_campaigns",
    ]:
        d[k] = json.loads(d.get(k) or "[]")
    return d


# ── /api/threat-intel/import  (extended: supports feed_url download) ────────
@app.post("/api/threat-intel/import") # type: ignore  # noqa: F811
def threat_intel_import_feed(payload: ThreatIntelImportIn) -> object:  # type: ignore
    """
    Accepts either:
    • a list of actors in JSON body (legacy behaviour), or
    • a `feed_url` pointing to a remote STIX2/CSV/TXT feed.

    For feed_url the backend fetches the raw content and parses indicators
    (IPs, domains, hashes) into the `indicators` table and any named actors
    into `threat_actors`.
    """
    import urllib.request
    import re as _re

    imported_actors = 0
    imported_indicators = 0
    errors: list[str] = []

    # ── 1. Actor list (legacy path) ──────────────────────────────────────────
    with get_conn() as conn:
        for actor in payload.actors:
            actor_id = f"actor_{str(actor.actor_name).lower().replace(' ', '_')}"
            conn.execute(
                """
                INSERT INTO threat_actors (
                    actor_id, actor_name, aliases, associated_malware, known_ips,
                    known_domains, attack_techniques, target_industries,
                    known_campaigns, historical_activity, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(actor_id) DO UPDATE SET
                    actor_name=excluded.actor_name,
                    aliases=excluded.aliases,
                    associated_malware=excluded.associated_malware,
                    known_ips=excluded.known_ips,
                    known_domains=excluded.known_domains,
                    attack_techniques=excluded.attack_techniques,
                    target_industries=excluded.target_industries,
                    known_campaigns=excluded.known_campaigns,
                    historical_activity=excluded.historical_activity,
                    updated_at=datetime('now')
                """,
                (
                    actor_id,
                    actor.actor_name,
                    json.dumps(actor.aliases),
                    json.dumps(actor.associated_malware),
                    json.dumps(actor.known_ips),
                    json.dumps(actor.known_domains),
                    json.dumps(actor.attack_techniques),
                    json.dumps(actor.target_industries),
                    json.dumps(actor.known_campaigns),
                    actor.historical_activity,
                ),
            )
            imported_actors += 1
        conn.commit()

    # ── 2. Remote feed URL ───────────────────────────────────────────────────
    if payload.feed_url:
        # Basic URL validation – allow only http/https, no file:// or other schemes
        parsed_url = payload.feed_url.strip()
        if not _re.match(r"^https?://", parsed_url, _re.IGNORECASE):
            raise HTTPException(status_code=400, detail="feed_url must use http or https scheme")

        try:
            req_obj = urllib.request.Request(  # nosec
                parsed_url,
                headers={"User-Agent": "ThreatIntelAggregator/1.0"},
            )
            with urllib.request.urlopen(req_obj, timeout=15) as resp:  # nosec
                raw = resp.read(2 * 1024 * 1024).decode("utf-8", errors="replace")  # 2 MB cap
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failed to fetch feed_url: {exc}") from exc

        fmt = (payload.feed_format or "txt").lower()

        if fmt == "stix":
            # Minimal STIX2 parsing: extract indicator pattern values
            try:
                feed_data = json.loads(raw)
                objects = feed_data.get("objects", []) if isinstance(feed_data, dict) else []
                source_label = str(payload.feed_url)[:120]
                with get_conn() as conn:
                    for obj in objects:
                        if not isinstance(obj, dict):
                            continue
                        otype = str(obj.get("type") or "")
                        if otype == "indicator":
                            pattern: str = str(obj.get("pattern") or "")
                            # Extract IPv4 addresses
                            for ip in _re.findall(r"\[ipv4-addr:value\s*=\s*'([^']+)'\]", pattern):
                                _upsert_indicator_with_conn(conn, ind_type="ip", value=ip, source=source_label, confidence=0.8)
                                imported_indicators += 1
                            # Extract domains
                            for dom in _re.findall(r"\[domain-name:value\s*=\s*'([^']+)'\]", pattern):
                                _upsert_indicator_with_conn(conn, ind_type="domain", value=dom, source=source_label, confidence=0.8)
                                imported_indicators += 1
                            # Extract URLs
                            for url_val in _re.findall(r"\[url:value\s*=\s*'([^']+)'\]", pattern):
                                _upsert_indicator_with_conn(conn, ind_type="url", value=url_val, source=source_label, confidence=0.75)
                                imported_indicators += 1
                            # Extract hashes
                            for h in _re.findall(r"\[file:hashes\.'[^']+'\s*=\s*'([a-fA-F0-9]{32,64})'\]", pattern):
                                _upsert_indicator_with_conn(conn, ind_type="hash", value=h, source=source_label, confidence=0.85)
                                imported_indicators += 1
                        elif otype == "threat-actor":
                            actor_name = str(obj.get("name") or "Unknown")
                            actor_id = f"actor_{actor_name.lower().replace(' ', '_')}"
                            conn.execute(
                                """INSERT INTO threat_actors (actor_id, actor_name, updated_at)
                                   VALUES (?, ?, datetime('now'))
                                   ON CONFLICT(actor_id) DO UPDATE SET updated_at=datetime('now')""",
                                (actor_id, actor_name),
                            )
                            imported_actors += 1
                    conn.commit()
            except json.JSONDecodeError as exc:
                errors.append(f"STIX JSON parse error: {exc}")

        elif fmt == "csv":
            # Expect lines like: type,value,confidence
            source_label = str(payload.feed_url)[:120]
            with get_conn() as conn:
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 2:
                        ind_type = parts[0].lower()
                        value = parts[1]
                        confidence = float(parts[2]) if len(parts) >= 3 else 0.7
                        if ind_type in ("ip", "domain", "hash", "url") and value:
                            _upsert_indicator_with_conn(conn, ind_type=ind_type, value=value,
                                                         source=source_label, confidence=confidence)
                            imported_indicators += 1
                conn.commit()

        else:  # txt – one indicator value per line, auto-detect type
            source_label = str(payload.feed_url)[:120]
            ip_re = _re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
            hash_re = _re.compile(r"^[a-fA-F0-9]{32,64}$")
            domain_re = _re.compile(r"^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
            url_re = _re.compile(r"^https?://")
            with get_conn() as conn:
                for line in raw.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if ip_re.match(line):
                        ind_type = "ip"
                    elif url_re.match(line):
                        ind_type = "url"
                    elif hash_re.match(line):
                        ind_type = "hash"
                    elif domain_re.match(line):
                        ind_type = "domain"
                    else:
                        continue
                    _upsert_indicator_with_conn(conn, ind_type=ind_type, value=line,
                                                 source=source_label, confidence=0.7)
                    imported_indicators += 1
                conn.commit()

        # ── 3. Persist URL as a scheduled feed source ───────────────────────────
        if payload.feed_url and not errors:
            src_id = "url_" + __import__("hashlib").sha256(payload.feed_url.strip().encode()).hexdigest()[:16]
            with get_conn() as conn:
                conn.execute(
                    """INSERT INTO threat_feed_sources (
                        id, name, indicator_type, reliability, items_json,
                        is_enabled, ingest_interval_minutes, last_status, feed_url
                    ) VALUES (?, ?, ?, ?, ?, 1, 60, 'imported', ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name=excluded.name,
                        feed_url=excluded.feed_url,
                        last_status='imported'""",
                    (
                        src_id,
                        (payload.feed_url.strip()[:80]),
                        (payload.feed_format or "txt").lower(),
                        0.7,
                        "[]",
                        payload.feed_url.strip(),
                    ),
                )
                conn.commit()

    return {
        "status": "imported",
        "actors": imported_actors,
        "indicators": imported_indicators,
        "errors": errors,
    }


# ── /api/threat-intel/search ────────────────────────────────────────────────
@app.get("/api/threat-intel/search") # type: ignore
def threat_intel_search(
    indicator: str = "",
    indicator_type: Optional[str] = None,
    limit: int = 50,
) -> object:
    """
    Search indicators table for a value substring.
    Also returns matching threat actors (ips / domains / campaigns).
    """
    if not indicator or len(indicator.strip()) < 2:
        raise HTTPException(status_code=400, detail="indicator query must be at least 2 characters")
    safe_limit = min(max(limit, 1), 200)
    q = f"%{indicator.strip()}%"

    with get_conn() as conn:
        # Indicators match
        ind_query = "SELECT type, value, source, confidence_score, last_seen FROM indicators WHERE value LIKE ?"
        params: list[object] = [q]
        if indicator_type:
            ind_query += " AND type = ?"
            params.append(indicator_type.lower())
        ind_query += " ORDER BY confidence_score DESC, last_seen DESC LIMIT ?"
        params.append(safe_limit)
        ind_rows = [dict(r) for r in conn.execute(ind_query, params).fetchall()]

        # Threat actor matches (known_ips, known_domains, known_campaigns contain JSON arrays)
        actor_rows_raw = conn.execute(
            """SELECT actor_id, actor_name, known_ips, known_domains, known_campaigns,
                      attack_techniques, target_industries, updated_at
               FROM threat_actors
               WHERE known_ips LIKE ? OR known_domains LIKE ?
                  OR known_campaigns LIKE ? OR actor_name LIKE ?
               LIMIT 20""",
            (q, q, q, q),
        ).fetchall()
        actor_rows = []
        for r in actor_rows_raw:
            d = dict(r)
            for k in ("known_ips", "known_domains", "known_campaigns", "attack_techniques", "target_industries"):
                d[k] = json.loads(d.get(k) or "[]")
            actor_rows.append(d)

    return {
        "query": indicator,
        "indicator_type_filter": indicator_type,
        "indicators": ind_rows,
        "threat_actors": actor_rows,
        "total_indicators": len(ind_rows),
        "total_actors": len(actor_rows),
    }


# ── /api/threat-intel/feeds  (list configured feed sources) ─────────────────
@app.get("/api/threat-intel/feeds") # type: ignore
def threat_intel_feeds_list() -> object:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, name, indicator_type, reliability, feed_url, is_enabled,
                      ingest_interval_minutes, last_status, last_run_at
               FROM threat_feed_sources ORDER BY name ASC"""
        ).fetchall()
    return [dict(r) for r in rows]


# ── /api/threat-intel/indicators (paginated list) ───────────────────────────
@app.get("/api/threat-intel/indicators") # type: ignore
def threat_intel_indicators_list(
    indicator_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> object:
    safe_limit = min(max(limit, 1), 500)
    safe_offset = max(offset, 0)
    with get_conn() as conn:
        base = "SELECT type, value, source, confidence_score, last_seen FROM indicators"
        params: list[object] = []
        if indicator_type:
            base += " WHERE type = ?"
            params.append(indicator_type.lower())
        base += " ORDER BY last_seen DESC LIMIT ? OFFSET ?"
        params += [safe_limit, safe_offset]
        rows = [dict(r) for r in conn.execute(base, params).fetchall()]
        total_row = conn.execute(
            "SELECT COUNT(*) FROM indicators" + (" WHERE type=?" if indicator_type else ""),
            ([indicator_type.lower()] if indicator_type else []),
        ).fetchone()
    return {
        "indicators": rows,
        "total": int(total_row[0]) if total_row else 0,
        "limit": safe_limit,
        "offset": safe_offset,
    }


@app.post("/api/threat-attribution/analyze") # type: ignore
def threat_attribution_analyze(req: ThreatAttributionAnalyzeIn) -> object:
    with get_conn() as conn:
        incident = conn.execute("SELECT * FROM incidents WHERE id=?", (req.incident_id,)).fetchone()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident_dict = dict(incident)
        threat_id = incident_dict.get("threat_id")
        threats: list[dict] = [] # pyright: ignore[reportMissingTypeArgument, reportUnknownVariableType]
        if threat_id:
            threats = [dict(r) for r in conn.execute("SELECT * FROM threats WHERE id=?", (threat_id,)).fetchall()] # type: ignore

        telemetry = [
            dict(r)
            for r in conn.execute("SELECT * FROM telemetry_events ORDER BY timestamp DESC LIMIT 500").fetchall()
        ]
        alerts = [dict(r) for r in conn.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 500").fetchall()]
        actors = [dict(r) for r in conn.execute("SELECT * FROM threat_actors").fetchall()]

        if not actors:
            raise HTTPException(status_code=400, detail="No threat actors available. Import threat intel first.")

        analysis = analyze_attribution( # pyright: ignore[reportUnknownVariableType]
            incident=incident_dict,
            threats=threats,
            telemetry=telemetry,
            alerts=alerts,
            threat_actors=actors, # pyright: ignore[reportCallIssue]
        ) # type: ignore

        attribution_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO incident_attributions (
                id, incident_id, possible_actor, confidence,
                matching_techniques, matching_indicators, analysis_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attribution_id,
                req.incident_id,
                analysis.get("possible_actor"), # pyright: ignore[reportUnknownMemberType]
                float(analysis.get("confidence") or 0.0), # pyright: ignore[reportUnknownMemberType]
                json.dumps(analysis.get("matching_techniques", [])), # pyright: ignore[reportUnknownMemberType]
                json.dumps(analysis.get("matching_indicators", [])), # type: ignore
                json.dumps(analysis),
            ), # type: ignore
        )
        conn.commit()

    queue_broadcast(
        "threat_actor_activity",
        {
            "incident_id": req.incident_id,
            "attribution_id": attribution_id,
            "possible_actor": analysis.get("possible_actor"),
            "confidence": analysis.get("confidence"),
            "matching_techniques": analysis.get("matching_techniques", []),
        },
    )

    return {
        "incident_id": req.incident_id,
        "possible_actor": analysis.get("possible_actor"),
        "confidence": analysis.get("confidence"),
        "matching_techniques": analysis.get("matching_techniques", []),
        "matching_indicators": analysis.get("matching_indicators", []),
        "attribution_id": attribution_id,
        "candidates": analysis.get("candidates", []), # type: ignore
    } # pyright: ignore[reportUnknownVariableType] # type: ignore



@app.get("/api/threat-attribution/incident/{incident_id}") # type: ignore
def threat_attribution_get_latest(incident_id: str) -> object:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM incident_attributions WHERE incident_id=? ORDER BY created_at DESC LIMIT 1",
            (incident_id,),
        ).fetchone()
    if not row:
        return {"incident_id": incident_id, "attribution": None}

    d = dict(row)
    return {
        "incident_id": incident_id,
        "attribution": {
            "possible_actor": d.get("possible_actor"),
            "confidence": d.get("confidence"),
            "matching_techniques": json.loads(d.get("matching_techniques") or "[]"),
            "matching_indicators": json.loads(d.get("matching_indicators") or "[]"),
            "analysis": json.loads(d.get("analysis_json") or "{}"),
            "created_at": d.get("created_at"),
        },
    }


@app.get("/api/indicators") # type: ignore
def list_indicators(limit: int = 200):
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT type, value, source, confidence_score, last_seen FROM indicators ORDER BY last_seen DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/alerts/create") # type: ignore
def create_alert(alert: AlertIn) -> object:
    created = create_alert_row(
        alert_type=alert.alert_type,
        severity=alert.severity,
        matched_indicator=alert.matched_indicator,
        source_event=alert.source_event,
        source_event_id=alert.source_event_id,
    )
    return {"status": "created", "alert": created}


@app.get("/api/alerts/live") # type: ignore
def live_alert_feed(limit: int = 50):
    safe_limit = min(max(limit, 1), 200)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    result: list[dict[str, object]] = []
    for r in rows:
        item = dict(r)
        if item.get("source_event"):
            try:
                item["source_event"] = json.loads(str(item["source_event"]))
            except Exception:
                pass
        if item.get("analyst_playbook_steps"):
            try:
                item["analyst_playbook_steps"] = json.loads(str(item["analyst_playbook_steps"]))
            except Exception:
                item["analyst_playbook_steps"] = []
        result.append(item)
    return result


@app.post("/api/ai-analyst/run") # type: ignore
def run_ai_soc_analyst(limit: int = 100) -> object:
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id FROM alerts
               WHERE analyst_status IS NULL OR analyst_status IN ('open', 'investigated')
               ORDER BY timestamp DESC
               LIMIT ?""",
            (safe_limit,),
        ).fetchall()
    analyzed = [
        result
        for row in rows
        for result in [analyze_alert_autonomously(str(row["id"]))]
        if result is not None
    ]
    false_positives = sum(1 for a in analyzed if a.get("analyst_status") == "closed_false_positive")
    return {
        "status": "completed",
        "processed": len(analyzed),
        "false_positives_closed": false_positives,
        "results": analyzed,
    }


@app.get("/api/ai-analyst/findings") # type: ignore
def ai_analyst_findings(limit: int = 100):
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM alerts
               ORDER BY timestamp DESC
               LIMIT ?""",
            (safe_limit,),
        ).fetchall()
    findings: list[dict[str, object]] = []
    for row in rows:
        item = dict(row)
        if item.get("source_event"):
            try:
                item["source_event"] = json.loads(str(item["source_event"]))
            except Exception:
                pass
        if item.get("analyst_playbook_steps"):
            try:
                item["analyst_playbook_steps"] = json.loads(str(item["analyst_playbook_steps"]))
            except Exception:
                item["analyst_playbook_steps"] = []
        findings.append(item)
    return findings


@app.get("/api/ai-analyst/summary") # type: ignore
def ai_analyst_summary() -> object:
    with get_conn() as conn:
        total_alerts = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
        investigated = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE analyst_status='investigated'"
        ).fetchone()[0]
        false_positive_closed = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE analyst_status='closed_false_positive'"
        ).fetchone()[0]
        class_breakdown = conn.execute(
            """SELECT COALESCE(attack_classification,'unknown') AS classification, COUNT(*) AS count
               FROM alerts
               GROUP BY classification
               ORDER BY count DESC"""
        ).fetchall()
        decision_breakdown = conn.execute(
            """SELECT COALESCE(analyst_decision_source,'rule_engine') AS source, COUNT(*) AS count
               FROM alerts
               GROUP BY source
               ORDER BY count DESC"""
        ).fetchall()
    return {
        "total_alerts": total_alerts,
        "investigated": investigated,
        "false_positive_closed": false_positive_closed,
        "classifications": [dict(r) for r in class_breakdown],
        "decision_sources": [dict(r) for r in decision_breakdown],
    }


@app.patch("/api/ai-analyst/alerts/{alert_id}/disposition") # type: ignore
def update_ai_alert_disposition(alert_id: str, disposition: str):
    allowed = {"open", "investigated", "closed_false_positive", "escalated"}
    if disposition not in allowed:
        raise HTTPException(status_code=400, detail=f"disposition must be one of {allowed}")
    with get_conn() as conn:
        result = conn.execute(
            "UPDATE alerts SET analyst_status=? WHERE id=?",
            (disposition, alert_id),
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
    payload = {"id": alert_id, "analyst_status": disposition}
    queue_broadcast("analyst_update", payload)
    return payload


@app.post("/api/soc-ai/dry-run") # type: ignore
def soc_ai_dry_run(req: SocAiDryRunIn) -> object:
    with get_conn() as conn:
        alert = conn.execute("SELECT * FROM alerts WHERE id=?", (req.alert_id,)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        rule_decision = _rule_engine_decision_from_alert(alert)
        llm_decision = _llm_dry_run_decision(alert, rule_decision)

        run_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO soc_ai_dry_runs (
                    id, alert_id,
                    rule_action, rule_confidence, rule_payload,
                    llm_action, llm_confidence, llm_payload
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                run_id,
                req.alert_id,
                str(rule_decision["action"]),
                float(rule_decision["confidence"]), # type: ignore
                json.dumps(rule_decision),
                str(llm_decision["action"]),
                float(llm_decision["confidence"]), # pyright: ignore[reportArgumentType]
                json.dumps(llm_decision),
            ),
        )
        conn.commit()

    return {
        "dry_run_id": run_id,
        "alert_id": req.alert_id,
        "rule_engine_decision": rule_decision,
        "llm_decision": llm_decision,
    }


@app.post("/api/soc-ai/dry-run/{dry_run_id}/apply") # type: ignore
def soc_ai_apply_decision(dry_run_id: str, req: SocAiDecisionApplyIn) -> object:
    choice = req.choice.strip().lower()
    if choice not in {"rule_engine", "llm", "none"}:
        raise HTTPException(status_code=400, detail="choice must be one of: rule_engine, llm, none")

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM soc_ai_dry_runs WHERE id=?", (dry_run_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dry run not found")

        alert = conn.execute("SELECT * FROM alerts WHERE id=?", (row["alert_id"],)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Related alert not found")

        applied_action = "take_no_action"
        applied_confidence = 0.0
        applied_source = "none"

        if choice == "rule_engine":
            payload = json.loads(str(row["rule_payload"] or "{}"))
            applied_action = str(payload.get("action") or row["rule_action"] or "monitor_activity")
            applied_confidence = float(payload.get("confidence") or row["rule_confidence"] or 0.0)
            applied_source = "rule_engine"
        elif choice == "llm":
            payload = json.loads(str(row["llm_payload"] or "{}"))
            applied_action = str(payload.get("action") or row["llm_action"] or "monitor_activity")
            applied_confidence = float(payload.get("confidence") or row["llm_confidence"] or 0.0)
            applied_source = "llm_guardrailed"

        analyst_status = "investigated"
        if applied_action == "take_no_action" or choice == "none":
            analyst_status = "closed_false_positive"

        # Persist on audit table
        conn.execute(
            """UPDATE soc_ai_dry_runs
               SET analyst_choice=?, applied_action=?, applied_confidence=?, applied_source=?, notes=?
               WHERE id=?""",
            (choice, applied_action, applied_confidence, applied_source, req.notes, dry_run_id),
        )

        # Apply selected decision outcome to alert
        appended_note = (str(alert["analyst_notes"] or "") + f"\n[DryRun:{dry_run_id}] choice={choice}; action={applied_action}; source={applied_source}; notes={req.notes or ''}").strip()
        recommendation = str(alert["analyst_recommendation"] or "")
        if applied_action == "block_ip":
            recommendation = "Block matched malicious IP at perimeter controls and monitor recurrence."
        elif applied_action == "block_domain":
            recommendation = "Block domain in DNS/email gateways and reset affected credentials."
        elif applied_action == "isolate_host":
            recommendation = "Isolate affected endpoint and begin malware containment workflow."
        elif applied_action == "reset_credentials":
            recommendation = "Reset credentials, invalidate sessions, and enforce MFA challenge."
        elif applied_action == "segment_network":
            recommendation = "Constrain east-west traffic and investigate potential lateral movement."
        elif applied_action == "block_egress":
            recommendation = "Block suspicious egress path and initiate exfiltration response process."
        elif applied_action == "monitor_activity":
            recommendation = "Maintain high-frequency monitoring and escalate on recurrence." 
        elif applied_action == "tune_detection_policy":
            recommendation = "Tune detection policy thresholds and validate alert precision."
        elif applied_action == "take_no_action":
            recommendation = "No immediate action applied; observation-only posture."

        conn.execute(
            """UPDATE alerts
               SET analyst_status=?, analyst_recommendation=?, analyst_decision_source=?, analyst_notes=?
               WHERE id=?""",
            (analyst_status, recommendation, applied_source, appended_note, row["alert_id"]),
        )
        conn.commit()

    payload = { # type: ignore
        "dry_run_id": dry_run_id,
        "alert_id": row["alert_id"],
        "choice": choice,
        "applied_action": applied_action,
        "applied_confidence": round(applied_confidence, 2),
        "applied_source": applied_source,
        "analyst_status": analyst_status,
    }
    queue_broadcast("analyst_update", payload) # pyright: ignore[reportUnknownArgumentType]
    return payload


@app.get("/api/soc-ai/dry-run/logs") # type: ignore
def soc_ai_dry_run_logs(limit: int = 100):
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM soc_ai_dry_runs ORDER BY created_at DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    result: list[dict[str, object]] = []
    for r in rows:
        item = dict(r)
        for field in ("rule_payload", "llm_payload"):
            if item.get(field):
                try:
                    item[field] = json.loads(str(item[field]))
                except Exception:
                    pass
        result.append(item)
    return result


@app.get("/api/alerts/{alert_id}/explain") # type: ignore
def explain_alert_confidence(alert_id: str) -> object:
    """Return human-readable explanation of why the AI assigned this confidence score."""
    with get_conn() as conn:
        alert = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

    classification = str(alert["attack_classification"] or "suspicious_activity")
    confidence = float(alert["analyst_confidence"] or 0.65)
    decision_source = str(alert["analyst_decision_source"] or "rule_engine")
    notes = str(alert["analyst_notes"] or "")
    severity = str(alert["severity"] or "MEDIUM").upper()

    # Build factor list
    factors: list[dict[str, object]] = []

    # Factor 1: classification base confidence
    base_by_class: dict[str, float] = {
        "phishing": 0.80,
        "malware": 0.85,
        "credential_access": 0.75,
        "reconnaissance": 0.70,
        "lateral_movement": 0.80,
        "data_exfiltration": 0.85,
        "policy_violation": 0.65,
        "suspicious_activity": 0.55,
    }
    base = base_by_class.get(classification, 0.55)
    factors.append({
        "factor": "Classification base confidence",
        "detail": f"'{classification}' has a rule-engine baseline of {round(base * 100)}%",
        "impact": "base",
    })

    # Factor 2: severity modifier
    sev_boost = {"CRITICAL": +0.10, "HIGH": +0.05, "MEDIUM": 0.0, "LOW": -0.05, "INFO": -0.10}
    boost = sev_boost.get(severity, 0.0)
    if boost != 0.0:
        direction = "raises" if boost > 0 else "lowers"
        factors.append({
            "factor": "Severity modifier",
            "detail": f"Severity '{severity}' {direction} confidence by {abs(round(boost * 100))}%",
            "impact": "positive" if boost > 0 else "negative",
        })

    # Factor 3: false-positive / status
    analyst_status = str(alert["analyst_status"] or "open")
    if analyst_status == "closed_false_positive":
        factors.append({
            "factor": "False-positive indicator",
            "detail": "Alert was previously classified as a false positive — confidence capped at 60%",
            "impact": "negative",
        })

    # Factor 4: decision source
    if decision_source == "llm_guardrailed":
        factors.append({
            "factor": "LLM enrichment applied",
            "detail": "Confidence was refined by the LLM co-pilot under SOC guardrails",
            "impact": "positive",
        })
    elif decision_source == "llm_unavailable":
        factors.append({
            "factor": "LLM unavailable",
            "detail": "Confidence is based solely on the rule engine — LLM was unreachable",
            "impact": "neutral",
        })
    else:
        factors.append({
            "factor": "Rule-engine only",
            "detail": "No LLM enrichment; confidence is derived from deterministic rule matching",
            "impact": "neutral",
        })

    # Factor 5: analyst notes context
    if notes:
        factors.append({
            "factor": "Analyst context",
            "detail": notes[:200],
            "impact": "neutral",
        })

    recommendation = str(alert["analyst_recommendation"] or "No recommendation available.")
    action = _action_for_classification(classification)

    return {
        "alert_id": alert_id,
        "confidence": round(confidence, 2),
        "confidence_pct": round(confidence * 100),
        "classification": classification,
        "decision_source": decision_source,
        "recommended_action": action,
        "recommendation": recommendation,
        "explanation_factors": factors,
        "summary": (
            f"The AI assigned {round(confidence * 100)}% confidence based on "
            f"a '{classification}' classification (severity: {severity}). "
            f"Decision source: {decision_source.replace('_', ' ')}."
        ),
    }


class ExecuteDefenseIn(BaseModel):
    action: str
    target: str = ""
    incident_id: Optional[str] = None
    executed_by: str = "analyst"
    rationale: str = ""
    playbook_name: str = "Manual Response"


class ExecuteDefenseIncidentIn(BaseModel):
    incident_id: str
    action: str
    target: str = ""
    executed_by: str = "analyst"
    rationale: str = ""
    playbook_name: str = "Manual Response"


class DefenseModeIn(BaseModel):
    mode: str


ALLOWED_DEFENSE_ACTIONS: frozenset[str] = frozenset(
    set(SUPPORTED_DEFENSE_ACTIONS).union(
        {
            "isolate_host",
            "reset_credentials",
            "segment_network",
            "block_egress",
            "monitor_activity",
            "tune_detection_policy",
            "take_no_action",
        }
    )
)


@app.get("/api/defense/mode") # type: ignore
def get_defense_mode() -> object:
    with get_conn() as conn:
        mode = _get_defense_mode(conn)
    return {"mode": mode, "supported_modes": sorted(["monitor_only", "analyst_approval_required", "full_autonomous"])}


@app.post("/api/defense/mode") # type: ignore
def set_defense_mode(req: DefenseModeIn) -> object:
    with get_conn() as conn:
        mode = _set_defense_mode(conn, req.mode)
        conn.commit()
    return {"status": "updated", "mode": mode}


@app.get("/api/incidents/{incident_id}/defense/recommendations") # type: ignore
def get_incident_defense_recommendations(incident_id: str) -> object:
    with get_conn() as conn:
        return _recommend_defense_actions_for_incident(conn, incident_id)


@app.post("/api/defense/execute", status_code=201) # type: ignore
def execute_defense_for_incident(req: ExecuteDefenseIncidentIn) -> object:
    action = req.action.strip().lower()
    if action not in ALLOWED_DEFENSE_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

    executed_by = (req.executed_by or "analyst").strip()[:80]
    rationale = (req.rationale or "").strip()[:400]
    target = (req.target or "").strip()[:200]

    with get_conn() as conn:
        incident = conn.execute("SELECT * FROM incidents WHERE id=?", (req.incident_id,)).fetchone()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        mode = _get_defense_mode(conn)
        status = "executed" if mode == "full_autonomous" else ("pending" if mode == "analyst_approval_required" else "monitored")
        approval_state = "approved" if mode == "full_autonomous" else ("pending" if mode == "analyst_approval_required" else "not_required")

        payload = _record_defense_action(
            conn,
            alert_id=None,
            incident_id=req.incident_id,
            action=action,
            target=target,
            confidence=0.78,
            classification="incident_response",
            executed_by=executed_by,
            rationale=rationale or "Manual defense execution from API",
            status=status,
            approval_state=approval_state,
            execution_mode=mode,
            playbook_name=(req.playbook_name or "Manual Response")[:120],
        )
        conn.commit()

    queue_broadcast("defense_action", payload)
    return payload


@app.post("/api/alerts/{alert_id}/execute-defense", status_code=201) # type: ignore
def execute_defense_action(alert_id: str, req: ExecuteDefenseIn) -> object:
    """Record an autonomous/manual defense action for an alert and update its status."""
    action = req.action.strip().lower()
    if action not in ALLOWED_DEFENSE_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"action must be one of: {', '.join(sorted(ALLOWED_DEFENSE_ACTIONS))}",
        )
    executed_by = (req.executed_by or "analyst").strip()[:80]
    rationale = (req.rationale or "").strip()[:400]
    target = (req.target or "").strip()[:200]

    with get_conn() as conn:
        alert = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        classification = str(alert["attack_classification"] or "suspicious_activity")
        confidence = float(alert["analyst_confidence"] or 0.65)
        mode = _get_defense_mode(conn)

        payload = _record_defense_action(
            conn,
            alert_id=alert_id,
            incident_id=req.incident_id,
            action=action,
            target=target,
            confidence=confidence,
            classification=classification,
            executed_by=executed_by,
            rationale=rationale,
            status="executed",
            approval_state="approved" if mode != "analyst_approval_required" else "pending",
            execution_mode=mode,
            playbook_name=(req.playbook_name or "Manual Response")[:120],
        )

        new_status = "closed_false_positive" if action == "take_no_action" else "investigated"
        appended_note = (
            str(alert["analyst_notes"] or "")
            + f"\n[Defense:{payload['log_id']}] action={action}; by={executed_by}; rationale={rationale}; target={target}"
        ).strip()
        conn.execute(
            "UPDATE alerts SET analyst_status=?, analyst_notes=? WHERE id=?",
            (new_status, appended_note, alert_id),
        )
        conn.commit()

    payload["new_alert_status"] = new_status
    queue_broadcast("defense_action", payload)
    return payload


@app.get("/api/alerts/{alert_id}/defense-log") # type: ignore
def get_defense_log(alert_id: str):
    """Return all defense actions executed for a specific alert."""
    with get_conn() as conn:
        alert = conn.execute("SELECT id FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        rows = conn.execute(
            "SELECT * FROM autonomous_defense_log WHERE alert_id=? ORDER BY created_at DESC",
            (alert_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/defense-log") # type: ignore
def get_all_defense_log(
    limit: int = 200,
    incident_id: Optional[str] = None,
    analyst: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """Return all defense actions across all alerts (for audit dashboard)."""
    safe_limit = min(max(limit, 1), 1000)
    query = "SELECT * FROM autonomous_defense_log WHERE 1=1"
    params: list[object] = []
    if incident_id:
        query += " AND incident_id=?"
        params.append(incident_id)
    if analyst:
        query += " AND executed_by=?"
        params.append(analyst)
    if date_from:
        query += " AND datetime(created_at) >= datetime(?)"
        params.append(date_from)
    if date_to:
        query += " AND datetime(created_at) <= datetime(?)"
        params.append(date_to)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(safe_limit)
    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/defense/{log_id}/approve") # type: ignore
def approve_defense_action(log_id: str, actor: str = "analyst") -> object:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM autonomous_defense_log WHERE id=?", (log_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Defense action not found")
        conn.execute(
            """UPDATE autonomous_defense_log
               SET approval_state='approved', approved_by=?, status='executed'
               WHERE id=?""",
            (actor[:80], log_id),
        )
        conn.commit()
    payload = {"log_id": log_id, "status": "executed", "approval_state": "approved", "approved_by": actor[:80]}
    queue_broadcast("defense_action", payload)
    return payload


@app.post("/api/defense/{log_id}/reject") # type: ignore
def reject_defense_action(log_id: str, actor: str = "analyst") -> object:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM autonomous_defense_log WHERE id=?", (log_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Defense action not found")
        conn.execute(
            """UPDATE autonomous_defense_log
               SET approval_state='rejected', approved_by=?, status='rejected'
               WHERE id=?""",
            (actor[:80], log_id),
        )
        conn.commit()
    payload = {"log_id": log_id, "status": "rejected", "approval_state": "rejected", "approved_by": actor[:80]}
    queue_broadcast("defense_action", payload)
    return payload


@app.post("/api/defense/{log_id}/execute-now") # type: ignore
def execute_now_defense_action(log_id: str, actor: str = "analyst") -> object:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM autonomous_defense_log WHERE id=?", (log_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Defense action not found")
        conn.execute(
            """UPDATE autonomous_defense_log
               SET approval_state='approved', approved_by=?, status='executed'
               WHERE id=?""",
            (actor[:80], log_id),
        )
        if row["incident_id"]:
            conn.execute(
                """INSERT INTO incident_events (incident_id, description, actor, event_type)
                   VALUES (?, ?, ?, 'defense_action')""",
                (
                    str(row["incident_id"]),
                    f"Defense action {row['action']} executed now by {actor[:80]}",
                    actor[:80],
                ),
            )
        conn.commit()
    payload = {"log_id": log_id, "status": "executed", "approval_state": "approved", "approved_by": actor[:80]}
    queue_broadcast("defense_action", payload)
    return payload


@app.get("/api/replay/scenarios") # type: ignore
def replay_scenarios(limit: int = 100):
    safe_limit = min(max(limit, 1), 300)
    with get_conn() as conn:
        incident_rows = conn.execute(
            "SELECT id, title, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
        alert_rows = conn.execute(
            "SELECT id, alert_type, severity, analyst_status, timestamp FROM alerts ORDER BY timestamp DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()

        scenarios: list[dict[str, object]] = []
        for r in incident_rows:
            scenarios.append(
                {
                    "scenario_id": f"incident_{r['id']}",
                    "kind": "incident",
                    "title": str(r["title"] or "Incident"),
                    "severity": str(r["severity"] or "MEDIUM"),
                    "status": str(r["status"] or "open"),
                    "start_time": _normalize_ts(str(r["created_at"] or "")),
                }
            )
        for r in alert_rows:
            scenarios.append(
                {
                    "scenario_id": f"alert_{r['id']}",
                    "kind": "alert",
                    "title": str(r["alert_type"] or "Alert"),
                    "severity": str(r["severity"] or "MEDIUM"),
                    "status": str(r["analyst_status"] or "open"),
                    "start_time": _normalize_ts(str(r["timestamp"] or "")),
                }
            )

    scenarios = sorted(scenarios, key=lambda s: str(s.get("start_time") or ""), reverse=True)
    return scenarios[:safe_limit]


@app.get("/api/replay/{scenario_id}") # type: ignore
def replay_scenario_detail(scenario_id: str):
    with get_conn() as conn:
        if scenario_id.startswith("incident_"):
            incident_id = scenario_id.replace("incident_", "", 1)
            payload = _build_incident_replay(conn, incident_id)
        elif scenario_id.startswith("alert_"):
            alert_id = scenario_id.replace("alert_", "", 1)
            payload = _build_alert_replay(conn, alert_id)
        else:
            raise HTTPException(status_code=400, detail="scenario_id must start with incident_ or alert_")

    if not payload:
        raise HTTPException(status_code=404, detail="Replay scenario not found")
    return payload


# ── Alert triage ─────────────────────────────────────────────────────────────

ALLOWED_VERDICT = {"true_positive", "false_positive", "escalated", "inconclusive", "benign"}


@app.patch("/api/alerts/{alert_id}/triage") # type: ignore
def triage_alert(alert_id: str, req: AlertTriageIn):
    verdict = (req.verdict or "").strip().lower()
    if verdict not in ALLOWED_VERDICT:
        raise HTTPException(status_code=400, detail=f"verdict must be one of {sorted(ALLOWED_VERDICT)}")

    allowed_status = {"open", "investigated", "closed_false_positive", "escalated", "resolved"}
    status_val = (req.status or "").strip().lower()
    if status_val and status_val not in allowed_status:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(allowed_status)}")

    final_status = status_val or ("closed_false_positive" if verdict == "false_positive" else "investigated")
    assigned = str(req.assigned_to or "")[:120] if req.assigned_to else None
    notes = str(req.notes or "")[:2000] if req.notes else None
    triage_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with get_conn() as conn:
        row = conn.execute("SELECT id FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        conn.execute(
            """UPDATE alerts
               SET analyst_verdict=?, analyst_status=?, analyst_triage_at=?,
                   analyst_assigned_to=COALESCE(?, analyst_assigned_to),
                   analyst_notes=COALESCE(?, analyst_notes),
                   analyst_decision_source='analyst'
               WHERE id=?""",
            (verdict, final_status, triage_at, assigned, notes, alert_id),
        )
        conn.commit()

    payload = {
        "id": alert_id,
        "analyst_verdict": verdict,
        "analyst_status": final_status,
        "analyst_triage_at": triage_at,
        "analyst_assigned_to": assigned,
    }
    queue_broadcast("alert_triage", payload)
    return payload


# ── SOC Case Management ───────────────────────────────────────────────────────

@app.get("/api/cases") # type: ignore
def list_cases(request: Request, status: Optional[str] = None, limit: int = 100):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM soc_cases WHERE org_id=? AND status=? ORDER BY updated_at DESC LIMIT ?",
                (org_id, status, safe_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM soc_cases WHERE org_id=? ORDER BY updated_at DESC LIMIT ?",
                (org_id, safe_limit),
            ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/cases", status_code=201) # type: ignore
def create_case(request: Request, req: CaseCreateIn):  # type: ignore
    _require_role(request, _CASE_WRITE_ROLES)
    # Always scope the new case to the tenant from the validated header
    req.org_id = _org_from_request(request)
    validated = validate_case_payload({
        "case_id": f"case_{uuid.uuid4().hex[:12]}",
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
        "status": req.status,
        "assigned_analyst": req.assigned_analyst,
        "incident_id": req.incident_id or "",
        "org_id": req.org_id,
    })
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO soc_cases (id, title, description, severity, status,
               assigned_analyst, incident_id, org_id, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                validated["case_id"], validated["title"], validated["description"],
                validated["severity"], validated["status"], validated["assigned_analyst"],
                validated["incident_id"], validated["org_id"], str(req.created_by or "analyst")[:80],
                now, now,
            ),
        )
        ev_type, ev_actor, ev_desc, ev_payload = create_case_timeline_event(
            "case_created", str(req.created_by or "analyst"), f"Case '{validated['title']}' created"
        )
        conn.execute(
            "INSERT INTO case_timeline_events (id, case_id, event_type, actor, description, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
            (f"evt_{uuid.uuid4().hex[:10]}", validated["case_id"], ev_type, ev_actor, ev_desc, ev_payload),
        )
        conn.commit()

    queue_broadcast("case_created", {"id": validated["case_id"], "title": validated["title"]})
    return {**validated, "created_at": now, "updated_at": now, "created_by": req.created_by}


@app.get("/api/cases/{case_id}") # type: ignore
def get_case(case_id: str, request: Request):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM soc_cases WHERE id=? AND org_id=?", (case_id, org_id)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Case not found")
        timeline = conn.execute(
            "SELECT * FROM case_timeline_events WHERE case_id=? ORDER BY created_at ASC",
            (case_id,),
        ).fetchall()
    return {**dict(row), "timeline": [dict(t) for t in timeline]}


@app.patch("/api/cases/{case_id}") # type: ignore
def patch_case(case_id: str, req: CasePatchIn, request: Request):  # type: ignore
    _require_role(request, _CASE_WRITE_ROLES)
    org_id = _org_from_request(request)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    updates: list[str] = []
    params: list[object] = []

    if req.title is not None:
        updates.append("title=?"); params.append(str(req.title)[:180])
    if req.description is not None:
        updates.append("description=?"); params.append(str(req.description)[:4000])
    if req.severity is not None:
        sev = str(req.severity).strip().upper()
        if sev not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
            raise HTTPException(status_code=400, detail="Invalid severity")
        updates.append("severity=?"); params.append(sev)
    if req.status is not None:
        st = normalize_case_status(req.status)
        updates.append("status=?"); params.append(st)
    if req.assigned_analyst is not None:
        updates.append("assigned_analyst=?"); params.append(str(req.assigned_analyst)[:180])

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at=?"); params.append(now)
    params.append(case_id)
    params.append(org_id)  # tenant ownership check

    with get_conn() as conn:
        result = conn.execute(
            f"UPDATE soc_cases SET {', '.join(updates)} WHERE id=? AND org_id=?", params
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Case not found")
    return {"id": case_id, "updated_at": now}


@app.post("/api/cases/{case_id}/notes", status_code=201) # type: ignore
def add_case_note(case_id: str, req: CaseNoteIn, request: Request):  # type: ignore
    _require_role(request, _CASE_WRITE_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM soc_cases WHERE id=? AND org_id=?", (case_id, org_id)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Case not found")
        note_id = f"note_{uuid.uuid4().hex[:10]}"
        conn.execute(
            "INSERT INTO case_timeline_events (id, case_id, event_type, actor, description, payload_json) VALUES (?, ?, 'note', ?, ?, ?)",
            (note_id, case_id, str(req.author or "analyst")[:80], str(req.text)[:2000], "{}"),
        )
        conn.execute("UPDATE soc_cases SET updated_at=datetime('now') WHERE id=?", (case_id,))
        conn.commit()
    return {"id": note_id, "case_id": case_id, "event_type": "note", "actor": req.author, "description": req.text}


# ── Data Connectors ───────────────────────────────────────────────────────────

@app.get("/api/connectors") # type: ignore
def list_connectors(request: Request):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM data_connectors WHERE org_id=? ORDER BY created_at DESC",
            (org_id,),
        ).fetchall()
    result = []
    for r in rows:
        item = dict(r)
        item.pop("config_encrypted", None)
        result.append(item)
    return result


@app.get("/api/connectors/types") # type: ignore
def connector_types():
    return {"types": sorted(CONNECTOR_TYPES)}


@app.post("/api/connectors", status_code=201) # type: ignore
def create_connector(request: Request, req: ConnectorCreateIn):  # type: ignore
    _require_role(request, _CONNECTOR_WRITE_ROLES)
    req.org_id = _org_from_request(request)
    if req.connector_type not in CONNECTOR_TYPES:
        raise HTTPException(status_code=400, detail=f"connector_type must be one of {sorted(CONNECTOR_TYPES)}")
    conn_id = f"conn_{uuid.uuid4().hex[:12]}"
    encrypted = protect_connector_secret(dict(req.config or {}))
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO data_connectors (id, name, connector_type, status, config_encrypted, org_id, created_by, created_at, updated_at)
               VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)""",
            (conn_id, str(req.name)[:180], req.connector_type, encrypted, req.org_id, str(req.created_by or "analyst")[:80], now, now),
        )
        conn.commit()
    return {"id": conn_id, "name": req.name, "connector_type": req.connector_type, "status": "active", "org_id": req.org_id, "created_at": now}


@app.patch("/api/connectors/{connector_id}") # type: ignore
def patch_connector(connector_id: str, req: ConnectorPatchIn, request: Request):  # type: ignore
    _require_role(request, _CONNECTOR_WRITE_ROLES)
    org_id = _org_from_request(request)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    updates: list[str] = ["updated_at=?"]
    params: list[object] = [now]

    if req.name is not None:
        updates.append("name=?"); params.append(str(req.name)[:180])
    if req.status is not None:
        st = normalize_connector_status(req.status)
        updates.append("status=?"); params.append(st)
    if req.config is not None:
        updates.append("config_encrypted=?"); params.append(protect_connector_secret(dict(req.config)))

    params.append(connector_id)
    params.append(org_id)  # tenant ownership check
    with get_conn() as conn:
        result = conn.execute(f"UPDATE data_connectors SET {', '.join(updates)} WHERE id=? AND org_id=?", params)
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Connector not found")
    return {"id": connector_id, "updated_at": now}


@app.post("/api/connectors/{connector_id}/test") # type: ignore
def test_connector(connector_id: str, request: Request):  # type: ignore
    _require_role(request, _CONNECTOR_WRITE_ROLES | frozenset({"ANALYST"}))
    org_id = _org_from_request(request)
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM data_connectors WHERE id=? AND org_id=?", (connector_id, org_id)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Connector not found")
        connector_type = str(row["connector_type"] or "")
        org_id = str(row["org_id"] or "org_default")
        events = simulate_connector_events(connector_type, org_id)
        conn.execute(
            "UPDATE data_connectors SET last_synced_at=datetime('now'), events_ingested=events_ingested+?, updated_at=datetime('now') WHERE id=?",
            (len(events), connector_id),
        )
        conn.commit()
    return {"connector_id": connector_id, "status": "ok", "events_sampled": len(events), "sample": events[:2]}


@app.delete("/api/connectors/{connector_id}", status_code=204) # type: ignore
def delete_connector(connector_id: str, request: Request):  # type: ignore
    _require_role(request, _WRITE_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        result = conn.execute("DELETE FROM data_connectors WHERE id=? AND org_id=?", (connector_id, org_id))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Connector not found")
    return None


# ── Executive Risk Dashboard ──────────────────────────────────────────────────

@app.get("/api/risk/{organization_id}/snapshot") # type: ignore
def executive_risk_snapshot(organization_id: str, request: Request):  # type: ignore
    _require_role(request, _ALL_ROLES)
    # Prevent cross-tenant reads: path param must match the validated header org
    header_org = _org_from_request(request)
    if organization_id != header_org:
        raise HTTPException(status_code=403, detail="organization_id does not match X-Org-Id header")
    with get_conn() as conn:
        snapshot = calculate_executive_risk_snapshot(conn, org_id=organization_id)
    return snapshot


@app.get("/api/risk/snapshot") # type: ignore
def executive_risk_snapshot_default(request: Request):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        snapshot = calculate_executive_risk_snapshot(conn, org_id=org_id)
    return snapshot


# ── Detection Rule Engine ─────────────────────────────────────────────────────
# RBAC: OWNER/ADMIN/ANALYST can create & edit rules; VIEWER is read-only.
# Schema: detection_rules(id, name, description, severity, enabled, logic_json,
#         mitre_technique, tags, org_id, created_by, hit_count, last_triggered_at,
#         created_at, updated_at)

_RULE_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
_RULE_CONDITION_OPS = {"equals", "contains", "startswith", "endswith", "regex", "gt", "lt", "gte", "lte", "exists", "not_exists"}
_RULE_LOGIC_OPS = {"AND", "OR"}


def _validate_rule_conditions(conditions: list[dict[str, Any]]) -> list[str]:  # type: ignore
    """Return a list of validation errors for a condition list (empty = valid)."""
    errors: list[str] = []
    for i, c in enumerate(conditions):
        if not isinstance(c, dict):
            errors.append(f"Condition {i}: must be a dict"); continue
        if "field" not in c or not isinstance(c.get("field"), str) or not c["field"].strip():
            errors.append(f"Condition {i}: 'field' is required and must be a non-empty string")
        op = c.get("op", "")
        if op not in _RULE_CONDITION_OPS:
            errors.append(f"Condition {i}: 'op' must be one of {sorted(_RULE_CONDITION_OPS)}")
    return errors


class DetectionRuleCreateIn(BaseModel):  # type: ignore
    name: str
    description: str = ""
    severity: str = "MEDIUM"
    enabled: bool = True
    logic_op: str = "AND"   # AND | OR
    conditions: list[dict[str, Any]] = []  # [{field, op, value?}]
    mitre_technique: str = ""
    tags: str = ""


class DetectionRulePatchIn(BaseModel):  # type: ignore
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None
    logic_op: Optional[str] = None
    conditions: Optional[list[dict[str, Any]]] = None
    mitre_technique: Optional[str] = None
    tags: Optional[str] = None


def _rule_row_to_dict(row: Any) -> dict[str, Any]:  # type: ignore
    d = dict(row)
    try:
        d["logic_json"] = json.loads(d.get("logic_json") or "{}")
    except (json.JSONDecodeError, TypeError):
        d["logic_json"] = {}
    return d


def _apply_rule_to_event(rule_logic: dict[str, Any], event: dict[str, Any]) -> bool:  # type: ignore
    """Return True if event matches the rule's logic."""
    conditions: list[dict[str, Any]] = rule_logic.get("conditions", [])
    logic_op: str = rule_logic.get("logic_op", "AND").upper()
    if not conditions:
        return False
    results: list[bool] = []
    for c in conditions:
        field = c.get("field", "")
        op = c.get("op", "equals")
        value = c.get("value", "")
        field_val = event.get(field)
        match = False
        try:
            sv = str(field_val or "").lower()
            cv = str(value or "").lower()
            if op == "equals":        match = sv == cv
            elif op == "contains":    match = cv in sv
            elif op == "startswith":  match = sv.startswith(cv)
            elif op == "endswith":    match = sv.endswith(cv)
            elif op == "regex":       match = bool(re.search(cv, sv))
            elif op == "gt":          match = float(field_val or 0) > float(value or 0)
            elif op == "lt":          match = float(field_val or 0) < float(value or 0)
            elif op == "gte":         match = float(field_val or 0) >= float(value or 0)
            elif op == "lte":         match = float(field_val or 0) <= float(value or 0)
            elif op == "exists":      match = field_val is not None
            elif op == "not_exists":  match = field_val is None
        except (ValueError, TypeError, re.error):
            match = False
        results.append(match)
    if logic_op == "OR":
        return any(results)
    return all(results)


@app.get("/api/rules") # type: ignore
def list_rules(request: Request, enabled: Optional[str] = None, limit: int = 200):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    safe_limit = min(max(limit, 1), 1000)
    with get_conn() as conn:
        if enabled is not None:
            val = 1 if enabled.lower() in ("1", "true", "yes") else 0
            rows = conn.execute(
                "SELECT * FROM detection_rules WHERE org_id=? AND enabled=? ORDER BY updated_at DESC LIMIT ?",
                (org_id, val, safe_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM detection_rules WHERE org_id=? ORDER BY updated_at DESC LIMIT ?",
                (org_id, safe_limit),
            ).fetchall()
    return [_rule_row_to_dict(r) for r in rows]


@app.post("/api/rules", status_code=201) # type: ignore
def create_rule(request: Request, req: DetectionRuleCreateIn):  # type: ignore
    _require_role(request, _CASE_WRITE_ROLES)  # OWNER/ADMIN/ANALYST
    org_id = _org_from_request(request)
    user_id = getattr(request.state, "user_id", "system")

    sev = str(req.severity).strip().upper()
    if sev not in _RULE_SEVERITIES:
        raise HTTPException(status_code=400, detail=f"severity must be one of {sorted(_RULE_SEVERITIES)}")
    logic_op = str(req.logic_op or "AND").strip().upper()
    if logic_op not in _RULE_LOGIC_OPS:
        raise HTTPException(status_code=400, detail=f"logic_op must be AND or OR")

    conditions = req.conditions or []
    errs = _validate_rule_conditions(conditions)
    if errs:
        raise HTTPException(status_code=422, detail={"conditions_errors": errs})

    logic_json = json.dumps({"logic_op": logic_op, "conditions": conditions})
    rule_id = f"rule_{uuid.uuid4().hex[:12]}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO detection_rules
               (id, name, description, severity, enabled, logic_json,
                mitre_technique, tags, org_id, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule_id, str(req.name)[:180], str(req.description)[:2000],
                sev, int(req.enabled), logic_json,
                str(req.mitre_technique)[:80], str(req.tags)[:500],
                org_id, str(user_id)[:80], now, now,
            ),
        )
        conn.commit()
    return {
        "id": rule_id, "name": req.name, "severity": sev, "enabled": req.enabled,
        "logic_json": {"logic_op": logic_op, "conditions": conditions},
        "org_id": org_id, "created_at": now,
    }


@app.get("/api/rules/{rule_id}") # type: ignore
def get_rule(rule_id: str, request: Request):  # type: ignore
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM detection_rules WHERE id=? AND org_id=?", (rule_id, org_id)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    return _rule_row_to_dict(row)


@app.patch("/api/rules/{rule_id}") # type: ignore
def patch_rule(rule_id: str, req: DetectionRulePatchIn, request: Request):  # type: ignore
    _require_role(request, _CASE_WRITE_ROLES)
    org_id = _org_from_request(request)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    updates: list[str] = ["updated_at=?"]
    params: list[object] = [now]

    if req.name is not None:
        updates.append("name=?"); params.append(str(req.name)[:180])
    if req.description is not None:
        updates.append("description=?"); params.append(str(req.description)[:2000])
    if req.severity is not None:
        sev = str(req.severity).strip().upper()
        if sev not in _RULE_SEVERITIES:
            raise HTTPException(status_code=400, detail=f"severity must be one of {sorted(_RULE_SEVERITIES)}")
        updates.append("severity=?"); params.append(sev)
    if req.enabled is not None:
        updates.append("enabled=?"); params.append(int(req.enabled))
    if req.mitre_technique is not None:
        updates.append("mitre_technique=?"); params.append(str(req.mitre_technique)[:80])
    if req.tags is not None:
        updates.append("tags=?"); params.append(str(req.tags)[:500])

    # Re-build logic_json if either conditions or logic_op changed
    if req.conditions is not None or req.logic_op is not None:
        with get_conn() as conn:
            existing = conn.execute(
                "SELECT logic_json FROM detection_rules WHERE id=? AND org_id=?", (rule_id, org_id)
            ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")
        try:
            prev_logic: dict[str, Any] = json.loads(existing["logic_json"] or "{}")
        except (json.JSONDecodeError, TypeError):
            prev_logic = {}
        new_conds = req.conditions if req.conditions is not None else prev_logic.get("conditions", [])
        new_op = str(req.logic_op or prev_logic.get("logic_op", "AND")).upper()
        if new_op not in _RULE_LOGIC_OPS:
            raise HTTPException(status_code=400, detail="logic_op must be AND or OR")
        errs = _validate_rule_conditions(new_conds)
        if errs:
            raise HTTPException(status_code=422, detail={"conditions_errors": errs})
        updates.append("logic_json=?"); params.append(json.dumps({"logic_op": new_op, "conditions": new_conds}))

    params.append(rule_id)
    params.append(org_id)
    with get_conn() as conn:
        result = conn.execute(
            f"UPDATE detection_rules SET {', '.join(updates)} WHERE id=? AND org_id=?", params
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
    return {"id": rule_id, "updated_at": now}


@app.delete("/api/rules/{rule_id}", status_code=204) # type: ignore
def delete_rule(rule_id: str, request: Request):  # type: ignore
    _require_role(request, _WRITE_ROLES)  # OWNER/ADMIN only
    org_id = _org_from_request(request)
    with get_conn() as conn:
        result = conn.execute(
            "DELETE FROM detection_rules WHERE id=? AND org_id=?", (rule_id, org_id)
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
    return None


@app.post("/api/rules/{rule_id}/test") # type: ignore
def test_rule(rule_id: str, request: Request, payload: dict[str, Any] = {}):  # type: ignore
    """Dry-run a rule against a sample event payload — no DB writes."""
    _require_role(request, _CASE_WRITE_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM detection_rules WHERE id=? AND org_id=?", (rule_id, org_id)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    try:
        logic = json.loads(row["logic_json"] or "{}")
    except (json.JSONDecodeError, TypeError):
        logic = {}
    matched = _apply_rule_to_event(logic, payload)
    return {
        "rule_id": rule_id, "matched": matched,
        "logic_op": logic.get("logic_op", "AND"),
        "conditions_evaluated": len(logic.get("conditions", [])),
        "sample_event": payload,
    }


@app.post("/api/rules/evaluate") # type: ignore
def evaluate_event_against_rules(request: Request, payload: dict[str, Any] = {}):  # type: ignore
    """Evaluate all enabled org rules against a single event. Returns matching rules."""
    _require_role(request, _CASE_WRITE_ROLES)
    org_id = _org_from_request(request)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM detection_rules WHERE org_id=? AND enabled=1 ORDER BY severity DESC",
            (org_id,),
        ).fetchall()
    matches: list[dict[str, Any]] = []
    for row in rows:
        try:
            logic = json.loads(row["logic_json"] or "{}")
        except (json.JSONDecodeError, TypeError):
            logic = {}
        if _apply_rule_to_event(logic, payload):
            matches.append({"id": row["id"], "name": row["name"], "severity": row["severity"], "mitre_technique": row["mitre_technique"]})
    return {"total_rules_checked": len(rows), "matches": matches, "match_count": len(matches)}


# ── Rule execution metrics endpoints ─────────────────────────────────────────

@app.get("/api/rules/metrics") # type: ignore
def get_rule_metrics(request: Request, hours: int = 24):  # type: ignore
    """Aggregate execution metrics across all org rules for the last N hours."""
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    safe_hours = min(max(hours, 1), 720)
    since = time.strftime(
        "%Y-%m-%dT%H:%M:%SZ",
        time.gmtime(time.time() - safe_hours * 3600),
    )
    with get_conn() as conn:
        # Per-rule summary
        per_rule = conn.execute(
            """SELECT res.rule_id,
                      dr.name     AS rule_name,
                      dr.severity AS severity,
                      COUNT(*)                               AS evaluations,
                      SUM(res.matched)                       AS matches,
                      ROUND(AVG(res.latency_ms), 3)          AS avg_latency_ms,
                      ROUND(MAX(res.latency_ms), 3)          AS max_latency_ms,
                      dr.hit_count,
                      dr.last_triggered_at
               FROM rule_event_stats res
               LEFT JOIN detection_rules dr ON dr.id = res.rule_id
               WHERE res.org_id = ? AND res.evaluated_at >= ?
               GROUP BY res.rule_id
               ORDER BY matches DESC""",
            (org_id, since),
        ).fetchall()

        totals = conn.execute(
            """SELECT COUNT(*) AS evaluations,
                      SUM(matched) AS total_matches,
                      ROUND(AVG(latency_ms), 3) AS avg_latency_ms
               FROM rule_event_stats
               WHERE org_id = ? AND evaluated_at >= ?""",
            (org_id, since),
        ).fetchone()

        alerts_generated = conn.execute(
            """SELECT COUNT(*) FROM alerts
               WHERE org_id = ? AND rule_id IS NOT NULL AND timestamp >= ?""",
            (org_id, since),
        ).fetchone()[0]

        active_rules = conn.execute(
            "SELECT COUNT(*) FROM detection_rules WHERE org_id=? AND enabled=1",
            (org_id,),
        ).fetchone()[0]

    return {
        "org_id": org_id,
        "window_hours": safe_hours,
        "since": since,
        "active_rules": int(active_rules or 0),
        "total_evaluations": int(totals["evaluations"] or 0),
        "total_matches": int(totals["total_matches"] or 0),
        "alerts_generated": int(alerts_generated or 0),
        "avg_latency_ms": float(totals["avg_latency_ms"] or 0),
        "per_rule": [dict(r) for r in per_rule],
    }


@app.get("/api/rules/{rule_id}/metrics") # type: ignore
def get_single_rule_metrics(rule_id: str, request: Request, hours: int = 24):  # type: ignore
    """Execution history for a single rule."""
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    safe_hours = min(max(hours, 1), 720)
    since = time.strftime(
        "%Y-%m-%dT%H:%M:%SZ",
        time.gmtime(time.time() - safe_hours * 3600),
    )
    with get_conn() as conn:
        rule = conn.execute(
            "SELECT * FROM detection_rules WHERE id=? AND org_id=?", (rule_id, org_id)
        ).fetchone()
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")

        agg = conn.execute(
            """SELECT COUNT(*) AS evaluations,
                      SUM(matched) AS matches,
                      ROUND(AVG(latency_ms),3) AS avg_latency_ms,
                      ROUND(MAX(latency_ms),3) AS max_latency_ms
               FROM rule_event_stats
               WHERE rule_id=? AND org_id=? AND evaluated_at>=?""",
            (rule_id, org_id, since),
        ).fetchone()

        recent = conn.execute(
            """SELECT id, matched, latency_ms, event_source, event_ts, evaluated_at, alert_id
               FROM rule_event_stats
               WHERE rule_id=? AND org_id=? AND evaluated_at>=?
               ORDER BY evaluated_at DESC LIMIT 100""",
            (rule_id, org_id, since),
        ).fetchall()

    return {
        "rule_id": rule_id,
        "rule_name": rule["name"],
        "severity": rule["severity"],
        "hit_count": int(rule["hit_count"] or 0),
        "last_triggered_at": rule["last_triggered_at"],
        "window_hours": safe_hours,
        "evaluations": int(agg["evaluations"] or 0),
        "matches": int(agg["matches"] or 0),
        "avg_latency_ms": float(agg["avg_latency_ms"] or 0),
        "max_latency_ms": float(agg["max_latency_ms"] or 0),
        "recent_evaluations": [dict(r) for r in recent],
    }


# ── Streaming System Metrics & Health ─────────────────────────────────────────

@app.get("/api/system/metrics")  # type: ignore
def get_system_metrics(request: Request):  # type: ignore
    """
    Expose real-time event streaming throughput metrics.

    Returns:
      - events_per_second (EPS) per topic and total
      - queue depths (current backlog per topic)
      - DLQ depth
      - rule evaluation latency (avg, p99)
      - per-topic published / consumed / dropped / dlq_count counters
      - broker uptime

    Access: any authenticated role.
    """
    _require_role(request, _ALL_ROLES)

    snap = event_broker.metrics.snapshot()
    depths = event_broker.queue_depths
    dlq = event_broker.dlq_depth

    # Enrich snapshot with queue depth info
    for topic, topic_snap in snap.get("topics", {}).items():
        topic_snap["queue_depth"] = depths.get(topic, 0)

    snap["dlq_depth"] = dlq

    # Add real-time DB alert generation rate (last 60 s)
    try:
        since_60s = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 60)
        )
        with get_conn() as conn:
            alerts_60s = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE timestamp >= ?", (since_60s,)
            ).fetchone()[0]
            rules_fired_60s = conn.execute(
                "SELECT COUNT(*) FROM rule_event_stats WHERE matched=1 AND evaluated_at >= ?",
                (since_60s,),
            ).fetchone()[0]
            events_ingested_60s = conn.execute(
                "SELECT COUNT(*) FROM telemetry_events WHERE timestamp >= ?",
                (since_60s,),
            ).fetchone()[0]
        snap["last_60s"] = {
            "alerts_generated":   int(alerts_60s or 0),
            "rules_fired":        int(rules_fired_60s or 0),
            "events_ingested":    int(events_ingested_60s or 0),
        }
    except Exception:  # noqa: BLE001
        snap["last_60s"] = {}

    return snap


@app.get("/api/system/stream/health")  # type: ignore
def get_stream_health(request: Request):  # type: ignore
    """
    Worker and pipeline health check.

    Reports running asyncio tasks whose names match worker: prefix,
    queue depths, DLQ backlog, and broker uptime.
    Access: ADMIN or OWNER only.
    """
    _require_role(request, {"ADMIN", "OWNER"})

    # Inspect asyncio tasks for worker status
    workers_status: list[dict[str, Any]] = []
    try:
        tasks = asyncio.all_tasks()
        for task in tasks:
            name = task.get_name()
            if name.startswith("worker:"):
                workers_status.append({
                    "name":     name,
                    "done":     task.done(),
                    "cancelled": task.cancelled(),
                })
    except RuntimeError:
        pass  # no running loop in test context

    depths = event_broker.queue_depths
    snap   = event_broker.metrics.snapshot()

    return {
        "status":         "healthy" if workers_status else "no_workers",
        "uptime_seconds": snap.get("uptime_seconds", 0),
        "workers":        workers_status,
        "queue_depths":   depths,
        "dlq_depth":      event_broker.dlq_depth,
        "total_eps":      snap.get("total_eps", 0.0),
        "avg_rule_eval_latency_ms": snap.get("avg_rule_eval_latency_ms", 0.0),
        "p99_rule_eval_latency_ms": snap.get("p99_rule_eval_latency_ms", 0.0),
    }


@app.get("/api/system/stream/dlq/inspect")  # type: ignore
def inspect_dead_letter_queue(request: Request, limit: int = 50):  # type: ignore
    """
    Peek at up to *limit* messages in the dead-letter queue WITHOUT removing them.
    Access: ADMIN or OWNER only.
    """
    _require_role(request, {"ADMIN", "OWNER"})
    safe_limit = min(max(limit, 1), 200)
    messages = event_broker.peek_dlq(safe_limit)
    return {
        "dlq_depth": event_broker.dlq_depth,
        "previewing": len(messages),
        "messages": messages,
    }


@app.post("/api/system/stream/dlq/drain")  # type: ignore
def drain_dead_letter_queue(request: Request, limit: int = 50):  # type: ignore
    """
    Return up to *limit* messages from the dead-letter queue and remove them.
    Access: ADMIN or OWNER only.
    """
    _require_role(request, {"ADMIN", "OWNER"})
    safe_limit = min(max(limit, 1), 200)
    drained = event_broker.drain_dlq(safe_limit)
    return {
        "drained": len(drained),
        "messages": drained,
        "dlq_depth_remaining": event_broker.dlq_depth,
    }


@app.get("/api/alerts/rule-triggered") # type: ignore
def list_rule_triggered_alerts(request: Request, limit: int = 100, rule_id: Optional[str] = None):  # type: ignore
    """Return alerts that were generated by the detection rule engine."""
    _require_role(request, _ALL_ROLES)
    org_id = _org_from_request(request)
    safe_limit = min(max(limit, 1), 500)
    with get_conn() as conn:
        if rule_id:
            rows = conn.execute(
                """SELECT id, alert_type, severity, matched_indicator,
                          rule_id, rule_name, org_id, analyst_status, timestamp
                   FROM alerts
                   WHERE org_id=? AND rule_id=?
                   ORDER BY timestamp DESC LIMIT ?""",
                (org_id, rule_id, safe_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, alert_type, severity, matched_indicator,
                          rule_id, rule_name, org_id, analyst_status, timestamp
                   FROM alerts
                   WHERE org_id=? AND rule_id IS NOT NULL
                   ORDER BY timestamp DESC LIMIT ?""",
                (org_id, safe_limit),
            ).fetchall()
    return [dict(r) for r in rows]


def attack_replay_by_incident(incident_id: str):
    with get_conn() as conn:
        payload = _build_incident_replay(conn, incident_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {
        "incident_id": incident_id,
        "timeline": [
            {
                "time": str(ev.get("timestamp") or "")[-9:-1] if ev.get("timestamp") else "",
                "event": ev.get("type"),
                "user": ev.get("actor"),
                "phase": ev.get("phase"),
                "mitre_technique": ev.get("mitre_technique"),
                "mitre_label": ev.get("mitre_label"),
                "source_ip": ev.get("source_ip"),
                "target_asset": ev.get("target_asset"),
                "associated_alert": ev.get("associated_alert"),
                "related_indicator": ev.get("related_indicator") or ev.get("indicator"),
            }
            for ev in payload.get("events", [])
            if isinstance(ev, dict)
        ],
    } # pyright: ignore[reportUnknownVariableType]


@app.get("/api/attack-replay/{incident_id}/export") # type: ignore
def attack_replay_export(incident_id: str, format: str = "json"):
    fmt = (format or "json").strip().lower()
    with get_conn() as conn:
        replay = _build_incident_replay(conn, incident_id)
    if not replay:
        raise HTTPException(status_code=404, detail="Incident not found")

    export_payload = _timeline_json_for_export(incident_id, replay)
    if fmt == "json":
        return export_payload

    if fmt == "pdf":
        lines: list[str] = []
        for ev in export_payload["timeline"]:
            if not isinstance(ev, dict):
                continue
            lines.append(
                f"{ev.get('time','')} | {ev.get('phase','')} | {ev.get('event','')} | {ev.get('target_asset','')} | {ev.get('related_indicator','')}"
            )
        pdf = _simple_pdf_bytes(f"Incident Replay {incident_id}", lines)
        from fastapi.responses import Response  # type: ignore

        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=attack_replay_{incident_id}.pdf"},
        )

    raise HTTPException(status_code=400, detail="format must be one of: json, pdf")


# ── Replay Kill‑Chain Progress ────────────────────────────────────────────
@app.get("/api/replay/{scenario_id}/kill-chain") # type: ignore
def replay_kill_chain(scenario_id: str):
    """Return MITRE ATT&CK kill chain phases with hit/active status for the scenario."""
    with get_conn() as conn:
        if scenario_id.startswith("incident_"):
            payload = _build_incident_replay(conn, scenario_id.replace("incident_", "", 1))
        elif scenario_id.startswith("alert_"):
            payload = _build_alert_replay(conn, scenario_id.replace("alert_", "", 1))
        else:
            raise HTTPException(status_code=400, detail="scenario_id must start with incident_ or alert_")
    if not payload:
        raise HTTPException(status_code=404, detail="Scenario not found")

    hit_phases: set[str] = set()
    hit_techniques: set[str] = set()
    for ev in payload.get("events", []):
        if not isinstance(ev, dict):
            continue
        phase = str(ev.get("phase") or "")
        if phase:
            hit_phases.add(phase)
        tech = str(ev.get("mitre_technique") or "")
        if tech:
            hit_techniques.add(tech.upper())

    result: list[dict[str, object]] = []
    for entry in MITRE_KILL_CHAIN:
        phase_name = str(entry["phase"])
        techs = entry.get("techniques", [])
        if not isinstance(techs, list):
            techs = []
        matched_techs = [t for t in techs if t in hit_techniques]
        result.append({
            "phase": phase_name,
            "hit": phase_name in hit_phases,
            "matched_techniques": matched_techs,
            "technique_labels": {t: MITRE_LABELS.get(t, "") for t in matched_techs},
        })
    return {"scenario_id": scenario_id, "kill_chain": result}


# ── Replay Attack‑Path Graph ──────────────────────────────────────────────
@app.get("/api/replay/{scenario_id}/attack-path") # type: ignore
def replay_attack_path(scenario_id: str):
    """Build an attack-path graph (nodes + edges) from replay events."""
    with get_conn() as conn:
        if scenario_id.startswith("incident_"):
            payload = _build_incident_replay(conn, scenario_id.replace("incident_", "", 1))
        elif scenario_id.startswith("alert_"):
            payload = _build_alert_replay(conn, scenario_id.replace("alert_", "", 1))
        else:
            raise HTTPException(status_code=400, detail="scenario_id must start with incident_ or alert_")
    if not payload:
        raise HTTPException(status_code=404, detail="Scenario not found")

    nodes: dict[str, dict[str, object]] = {}
    edges: list[dict[str, str]] = []

    prev_node_id: Optional[str] = None
    for ev in payload.get("events", []):
        if not isinstance(ev, dict):
            continue
        step = int(ev.get("step") or 0)
        phase = str(ev.get("phase") or "Investigation")
        node_id = f"step_{step}"
        nodes[node_id] = {
            "id": node_id,
            "label": str(ev.get("title") or ev.get("type") or "event"),
            "phase": phase,
            "step": step,
            "type": str(ev.get("type") or "event"),
            "source_ip": str(ev.get("source_ip") or ""),
            "target_asset": str(ev.get("target_asset") or ""),
            "indicator": str(ev.get("related_indicator") or ev.get("indicator") or ""),
            "mitre_technique": str(ev.get("mitre_technique") or ""),
        }

        # Add IP / asset nodes
        src = str(ev.get("source_ip") or "")
        dst = str(ev.get("target_asset") or "")
        ind = str(ev.get("related_indicator") or ev.get("indicator") or "")

        if src and src not in nodes:
            nodes[src] = {"id": src, "label": src, "phase": phase, "type": "ip"}
        if dst and dst not in nodes:
            nodes[dst] = {"id": dst, "label": dst, "phase": phase, "type": "asset"}
        if ind and ind not in nodes:
            nodes[ind] = {"id": ind, "label": ind, "phase": phase, "type": "indicator"}

        if src:
            edges.append({"from": src, "to": node_id, "label": "source"})
        if dst:
            edges.append({"from": node_id, "to": dst, "label": "target"})
        if ind:
            edges.append({"from": node_id, "to": ind, "label": "indicator"})

        if prev_node_id:
            edges.append({"from": prev_node_id, "to": node_id, "label": "sequence"})
        prev_node_id = node_id

    return {
        "scenario_id": scenario_id,
        "nodes": list(nodes.values()),
        "edges": edges,
    }


# ── Replay Annotations ────────────────────────────────────────────────────
@app.get("/api/replay/{scenario_id}/annotations") # type: ignore
def get_replay_annotations(scenario_id: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM replay_annotations WHERE scenario_id=? ORDER BY step ASC, created_at ASC",
            (scenario_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/replay/{scenario_id}/annotations") # type: ignore
def add_replay_annotation(scenario_id: str, step: int, text: str, author: str = "analyst"):
    import uuid as _uuid_mod

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    safe_step = max(0, step)
    safe_text = text.strip()[:1000]
    safe_author = (author or "analyst").strip()[:64]
    ann_id = str(_uuid_mod.uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO replay_annotations (id, scenario_id, step, text, author) VALUES (?, ?, ?, ?, ?)",
            (ann_id, scenario_id, safe_step, safe_text, safe_author),
        )
        conn.commit()
    return {"id": ann_id, "scenario_id": scenario_id, "step": safe_step, "text": safe_text, "author": safe_author}


@app.delete("/api/replay/annotations/{annotation_id}") # type: ignore
def delete_replay_annotation(annotation_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM replay_annotations WHERE id=?", (annotation_id,))
        conn.commit()
    return {"deleted": annotation_id}


@app.get("/api/analytics/summary") # type: ignore
def telemetry_analytics_summary():
    with get_conn() as conn:
        volume_rows = conn.execute(
            """SELECT substr(timestamp, 1, 13) || ':00:00Z' AS bucket, COUNT(*) AS count
               FROM telemetry_events
               GROUP BY bucket
               ORDER BY bucket DESC
               LIMIT 24"""
        ).fetchall()
        top_src_rows = conn.execute(
            """SELECT src_ip, COUNT(*) AS count
               FROM telemetry_events
               WHERE src_ip IS NOT NULL AND src_ip != ''
               GROUP BY src_ip
               ORDER BY count DESC
               LIMIT 5"""
        ).fetchall()
        targeted_rows = conn.execute(
            """SELECT asset, COUNT(*) AS count
               FROM telemetry_events
               WHERE asset IS NOT NULL AND asset != ''
               GROUP BY asset
               ORDER BY count DESC
               LIMIT 5"""
        ).fetchall()
        common_ioc_rows = conn.execute(
            """SELECT matched_indicator, COUNT(*) AS count
               FROM alerts
               GROUP BY matched_indicator
               ORDER BY count DESC
               LIMIT 5"""
        ).fetchall()

    return {
        "attack_volume_over_time": [dict(r) for r in reversed(volume_rows)],
        "top_attacking_ips": [dict(r) for r in top_src_rows],
        "most_targeted_assets": [dict(r) for r in targeted_rows],
        "threat_intel_matches": [dict(r) for r in common_ioc_rows],
    }


@app.get("/api/cyber-map/live") # type: ignore
def live_cyber_attack_map(limit: int = 120, window_minutes: int = 15, organization_id: Optional[str] = None) -> object:
    """Backward-compatible endpoint for existing 2D cyber map widget."""
    return _build_live_attack_events(limit=limit, window_minutes=window_minutes, organization_id=organization_id)


@app.get("/api/attacks/live") # type: ignore
def live_attacks_feed(limit: int = 150, window_minutes: int = 15, organization_id: Optional[str] = None) -> object:
    """Canonical live attack feed for 2D/3D attack maps and stats panels."""
    return _build_live_attack_events(limit=limit, window_minutes=window_minutes, organization_id=organization_id)


@app.get("/api/attacks/live/{attack_id}/details") # type: ignore
def attack_live_details(attack_id: str) -> object:
    return _build_attack_investigation_details(attack_id)


@app.websocket("/ws/stream") # type: ignore
async def stream_updates(ws: Any): # type: ignore
    await stream_hub.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        stream_hub.disconnect(ws)
    except Exception:
        stream_hub.disconnect(ws)


# ── Dashboard stats ───────────────────────────────────────────────────────────

@app.get("/dashboard/stats") # type: ignore
def dashboard_stats():
    with get_conn() as conn:
        total_threats = conn.execute("SELECT COUNT(*) FROM threats").fetchone()[0]
        open_threats = conn.execute(
            "SELECT COUNT(*) FROM threats WHERE status='open'"
        ).fetchone()[0]
        critical_threats = conn.execute(
            "SELECT COUNT(*) FROM threats WHERE severity='CRITICAL'"
        ).fetchone()[0]
        total_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
        open_incidents = conn.execute(
            "SELECT COUNT(*) FROM incidents WHERE status NOT IN ('resolved','closed')"
        ).fetchone()[0]
        audit_entries = conn.execute("SELECT COUNT(*) FROM audit").fetchone()[0]
    return {
        "total_threats": total_threats,
        "open_threats": open_threats,
        "critical_threats": critical_threats,
        "total_incidents": total_incidents,
        "open_incidents": open_incidents,
        "audit_entries": audit_entries,
    }


# ── Investigation graph ───────────────────────────────────────────────────────

@app.get("/investigation-graph") # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
def investigation_graph( # type: ignore
    threat_type: Optional[str] = None,
    severity: Optional[str] = None,
    hours: int = 24,
) -> object:
    """Build a dynamic investigation graph derived from threat records with filters."""
    safe_hours = min(max(hours, 1), 24 * 30)
    query = "SELECT * FROM threats WHERE timestamp >= datetime('now', ?)"
    params: list[str] = [f"-{safe_hours} hours"]
    if threat_type:
        query += " AND type = ?"
        params.append(threat_type)
    if severity:
        query += " AND severity = ?"
        params.append(normalize_severity(severity))
    query += " ORDER BY timestamp DESC LIMIT 100"

    with get_conn() as conn:
        threats = conn.execute(query, params).fetchall()
        alert_rows = conn.execute(
            """SELECT a.*, t.source AS telemetry_source, t.src_ip, t.dst_ip, t.asset, t.action, t.timestamp AS telemetry_timestamp
               FROM alerts a
               LEFT JOIN telemetry_events t ON a.source_event_id = t.id
               WHERE a.timestamp >= datetime('now', ?)
               ORDER BY a.timestamp DESC
               LIMIT 120""",
            (f"-{safe_hours} hours",),
        ).fetchall()

    nodes: list[dict[str, str]] = []
    edges: list[dict[str, str]] = []
    seen: set[str] = set()

    def add_node(node_id: str, node_type: str, label: str) -> None:
        if node_id not in seen:
            nodes.append({"id": node_id, "type": node_type, "label": label})
            seen.add(node_id)

    for t in threats:
        tid = f"threat_{t['id']}"
        threat_label = t["threat_name"] or t["type"]
        add_node(tid, "threat", f"{threat_label} [{t['severity']}]")

        if t["mitre_technique"]:
            mitre_id = f"mitre_{t['mitre_technique']}"
            add_node(mitre_id, "mitre", t["mitre_technique"])
            edges.append({"source": tid, "target": mitre_id, "label": "technique"})
        if t["source_ip"]:
            src_id = f"ip_{t['source_ip']}"
            add_node(src_id, "ip", t["source_ip"])
            edges.append({"source": src_id, "target": tid, "label": "src"})
        if t["dest_ip"]:
            dst_id = f"ip_{t['dest_ip']}"
            add_node(dst_id, "ip", t["dest_ip"])
            edges.append({"source": tid, "target": dst_id, "label": "dst"})
        if t["indicator_domain"]:
            domain_id = f"domain_{t['indicator_domain']}"
            add_node(domain_id, "domain", t["indicator_domain"])
            edges.append({"source": tid, "target": domain_id, "label": "domain"})
        if t["indicator_hash"]:
            hash_id = f"hash_{t['indicator_hash']}"
            add_node(hash_id, "hash", t["indicator_hash"])
            edges.append({"source": tid, "target": hash_id, "label": "hash"})

    for a in alert_rows:
        alert_id = f"alert_{a['id']}"
        add_node(alert_id, "alert", f"ALERT {a['severity']}")

        matched = str(a["matched_indicator"] or "")
        if ":" in matched:
            ioc_type, ioc_value = matched.split(":", 1)
            indicator_node = safe_node_id(ioc_type, ioc_value)
            add_node(indicator_node, ioc_type, ioc_value)
            edges.append({"source": indicator_node, "target": alert_id, "label": "match"})

        if a["source_event_id"] is not None:
            event_node = f"telemetry_{a['source_event_id']}"
            event_label = f"{a['telemetry_source'] or 'event'} {a['action'] or ''}".strip()
            add_node(event_node, "telemetry", event_label)
            edges.append({"source": event_node, "target": alert_id, "label": "triggered"})

            if a["src_ip"]:
                src = f"ip_{a['src_ip']}"
                add_node(src, "ip", a["src_ip"])
                edges.append({"source": src, "target": event_node, "label": "src"})
            if a["dst_ip"]:
                dst = f"ip_{a['dst_ip']}"
                add_node(dst, "ip", a["dst_ip"])
                edges.append({"source": event_node, "target": dst, "label": "dst"})
            if a["asset"]:
                asset = safe_node_id("asset", str(a["asset"]))
                add_node(asset, "asset", str(a["asset"]))
                edges.append({"source": event_node, "target": asset, "label": "asset"})

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "types": sorted({t["type"] for t in threats if t["type"]}),
            "severities": sorted({t["severity"] for t in threats if t["severity"]}),
            "hours": safe_hours,
        },
    }


@app.get("/api/investigation-graph-3d") # type: ignore
def investigation_graph_3d(limit: int = 120) -> object:
    """Enriched graph payload for 3D investigation (IPs, domains, users, malware, assets)."""
    safe_limit = min(max(limit, 20), 500)
    with get_conn() as conn:
        threats = conn.execute(
            "SELECT * FROM threats ORDER BY timestamp DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
        telemetry = conn.execute(
            "SELECT * FROM telemetry_events ORDER BY timestamp DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
        alerts = conn.execute(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()

    nodes: dict[str, dict[str, object]] = {}
    edges: list[dict[str, str]] = []

    def upsert(node_id: str, node_type: str, label: str) -> None:
        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "type": node_type,
                "label": label,
                "weight": 1,
            }
        else:
            nodes[node_id]["weight"] = int(nodes[node_id].get("weight", 1)) + 1

    def connect(source: str, target: str, label: str) -> None:
        if source == target:
            return
        edges.append({"source": source, "target": target, "label": label})

    for t in threats:
        tid = f"threat_{str(t['id'])[:8]}"
        threat_name = str(t["threat_name"] or t["type"] or "Threat")
        upsert(tid, "threat", threat_name)

        if t["source_ip"]:
            src = f"ip_{t['source_ip']}"
            upsert(src, "ip", str(t["source_ip"]))
            connect(src, tid, "source")

        if t["dest_ip"]:
            dst = f"ip_{t['dest_ip']}"
            upsert(dst, "ip", str(t["dest_ip"]))
            connect(tid, dst, "target")

        if t["indicator_domain"]:
            dmn = f"domain_{t['indicator_domain']}"
            upsert(dmn, "domain", str(t["indicator_domain"]))
            connect(tid, dmn, "indicator")

        if t["indicator_hash"]:
            mal = f"malware_{safe_node_id('hash', str(t['indicator_hash']))}"
            upsert(mal, "malware", f"{str(t['indicator_hash'])[:16]}…")
            connect(tid, mal, "payload")

        if str(t["type"] or "").lower() == "malware" and t["threat_name"]:
            mal_name = f"malware_name_{safe_node_id('mal', str(t['threat_name']))}"
            upsert(mal_name, "malware", str(t["threat_name"]))
            connect(tid, mal_name, "family")

    for ev in telemetry:
        ev_id = f"event_{ev['id']}"
        upsert(ev_id, "event", str(ev["source"] or "event"))

        if ev["src_ip"]:
            src = f"ip_{ev['src_ip']}"
            upsert(src, "ip", str(ev["src_ip"]))
            connect(src, ev_id, "source")

        if ev["dst_ip"]:
            dst = f"ip_{ev['dst_ip']}"
            upsert(dst, "ip", str(ev["dst_ip"]))
            connect(ev_id, dst, "target")

        if ev["asset"]:
            asset = f"asset_{safe_node_id('asset', str(ev['asset']))}"
            upsert(asset, "asset", str(ev["asset"]))
            connect(ev_id, asset, "asset")

        user_identity = _extract_user_identity(str(ev["raw_event"]) if ev["raw_event"] else None)
        if user_identity:
            usr = f"user_{safe_node_id('user', user_identity)}"
            upsert(usr, "user", user_identity)
            connect(usr, ev_id, "actor")

        if ev["indicator_domain"]:
            dmn = f"domain_{ev['indicator_domain']}"
            upsert(dmn, "domain", str(ev["indicator_domain"]))
            connect(ev_id, dmn, "indicator")

        if ev["indicator_hash"]:
            mal = f"malware_{safe_node_id('hash', str(ev['indicator_hash']))}"
            upsert(mal, "malware", f"{str(ev['indicator_hash'])[:16]}…")
            connect(ev_id, mal, "indicator")

    for a in alerts:
        aid = f"alert_{str(a['id'])[:8]}"
        upsert(aid, "alert", str(a["alert_type"] or "Alert"))

        matched = str(a["matched_indicator"] or "")
        if ":" in matched:
            ioc_type, ioc_value = matched.split(":", 1)
            if ioc_type == "ip":
                ip = f"ip_{ioc_value}"
                upsert(ip, "ip", ioc_value)
                connect(ip, aid, "match")
            elif ioc_type == "domain":
                dmn = f"domain_{ioc_value}"
                upsert(dmn, "domain", ioc_value)
                connect(dmn, aid, "match")
            elif ioc_type == "hash":
                mal = f"malware_{safe_node_id('hash', ioc_value)}"
                upsert(mal, "malware", f"{ioc_value[:16]}…")
                connect(mal, aid, "match")

        if a["source_event_id"] is not None:
            ev_ref = f"event_{a['source_event_id']}"
            upsert(ev_ref, "event", f"event {a['source_event_id']}")
            connect(ev_ref, aid, "triggered")

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "meta": {
            "node_types": sorted({str(n.get('type')) for n in nodes.values()}),
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }


def _build_investigation_graph_data(
    *,
    indicator_type: str = "all",
    hours: int = 24,
    incident_id: Optional[str] = None,
    severity: str = "all",
    timeline_cursor: int = 100,
    limit: int = 300,
) -> dict[str, object]:
    safe_hours = min(max(hours, 1), 24 * 30)
    safe_limit = min(max(limit, 50), 1000)
    safe_cursor = min(max(timeline_cursor, 1), 100)

    with get_conn() as conn:
        since_arg = f"-{safe_hours} hours"
        threats = conn.execute(
            """SELECT * FROM threats
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT ?""",
            (since_arg, safe_limit),
        ).fetchall()
        telemetry = conn.execute(
            """SELECT * FROM telemetry_events
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT ?""",
            (since_arg, safe_limit),
        ).fetchall()
        alerts = conn.execute(
            """SELECT * FROM alerts
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT ?""",
            (since_arg, safe_limit),
        ).fetchall()
        incidents = conn.execute(
            """SELECT * FROM incidents
               WHERE datetime(replace(created_at,'T',' ')) >= datetime('now', ?)
               ORDER BY created_at DESC LIMIT ?""",
            (since_arg, safe_limit),
        ).fetchall()
        incident_attributions = conn.execute(
            """SELECT * FROM incident_attributions
               ORDER BY created_at DESC LIMIT ?""",
            (safe_limit * 3,),
        ).fetchall()
        defense_logs = conn.execute(
            """SELECT * FROM autonomous_defense_log
               ORDER BY created_at DESC LIMIT ?""",
            (safe_limit * 3,),
        ).fetchall()

    if severity and severity.lower() != "all":
        sev = severity.upper()
        threats = [r for r in threats if str(r["severity"] or "").upper() == sev]
        alerts = [r for r in alerts if str(r["severity"] or "").upper() == sev]
        incidents = [r for r in incidents if str(r["severity"] or "").upper() == sev]

    if incident_id:
        incidents = [r for r in incidents if str(r["id"]) == incident_id]
        incident_threat_ids = {str(r["threat_id"]) for r in incidents if r["threat_id"]}
        if incident_threat_ids:
            threats = [r for r in threats if str(r["id"]) in incident_threat_ids]

    latest_attr_by_incident: dict[str, sqlite3.Row] = {}
    for row in incident_attributions:
        inc_id = str(row["incident_id"] or "")
        if inc_id and inc_id not in latest_attr_by_incident:
            latest_attr_by_incident[inc_id] = row

    nodes: dict[str, dict[str, object]] = {}
    edges: list[dict[str, str]] = []

    def upsert(node_id: str, node_type: str, label: str) -> None:
        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "type": node_type,
                "label": label,
                "weight": 1,
            }
        else:
            nodes[node_id]["weight"] = int(nodes[node_id].get("weight", 1)) + 1

    def connect(source: str, target: str, label: str) -> None:
        if source == target:
            return
        edges.append({"source": source, "target": target, "label": label})

    for t in threats:
        threat_id = str(t["id"])
        tid = f"threat_{threat_id[:8]}"
        upsert(tid, "threat", str(t["threat_name"] or t["type"] or "Threat"))

        if t["source_ip"]:
            src = f"ip_{t['source_ip']}"
            upsert(src, "ip", str(t["source_ip"]))
            connect(src, tid, "source")
        if t["dest_ip"]:
            dst = f"ip_{t['dest_ip']}"
            upsert(dst, "ip", str(t["dest_ip"]))
            connect(tid, dst, "target")
        if t["indicator_domain"]:
            dmn = f"domain_{t['indicator_domain']}"
            upsert(dmn, "domain", str(t["indicator_domain"]))
            connect(tid, dmn, "indicator")
        if t["indicator_hash"]:
            mal = f"malware_{safe_node_id('hash', str(t['indicator_hash']))}"
            upsert(mal, "malware", f"{str(t['indicator_hash'])[:16]}…")
            connect(tid, mal, "payload")

    for ev in telemetry:
        ev_id = f"event_{ev['id']}"
        upsert(ev_id, "event", str(ev["source"] or "event"))

        if ev["src_ip"]:
            src = f"ip_{ev['src_ip']}"
            upsert(src, "ip", str(ev["src_ip"]))
            connect(src, ev_id, "source")
        if ev["dst_ip"]:
            dst = f"ip_{ev['dst_ip']}"
            upsert(dst, "ip", str(ev["dst_ip"]))
            connect(ev_id, dst, "target")
        if ev["asset"]:
            dev = f"device_{safe_node_id('device', str(ev['asset']))}"
            upsert(dev, "device", str(ev["asset"]))
            connect(ev_id, dev, "device")

        user_identity = _extract_user_identity(str(ev["raw_event"]) if ev["raw_event"] else None)
        if user_identity:
            usr = f"user_{safe_node_id('user', user_identity)}"
            upsert(usr, "user", user_identity)
            connect(usr, ev_id, "actor")

        if ev["indicator_domain"]:
            dmn = f"domain_{ev['indicator_domain']}"
            upsert(dmn, "domain", str(ev["indicator_domain"]))
            connect(ev_id, dmn, "indicator")
        if ev["indicator_hash"]:
            mal = f"malware_{safe_node_id('hash', str(ev['indicator_hash']))}"
            upsert(mal, "malware", f"{str(ev['indicator_hash'])[:16]}…")
            connect(ev_id, mal, "indicator")

    for a in alerts:
        aid = f"alert_{str(a['id'])[:8]}"
        upsert(aid, "alert", str(a["alert_type"] or "Alert"))
        matched = str(a["matched_indicator"] or "")
        if ":" in matched:
            ioc_type, ioc_value = matched.split(":", 1)
            if ioc_type == "ip":
                ip = f"ip_{ioc_value}"
                upsert(ip, "ip", ioc_value)
                connect(ip, aid, "match")
            elif ioc_type == "domain":
                dmn = f"domain_{ioc_value}"
                upsert(dmn, "domain", ioc_value)
                connect(dmn, aid, "match")
            elif ioc_type == "hash":
                mal = f"malware_{safe_node_id('hash', ioc_value)}"
                upsert(mal, "malware", f"{ioc_value[:16]}…")
                connect(mal, aid, "match")

        if a["source_event_id"] is not None:
            ev_ref = f"event_{a['source_event_id']}"
            upsert(ev_ref, "event", f"event {a['source_event_id']}")
            connect(ev_ref, aid, "triggered")

    for inc in incidents:
        inc_id = f"incident_{inc['id']}"
        upsert(inc_id, "incident", str(inc["title"] or "Incident"))
        if inc["threat_id"]:
            threat_ref = f"threat_{str(inc['threat_id'])[:8]}"
            upsert(threat_ref, "threat", f"Threat {str(inc['threat_id'])[:8]}")
            connect(threat_ref, inc_id, "associated")

        attr = latest_attr_by_incident.get(str(inc["id"]))
        if attr and attr["possible_actor"]:
            actor_label = str(attr["possible_actor"])
            actor_id = f"actor_{safe_node_id('actor', actor_label)}"
            upsert(actor_id, "actor", actor_label)
            connect(inc_id, actor_id, "attributed_to")

    for d in defense_logs:
        did = f"defense_{str(d['id'])[:8]}"
        action = str(d["action"] or "defense_action")
        status = str(d["status"] or "unknown")
        upsert(did, "defense_action", f"{action} ({status})")

        if d["incident_id"]:
            inc_id = f"incident_{d['incident_id']}"
            upsert(inc_id, "incident", f"Incident {str(d['incident_id'])[:8]}")
            connect(inc_id, did, "response")

        target = str(d["target"] or "").strip()
        if target:
            if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", target):
                target_id = f"ip_{target}"
                target_type = "ip"
            elif "." in target and " " not in target:
                target_id = f"domain_{target}"
                target_type = "domain"
            else:
                target_id = f"device_{safe_node_id('device', target)}"
                target_type = "device"
            upsert(target_id, target_type, target)
            connect(did, target_id, "target")

    # ── Enrich graph with threat feed indicators ─────────────────────────────
    # For any ip/domain/hash node already in the graph, look up matching
    # indicators in the indicators table and attach a feed_source node.
    with get_conn() as conn:
        _ind_rows = conn.execute(
            "SELECT type, value, source, confidence_score FROM indicators ORDER BY last_seen DESC LIMIT 2000"
        ).fetchall()
    threat_feed_index: dict[str, list[dict[str, object]]] = {}
    for row in _ind_rows:
        k = f"{str(row['type'])}:{str(row['value'])}"
        threat_feed_index.setdefault(k, []).append(
            {"source": str(row["source"] or ""), "confidence": float(row["confidence_score"] or 0.0)}
        )

    # Map graph node key prefixes to indicator types
    _type_prefix = {"ip": "ip_", "domain": "domain_", "hash": "malware_"}
    for ind_type, prefix in _type_prefix.items():
        for node_id in list(nodes.keys()):
            if not node_id.startswith(prefix):
                continue
            raw_value = node_id[len(prefix):]
            matches = threat_feed_index.get(f"{ind_type}:{raw_value}", [])
            for m in matches[:3]:  # cap per indicator to avoid graph bloat
                src_label = str(m["source"])[:60]
                feed_node_id = f"feed_src_{safe_node_id('feed', src_label)}"
                upsert(feed_node_id, "threat_feed", src_label)
                connect(feed_node_id, node_id, "feed_match")
                nodes[node_id]["threat_feed_match"] = True  # type: ignore

    if indicator_type and indicator_type.lower() != "all":
        wanted = indicator_type.lower()
        valid = {n["id"] for n in nodes.values() if str(n.get("type", "")).lower() == wanted}
        connected = {e["source"] for e in edges if e["source"] in valid or e["target"] in valid}
        connected.update({e["target"] for e in edges if e["source"] in valid or e["target"] in valid})
        keep = valid.union(connected)
        nodes = {k: v for k, v in nodes.items() if k in keep}
        edges = [e for e in edges if e["source"] in nodes and e["target"] in nodes]

    # Timeline overlay support: keep only first portion of graph progression.
    if safe_cursor < 100:
        sorted_ids = sorted(nodes.keys())
        cutoff_idx = max(1, int((safe_cursor / 100.0) * len(sorted_ids)))
        keep_ids = set(sorted_ids[:cutoff_idx])
        nodes = {k: v for k, v in nodes.items() if k in keep_ids}
        edges = [e for e in edges if e["source"] in nodes and e["target"] in nodes]

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "meta": {
            "node_types": sorted({str(n.get("type")) for n in nodes.values()}),
            "node_count": len(nodes),
            "edge_count": len(edges),
            "hours": safe_hours,
            "timeline_cursor": safe_cursor,
        },
    }


@app.get("/api/investigation/graph-data") # type: ignore
def investigation_graph_data(
    indicator_type: str = "all",
    hours: int = 24,
    incident_id: Optional[str] = None,
    severity: str = "all",
    timeline_cursor: int = 100,
    limit: int = 300,
) -> object:
    return _build_investigation_graph_data(
        indicator_type=indicator_type,
        hours=hours,
        incident_id=incident_id,
        severity=severity,
        timeline_cursor=timeline_cursor,
        limit=limit,
    )


@app.get("/api/investigation/graph-expand/{node_id}") # type: ignore
def investigation_graph_expand(node_id: str, hours: int = 72) -> object:
    graph = _build_investigation_graph_data(hours=hours, limit=500)
    nodes = {n["id"]: n for n in graph["nodes"] if isinstance(n, dict)}
    edges = [e for e in graph["edges"] if isinstance(e, dict)]
    related_edge = [e for e in edges if e.get("source") == node_id or e.get("target") == node_id]
    related_ids: set[str] = {node_id}
    for e in related_edge:
        related_ids.add(str(e.get("source")))
        related_ids.add(str(e.get("target")))
    sub_nodes = [n for n in nodes.values() if str(n.get("id")) in related_ids]
    return {"center": node_id, "nodes": sub_nodes, "edges": related_edge}


@app.get("/api/investigation/graph-insights") # type: ignore
def investigation_graph_insights(
    indicator_type: str = "all",
    hours: int = 24,
    incident_id: Optional[str] = None,
    severity: str = "all",
    timeline_cursor: int = 100,
    limit: int = 300,
) -> object:
    with get_conn() as conn:
        enrichment = _build_investigation_enrichment(conn, incident_id=incident_id, limit=12)

    graph = _build_investigation_graph_data(
        indicator_type=indicator_type,
        hours=hours,
        incident_id=incident_id,
        severity=severity,
        timeline_cursor=timeline_cursor,
        limit=limit,
    )
    nodes = [n for n in graph["nodes"] if isinstance(n, dict)]
    edges = [e for e in graph["edges"] if isinstance(e, dict)]

    degrees: dict[str, int] = {}
    for e in edges:
        s = str(e.get("source"))
        t = str(e.get("target"))
        degrees[s] = degrees.get(s, 0) + 1
        degrees[t] = degrees.get(t, 0) + 1

    top_hubs = sorted(degrees.items(), key=lambda x: x[1], reverse=True)[:5]
    id_to_label = {str(n.get("id")): str(n.get("label")) for n in nodes}
    id_to_type = {str(n.get("id")): str(n.get("type")) for n in nodes}

    suspicious_clusters = [
        {
            "node": node_id,
            "label": id_to_label.get(node_id, node_id),
            "type": id_to_type.get(node_id, "unknown"),
            "degree": degree,
        }
        for node_id, degree in top_hubs
    ]

    possible_paths: list[str] = []
    for e in edges[:10]:
        src = str(e.get("source"))
        dst = str(e.get("target")) # type: ignore
        possible_paths.append(f"{id_to_label.get(src, src)} -> {id_to_label.get(dst, dst)}")

    threat_actor_candidates = [
        s for s in suspicious_clusters if s.get("type") in {"ip", "domain", "user", "malware"}
    ][:4]

    return {
        "possible_attack_paths": possible_paths,
        "suspicious_clusters": suspicious_clusters,
        "related_threat_actors": threat_actor_candidates,
        "threat_intel_enrichment": enrichment,
        "summary": {
            "nodes": len(nodes),
            "edges": len(edges),
            "hubs": len(top_hubs),
        },
    }


@app.post("/api/investigation/snapshot/save") # type: ignore
def investigation_snapshot_save(
    name: str = "snapshot",
    indicator_type: str = "all",
    hours: int = 24,
    incident_id: Optional[str] = None,
    severity: str = "all",
    timeline_cursor: int = 100,
    limit: int = 300,
) -> object:
    payload = _build_investigation_graph_data(
        indicator_type=indicator_type,
        hours=hours,
        incident_id=incident_id,
        severity=severity,
        timeline_cursor=timeline_cursor,
        limit=limit,
    )
    snapshot_id = str(uuid.uuid4())
    filters = {
        "indicator_type": indicator_type,
        "hours": hours,
        "incident_id": incident_id,
        "severity": severity,
        "timeline_cursor": timeline_cursor,
        "limit": limit,
    }
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO investigation_snapshots (id, name, filters_json, payload_json)
               VALUES (?, ?, ?, ?)""",
            (snapshot_id, name, json.dumps(filters), json.dumps(payload)),
        )
        conn.commit()
    return {"snapshot_id": snapshot_id, "name": name, "filters": filters, "meta": payload.get("meta", {})}


@app.get("/api/investigation/snapshot/list") # type: ignore
def investigation_snapshot_list() -> object:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, created_at FROM investigation_snapshots ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/investigation/snapshot/{snapshot_id}") # type: ignore
def investigation_snapshot_get(snapshot_id: str) -> object:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM investigation_snapshots WHERE id=?",
            (snapshot_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"],
        "filters": json.loads(row["filters_json"] or "{}"),
        "payload": json.loads(row["payload_json"] or "{}"),
    }


@app.get("/api/investigation/snapshot/compare/{snapshot_a}/{snapshot_b}") # type: ignore
def investigation_snapshot_compare(snapshot_a: str, snapshot_b: str) -> object:
    with get_conn() as conn:
        left = conn.execute("SELECT * FROM investigation_snapshots WHERE id=?", (snapshot_a,)).fetchone()
        right = conn.execute("SELECT * FROM investigation_snapshots WHERE id=?", (snapshot_b,)).fetchone()
    if not left or not right:
        raise HTTPException(status_code=404, detail="One or both snapshots not found")

    left_payload = json.loads(left["payload_json"] or "{}")
    right_payload = json.loads(right["payload_json"] or "{}")

    left_nodes = {str(n.get("id")) for n in left_payload.get("nodes", []) if isinstance(n, dict)}
    right_nodes = {str(n.get("id")) for n in right_payload.get("nodes", []) if isinstance(n, dict)}
    left_edges = {
        (str(e.get("source")), str(e.get("target")), str(e.get("label", "")))
        for e in left_payload.get("edges", [])
        if isinstance(e, dict)
    }
    right_edges = {
        (str(e.get("source")), str(e.get("target")), str(e.get("label", "")))
        for e in right_payload.get("edges", [])
        if isinstance(e, dict)
    }

    return {
        "left": {
            "id": left["id"],
            "name": left["name"],
            "created_at": left["created_at"],
            "filters": json.loads(left["filters_json"] or "{}"),
            "payload": left_payload,
        },
        "right": {
            "id": right["id"],
            "name": right["name"],
            "created_at": right["created_at"],
            "filters": json.loads(right["filters_json"] or "{}"),
            "payload": right_payload,
        },
        "diff": {
            "new_nodes_in_right": sorted(right_nodes - left_nodes),
            "removed_nodes_from_right": sorted(left_nodes - right_nodes),
            "new_edges_in_right": [list(x) for x in sorted(right_edges - left_edges)],
            "removed_edges_from_right": [list(x) for x in sorted(left_edges - right_edges)],
        },
    }


@app.get("/api/threat-actor/attribution") # type: ignore
def threat_actor_attribution(hours: int = 72, incident_id: Optional[str] = None) -> object:
    safe_hours = min(max(hours, 1), 24 * 30)
    with get_conn() as conn:
        since_arg = f"-{safe_hours} hours"
        threats = [dict(r) for r in conn.execute(
            """SELECT * FROM threats
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT 500""",
            (since_arg,),
        ).fetchall()]
        alerts = [dict(r) for r in conn.execute(
            """SELECT * FROM alerts
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT 500""",
            (since_arg,),
        ).fetchall()]
        telemetry = [dict(r) for r in conn.execute(
            """SELECT * FROM telemetry_events
               WHERE datetime(replace(timestamp,'T',' ')) >= datetime('now', ?)
               ORDER BY timestamp DESC LIMIT 1000""",
            (since_arg,),
        ).fetchall()]
        incidents = [dict(r) for r in conn.execute(
            """SELECT * FROM incidents
               WHERE datetime(replace(created_at,'T',' ')) >= datetime('now', ?)
               ORDER BY created_at DESC LIMIT 300""",
            (since_arg,),
        ).fetchall()]

    if incident_id:
        incidents = [r for r in incidents if str(r.get("id")) == incident_id]
        target_threat_ids = {str(r.get("threat_id")) for r in incidents if r.get("threat_id")}
        if target_threat_ids:
            threats = [t for t in threats if str(t.get("id")) in target_threat_ids]

    attribution = attribute_threat_actor(threats, alerts, telemetry)
    return {
        "window_hours": safe_hours,
        "incident_id": incident_id,
        "samples": {
            "threats": len(threats),
            "alerts": len(alerts),
            "telemetry": len(telemetry),
            "incidents": len(incidents),
        },
        **attribution,
    }


@app.get("/investigation-graph/node/{node_id}") # type: ignore
def investigation_node_details(node_id: str) -> object:
    with get_conn() as conn:
        if node_id.startswith("threat_"):
            threat_id = node_id.replace("threat_", "", 1)
            threat = conn.execute("SELECT * FROM threats WHERE id=?", (threat_id,)).fetchone()
            if not threat:
                raise HTTPException(status_code=404, detail="Threat node not found")

            incidents = conn.execute(
                "SELECT * FROM incidents WHERE threat_id=? ORDER BY created_at DESC LIMIT 10",
                (threat_id,),
            ).fetchall()
            incident_ids = [i["id"] for i in incidents]
            timeline: list[dict[str, str]] = [
                {
                    "timestamp": threat["timestamp"],
                    "event_type": "threat_detected",
                    "description": threat["description"],
                    "actor": "sensor",
                }
            ]
            if incident_ids:
                qmarks = ",".join(["?"] * len(incident_ids))
                event_rows = conn.execute(
                    f"SELECT * FROM incident_events WHERE incident_id IN ({qmarks}) ORDER BY timestamp ASC",
                    incident_ids,
                ).fetchall()
                timeline.extend(
                    [
                        {
                            "timestamp": str(ev["timestamp"]),
                            "event_type": str(ev["event_type"]),
                            "description": str(ev["description"]),
                            "actor": str(ev["actor"]),
                        }
                        for ev in event_rows
                    ]
                )

            related_indicators = [
                x
                for x in [
                    threat["source_ip"],
                    threat["dest_ip"],
                    threat["indicator_domain"],
                    threat["indicator_hash"],
                    threat["mitre_technique"],
                ]
                if x
            ]

            return {
                "node": {
                    "id": node_id,
                    "type": "threat",
                    "label": threat["threat_name"] or threat["type"],
                },
                "timeline": timeline,
                "related_indicators": related_indicators,
            }

        if node_id.startswith("ip_"):
            ip = node_id.replace("ip_", "", 1)
            threat_rows = conn.execute(
                """SELECT * FROM threats
                   WHERE source_ip=? OR dest_ip=?
                   ORDER BY timestamp DESC LIMIT 20""",
                (ip, ip),
            ).fetchall()
            if not threat_rows:
                raise HTTPException(status_code=404, detail="IP node not found")

            timeline = [
                {
                    "timestamp": str(t["timestamp"]),
                    "event_type": "ip_activity",
                    "description": f"{t['type']} / {t['severity']}: {t['description']}",
                    "actor": "sensor",
                }
                for t in threat_rows
            ]
            related = sorted(
                {
                    x
                    for t in threat_rows
                    for x in [t["indicator_domain"], t["indicator_hash"], t["mitre_technique"]]
                    if x
                }
            )
            return {
                "node": {"id": node_id, "type": "ip", "label": ip},
                "timeline": timeline,
                "related_indicators": related,
            }

        if node_id.startswith("domain_") or node_id.startswith("hash_") or node_id.startswith("mitre_"):
            if node_id.startswith("domain_"):
                ind_type = "domain"
                value = node_id.replace("domain_", "", 1)
            elif node_id.startswith("hash_"):
                ind_type = "hash"
                value = node_id.replace("hash_", "", 1)
            else:
                ind_type = "mitre"
                value = node_id.replace("mitre_", "", 1)

            like_value = f"%{value}%"
            if ind_type == "mitre":
                threat_rows = conn.execute(
                    "SELECT * FROM threats WHERE mitre_technique=? ORDER BY timestamp DESC LIMIT 20",
                    (value,),
                ).fetchall()
            elif ind_type == "domain":
                threat_rows = conn.execute(
                    "SELECT * FROM threats WHERE indicator_domain=? ORDER BY timestamp DESC LIMIT 20",
                    (value,),
                ).fetchall()
            else:
                threat_rows = conn.execute(
                    "SELECT * FROM threats WHERE indicator_hash=? ORDER BY timestamp DESC LIMIT 20",
                    (value,),
                ).fetchall()

            alert_rows = conn.execute(
                "SELECT * FROM alerts WHERE matched_indicator LIKE ? ORDER BY timestamp DESC LIMIT 20",
                (like_value,),
            ).fetchall()

            timeline = [
                {
                    "timestamp": str(t["timestamp"]),
                    "event_type": "threat_link",
                    "description": f"{t['type']} / {t['severity']}: {t['description']}",
                    "actor": "sensor",
                }
                for t in threat_rows
            ]
            timeline.extend(
                [
                    {
                        "timestamp": str(a["timestamp"]),
                        "event_type": "ioc_match_alert",
                        "description": f"Alert {a['severity']}: {a['matched_indicator']}",
                        "actor": "correlator",
                    }
                    for a in alert_rows
                ]
            )

            return {
                "node": {"id": node_id, "type": ind_type, "label": value},
                "timeline": timeline,
                "related_indicators": sorted({str(a["matched_indicator"]) for a in alert_rows}),
            }

        if node_id.startswith("alert_"):
            alert_id = node_id.replace("alert_", "", 1)
            row = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Alert node not found")
            return {
                "node": {"id": node_id, "type": "alert", "label": f"Alert {row['severity']}"},
                "timeline": [
                    {
                        "timestamp": str(row["timestamp"]),
                        "event_type": str(row["alert_type"]),
                        "description": str(row["matched_indicator"]),
                        "actor": "correlator",
                    }
                ],
                "related_indicators": [str(row["matched_indicator"])],
            }

        if node_id.startswith("telemetry_"):
            event_id = int(node_id.replace("telemetry_", "", 1))
            ev = conn.execute("SELECT * FROM telemetry_events WHERE id=?", (event_id,)).fetchone()
            if not ev:
                raise HTTPException(status_code=404, detail="Telemetry node not found")
            related = [x for x in [ev["src_ip"], ev["dst_ip"], ev["indicator_domain"], ev["indicator_hash"], ev["asset"]] if x]
            return {
                "node": {"id": node_id, "type": "telemetry", "label": f"{ev['source']} {ev['action'] or ''}".strip()},
                "timeline": [
                    {
                        "timestamp": str(ev["timestamp"]),
                        "event_type": "telemetry_event",
                        "description": str(ev["raw_event"]),
                        "actor": "ingestor",
                    }
                ],
                "related_indicators": related,
            }

    raise HTTPException(status_code=404, detail="Node not found")


# ── Analyst Training Scenario Engine ─────────────────────────────────────────
# Mirrors the client-side TRAINING_SCENARIOS in GlobalAttackMapPage.jsx so that
# analysts can trigger server-broadcast drills from any connected WebSocket client.

_TRAINING_SCENARIO_DEFS: dict[str, dict[str, object]] = {
    "mixed": {
        "label": "Mixed Threat Storm",
        "attacks": [
            {"src_country": "Russia",         "src": [61,  105], "dst_country": "United States",  "dst": [38,  -97], "attack_type": "brute_force",         "severity": "HIGH"},
            {"src_country": "China",          "src": [35,  103], "dst_country": "Germany",         "dst": [51,   10], "attack_type": "exploit_attempt",     "severity": "CRITICAL"},
            {"src_country": "Brazil",         "src": [-14, -51], "dst_country": "United Kingdom",  "dst": [55,   -3], "attack_type": "phishing_campaign",   "severity": "MEDIUM"},
            {"src_country": "India",          "src": [21,   78], "dst_country": "Japan",           "dst": [36,  138], "attack_type": "credential_access",   "severity": "HIGH"},
        ],
    },
    "ransomware": {
        "label": "Ransomware Drill",
        "attacks": [
            {"src_country": "Russia",  "src": [60,  90], "dst_country": "Germany",        "dst": [51,  10], "attack_type": "ransomware_delivery", "severity": "CRITICAL"},
            {"src_country": "Russia",  "src": [64, 120], "dst_country": "France",         "dst": [46,   2], "attack_type": "lateral_movement",    "severity": "HIGH"},
            {"src_country": "China",   "src": [36, 112], "dst_country": "United Kingdom", "dst": [55,  -3], "attack_type": "data_exfiltration",   "severity": "CRITICAL"},
        ],
    },
    "phishing": {
        "label": "Phishing Wave",
        "attacks": [
            {"src_country": "Brazil",         "src": [-14,  -51], "dst_country": "United States", "dst": [38,  -97], "attack_type": "phishing_campaign", "severity": "MEDIUM"},
            {"src_country": "India",          "src": [21,    78], "dst_country": "Canada",        "dst": [56, -106], "attack_type": "credential_access",  "severity": "HIGH"},
            {"src_country": "United Kingdom", "src": [55,    -3], "dst_country": "Australia",     "dst": [-25, 133], "attack_type": "phishing_campaign",  "severity": "MEDIUM"},
        ],
    },
}

# run_id -> asyncio.Task mapping for active drills
_active_training_runs: dict[str, "asyncio.Task[None]"] = {}


def _build_simulated_attack(tpl: dict[str, object], run_id: str) -> dict[str, object]:
    """Create one simulated attack event from a scenario template entry with geo jitter."""
    def _jitter() -> float:
        return (_random.random() - 0.5) * 3.2

    src_coords = tpl.get("src") or [0, 0]
    dst_coords = tpl.get("dst") or [0, 0]
    src_lat = float(src_coords[0]) + _jitter()  # type: ignore[index]
    src_lon = float(src_coords[1]) + _jitter()  # type: ignore[index]
    dst_lat = float(dst_coords[0]) + _jitter()  # type: ignore[index]
    dst_lon = float(dst_coords[1]) + _jitter()  # type: ignore[index]
    attack_id = f"sim_{run_id}_{uuid.uuid4().hex[:8]}"
    return {
        "id": attack_id,
        "src_country": str(tpl.get("src_country") or "Unknown"),
        "dst_country": str(tpl.get("dst_country") or "Unknown"),
        "attack_type": str(tpl.get("attack_type") or "suspicious_activity"),
        "severity": str(tpl.get("severity") or "MEDIUM"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": {"lat": round(src_lat, 4), "lon": round(src_lon, 4), "label": str(tpl.get("src_country") or "Unknown"), "ip": ""},
        "target": {"lat": round(dst_lat, 4), "lon": round(dst_lon, 4), "label": str(tpl.get("dst_country") or "Unknown"), "ip": ""},
        "target_sector": "Training",
        "title": f"SIM \u00b7 {str(tpl.get('attack_type') or 'attack').replace('_', ' ')}",
        "simulation": True,
        "run_id": run_id,
    }


async def _training_scenario_runner(
    run_id: str,
    scenario_key: str,
    count: int,
    rate_ms: int,
) -> None:
    """Coroutine: emit `count` simulated attacks (0 = unlimited) every `rate_ms` ms."""
    scenario = _TRAINING_SCENARIO_DEFS.get(scenario_key)
    if not scenario:
        _active_training_runs.pop(run_id, None)
        return
    templates = list(scenario.get("attacks") or [])  # type: ignore[arg-type]
    if not templates:
        _active_training_runs.pop(run_id, None)
        return
    delay = max(0.2, rate_ms / 1000.0)
    emitted = 0
    try:
        while count == 0 or emitted < count:
            tpl = templates[emitted % len(templates)]
            queue_broadcast("new_attack", _build_simulated_attack(dict(tpl), run_id))  # type: ignore[arg-type]
            emitted += 1
            await asyncio.sleep(delay)
    except asyncio.CancelledError:
        pass
    finally:
        _active_training_runs.pop(run_id, None)


@app.get("/api/training/scenarios")  # type: ignore
def list_training_scenarios():
    """Return all available analyst training scenario definitions."""
    return [
        {
            "key": k,
            "label": str(v.get("label") or k),
            "attack_count": len(list(v.get("attacks") or [])),  # type: ignore[arg-type]
        }
        for k, v in _TRAINING_SCENARIO_DEFS.items()
    ]


class TrainingRunRequest(BaseModel):
    count: int = 20      # total events to emit (0 = run until stopped)
    rate_ms: int = 1200  # milliseconds between events


@app.post("/api/training/scenarios/{scenario_key}/run")  # type: ignore
def start_training_scenario(scenario_key: str, body: TrainingRunRequest = TrainingRunRequest()):
    """
    Launch a server-side training drill that broadcasts simulated ``new_attack``
    events via the WebSocket stream so every connected globe client sees them.

    scenario_key: one of ``mixed``, ``ransomware``, ``phishing``
    """
    key = scenario_key.strip().lower()
    if key not in _TRAINING_SCENARIO_DEFS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown scenario '{key}'. Available: {list(_TRAINING_SCENARIO_DEFS)}",
        )
    count = max(0, min(int(body.count), 500))
    rate_ms = max(200, min(int(body.rate_ms), 10_000))
    run_id = uuid.uuid4().hex[:12]
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Event loop not available")

    task: asyncio.Task[None] = loop.create_task(
        _training_scenario_runner(run_id, key, count, rate_ms)
    )
    _active_training_runs[run_id] = task
    label = str(_TRAINING_SCENARIO_DEFS[key].get("label") or key)
    return {
        "run_id": run_id,
        "scenario_key": key,
        "label": label,
        "count": count,
        "rate_ms": rate_ms,
        "status": "running",
    }


@app.delete("/api/training/scenarios/runs/{run_id}")  # type: ignore
def stop_training_scenario(run_id: str):
    """Cancel an active training run by its run_id."""
    task = _active_training_runs.pop(run_id, None)
    if task is None:
        raise HTTPException(status_code=404, detail="Run not found or already completed")
    task.cancel()
    return {"run_id": run_id, "status": "cancelled"}


@app.get("/api/training/scenarios/runs")  # type: ignore
def list_training_runs():
    """List currently active (not yet completed) training scenario runs."""
    return [
        {"run_id": rid, "active": not task.done()}
        for rid, task in list(_active_training_runs.items())
    ]
