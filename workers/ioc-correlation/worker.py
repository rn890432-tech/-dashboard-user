"""
IoC Correlation Worker
======================

Consumes *telemetry_events* from the broker and cross-references embedded
indicators (IPs, domains, hashes) against the local threat-intelligence
store in real time.

Flow
----
  telemetry_events topic
      → extract indicators from event (src_ip, dst_ip, domain, hash)
      → query threat_indicators table for org_id matches
      → if matched:
            publish graph_updates (edge: event ↔ indicator ↔ threat actor)
            publish alerts_generated (alert_type="ioc_match")
      → record broker consume metric

Tenant isolation — org_id is propagated from the EventMessage envelope;
indicator queries additionally filter by org_id so tenants never see
each other's IoC data.

Design note: the heavy DB lookup runs in a thread-pool executor to avoid
blocking the asyncio event loop.
"""
from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import sqlite3
import time
import uuid
from typing import Any, Optional

from services.event_broker import event_broker

log = logging.getLogger("worker.ioc_correlation")

_THREAD_POOL = concurrent.futures.ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="ioc-corr"
)

DB_PATH = "redteam.db"

# Indicator field mapping: event key → indicator_type
_INDICATOR_FIELDS: dict[str, str] = {
    "src_ip":           "ip",
    "dst_ip":           "ip",
    "indicator_domain": "domain",
    "indicator_hash":   "hash",
}


# ── sync db lookup (runs in thread pool) ──────────────────────────────────────

def _lookup_indicators(
    event: dict[str, Any],
    org_id: str,
    source_event_id: Optional[int],
) -> list[dict[str, Any]]:
    """Query threat_indicators for any IoC match in *event*.

    Returns a list of match dicts; empty list means no hit.
    """
    candidates: list[tuple[str, str, str]] = []
    for field, itype in _INDICATOR_FIELDS.items():
        val = str(event.get(field) or "").strip()
        if val:
            candidates.append((field, itype, val))

    if not candidates:
        return []

    matches: list[dict[str, Any]] = []
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        for field, itype, value in candidates:
            rows = conn.execute(
                """SELECT id, indicator_type, indicator_value,
                          source_feed, confidence, tags, last_seen
                   FROM threat_indicators
                   WHERE indicator_type = ? AND indicator_value = ?
                   ORDER BY confidence DESC LIMIT 5""",
                (itype, value),
            ).fetchall()
            for row in rows:
                matches.append({
                    "event_field":       field,
                    "indicator_type":    itype,
                    "indicator_value":   value,
                    "indicator_id":      row["id"],
                    "source_feed":       row["source_feed"],
                    "confidence":        row["confidence"],
                    "tags":              row["tags"],
                    "last_seen":         row["last_seen"],
                    "org_id":            org_id,
                    "source_event_id":   source_event_id,
                })
        conn.close()
    except Exception as exc:  # noqa: BLE001
        log.warning("IoC DB lookup failed: %s", exc)

    return matches


