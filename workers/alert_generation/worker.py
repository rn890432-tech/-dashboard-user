"""
Alert Generation Worker
=======================

Consumes the *alerts_generated* topic and handles post-alert routing:

  1. HIGH / CRITICAL alerts → broadcast to the ``ai_triage_queue`` WebSocket
     event so the AI Analyst Panel picks them up in real time.
  2. CRITICAL alerts → auto-create a SOC case in SQLite (best-effort).

The alert record itself is already persisted by ``evaluate_rules_for_event``
in the rule evaluation path, so this worker is strictly about *routing*
and *escalation* — not duplicate persistence.

Tenant isolation — org_id is validated on every message before routing.
"""
from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import sqlite3
import time
import uuid
from typing import Any

from services.event_broker import event_broker

log = logging.getLogger("worker.alert_generation")

_THREAD_POOL = concurrent.futures.ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="alert-gen"
)

HIGH_SEVERITY  = frozenset({"HIGH", "CRITICAL"})
CRITICAL_ONLY  = frozenset({"CRITICAL"})

DB_PATH = "redteam.db"


# ── AI triage broadcast ───────────────────────────────────────────────────────

def _route_to_ai_triage(alert: dict[str, Any], org_id: str) -> None:
    """queue_broadcast via the existing StreamHub — best effort."""
    try:
        from main import queue_broadcast  # type: ignore  # noqa: PLC0415

        queue_broadcast(
            "ai_triage_queue",
            {
                "alert_id":   alert.get("alert_id"),
                "rule_id":    alert.get("rule_id"),
                "rule_name":  alert.get("rule_name"),
                "severity":   alert.get("severity"),
                "org_id":     org_id,
                "source":     "alert_generation_worker",
                "ts":         time.time(),
            },
        )
    except Exception as exc:  # noqa: BLE001
        log.debug("AI triage broadcast skipped: %s", exc)


# ── auto case escalation ──────────────────────────────────────────────────────

def _sync_create_case(alert: dict[str, Any], org_id: str) -> None:
    """Create a SOC case row for a CRITICAL alert — runs in thread pool."""
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    title = f"[AUTO] CRITICAL: {alert.get('rule_name', 'Unknown Rule')}"
    description = (
        f"Auto-escalated from CRITICAL detection rule alert.\n"
        f"Alert ID  : {alert.get('alert_id')}\n"
        f"Rule      : {alert.get('rule_name')} ({alert.get('rule_id')})\n"
        f"MITRE     : {alert.get('mitre_technique', 'N/A')}\n"
        f"Org       : {org_id}"
    )
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute(
            """INSERT INTO cases
               (id, title, description, status, severity, org_id,
                created_by, created_at, updated_at, alert_ids)
               VALUES (?, ?, ?, 'open', 'CRITICAL', ?,
                       'system_auto', ?, ?, ?)""",
            (
                case_id, title, description, org_id,
                now, now,
                str(alert.get("alert_id") or ""),
            ),
        )
        conn.commit()
        conn.close()
        log.info(
            "Auto-escalated CRITICAL alert %s → case %s (org=%s)",
            alert.get("alert_id"),
            case_id,
            org_id,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "Could not auto-create case for alert %s: %s",
            alert.get("alert_id"),
            exc,
        )


async def _auto_escalate_to_case(alert: dict[str, Any], org_id: str) -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            _THREAD_POOL, _sync_create_case, alert, org_id
        )
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "Escalation thread failed for alert %s: %s",
            alert.get("alert_id"),
            exc,
        )


# ── message processor ─────────────────────────────────────────────────────────

async def _process_message(msg: Any) -> None:  # msg: EventMessage
    body: dict[str, Any] = msg.payload
    org_id: str = str(body.get("org_id") or msg.org_id or "")
    alert: dict[str, Any] = body.get("alert") or {}
    severity: str = str(alert.get("severity") or "MEDIUM").upper()

    if not org_id:
        log.warning("Dropping alert message %s — missing org_id", msg.id)
        return

    event_broker.metrics.record_consume("alerts_generated")

    if severity in HIGH_SEVERITY:
        _route_to_ai_triage(alert, org_id)

    if severity in CRITICAL_ONLY:
        await _auto_escalate_to_case(alert, org_id)


# ── main worker loop ──────────────────────────────────────────────────────────

async def run_alert_generation_worker(shutdown_event: asyncio.Event) -> None:
    """Long-running asyncio task for alert post-processing."""
    log.info("Alert generation worker started.")
    q = event_broker._queues["alerts_generated"]

    while not shutdown_event.is_set():
        try:
            msg = await asyncio.wait_for(q.get(), timeout=1.0)
        except asyncio.TimeoutError:
            continue
        except asyncio.CancelledError:
            break

        try:
            await _process_message(msg)
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "Alert worker failed msg=%s attempt=%d: %s",
                msg.id,
                msg.attempt,
                exc,
            )
            await event_broker.requeue(msg)
        finally:
            try:
                q.task_done()
            except ValueError:
                pass

    log.info("Alert generation worker stopped.")