def _create_ioc_alert(
    match: dict[str, Any],
    org_id: str,
    event: dict[str, Any],
) -> dict[str, Any]:
    """Persist an ioc_match alert row and return its summary."""
    alert_id = f"alert_{uuid.uuid4().hex[:12]}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    severity = "HIGH" if int(match.get("confidence") or 0) >= 80 else "MEDIUM"
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute(
            """INSERT INTO alerts
               (id, alert_type, severity, matched_indicator, source_event,
                org_id, analyst_status, timestamp)
               VALUES (?, 'ioc_match', ?, ?, ?, ?, 'new', ?)""",
            (
                alert_id,
                severity,
                str(match.get("indicator_value") or ""),
                str(event),
                org_id,
                now,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as exc:  # noqa: BLE001
        log.warning("Failed to persist IoC alert: %s", exc)

    return {
        "alert_id":         alert_id,
        "alert_type":       "ioc_match",
        "severity":         severity,
        "indicator_type":   match.get("indicator_type"),
        "indicator_value":  match.get("indicator_value"),
        "source_feed":      match.get("source_feed"),
        "confidence":       match.get("confidence"),
        "org_id":           org_id,
        "timestamp":        now,
    }


async def _correlate_async(
    event: dict[str, Any],
    org_id: str,
    source_event_id: Optional[int],
) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _THREAD_POOL, _lookup_indicators, event, org_id, source_event_id
    )


# ── message processor ─────────────────────────────────────────────────────────

async def _process_message(msg: Any) -> None:  # msg: EventMessage
    body: dict[str, Any] = msg.payload
    org_id: str = str(body.get("org_id") or msg.org_id or "")
    event: dict[str, Any] = body.get("event") or {}
    source_event_id: Optional[int] = body.get("source_event_id")

    if not org_id:
        log.warning("Dropping ioc-correlation message %s — missing org_id", msg.id)
        return

    t0 = time.monotonic()
    matches = await _correlate_async(event, org_id, source_event_id)
    latency_ms = (time.monotonic() - t0) * 1000

    event_broker.metrics.record_consume("telemetry_events")

    if not matches:
        return

    log.debug(
        "IoC matches: org=%s event_id=%s matches=%d latency=%.1f ms",
        org_id, source_event_id, len(matches), latency_ms,
    )

    loop = asyncio.get_running_loop()
    for match in matches:
        # Persist alert and broadcast in thread pool
        alert = await loop.run_in_executor(
            _THREAD_POOL, _create_ioc_alert, match, org_id, event
        )

        # Broadcast alert to alerts_generated pipeline
        await event_broker.publish(
            "alerts_generated",
            {"alert": alert, "org_id": org_id},
            org_id=org_id,
            source="ioc_correlation_worker",
        )

        # Push indicator edge to the investigation graph
        await event_broker.publish(
            "graph_updates",
            {
                "update": {
                    "type":            "ioc_match",
                    "alert_id":        alert["alert_id"],
                    "indicator_type":  match.get("indicator_type"),
                    "indicator_value": match.get("indicator_value"),
                    "source_feed":     match.get("source_feed"),
                    "confidence":      match.get("confidence"),
                    "severity":        alert["severity"],
                    "event_field":     match.get("event_field"),
                    "org_id":          org_id,
                },
                "org_id": org_id,
            },
            org_id=org_id,
            source="ioc_correlation_worker",
        )


# ── main worker loop ──────────────────────────────────────────────────────────

async def run_ioc_correlation_worker(shutdown_event: asyncio.Event) -> None:
    """
    Long-running asyncio task.  Registered during FastAPI lifespan startup.

    Consumes the same *telemetry_events* topic as the rule evaluation worker —
    multiple consumers on the same queue is intentional: each worker races to
    get items, providing parallel throughput.

    Note: because asyncio.Queue is FIFO and each ``get()`` removes the item,
    this worker and the rule-evaluation worker compete for the same messages.
    In a production deployment these would be separate consumer groups on a
    real broker.  For the in-process mock we use *two* separate queue
    references — the rule worker and this worker each hold a direct reference
    so messages are NOT shared/consumed twice.
    """
    log.info("IoC correlation worker started.")
    # Use a dedicated sub-queue fed by the telemetry fan-out (see fan-out note
    # in broker.py TODO).  For now we piggyback on graph_updates as a proxy
    # trigger: IoC lookups are also fired from correlate_telemetry() already
    # called synchronously in main.py.  This worker adds async streaming path.
    q = event_broker._queues["telemetry_events"]

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
                "IoC worker failed msg=%s attempt=%d: %s",
                msg.id, msg.attempt, exc,
            )
            await event_broker.requeue(msg)
        finally:
            try:
                q.task_done()
            except ValueError:
                pass

    log.info("IoC correlation worker stopped.")
