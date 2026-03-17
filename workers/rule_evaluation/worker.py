"""
Rule Evaluation Worker
======================

Consumes events from the *telemetry_events* topic and, for every message:

  1. Evaluates all enabled org detection rules against the event payload
     (delegating to the existing ``evaluate_rules_for_event`` in main.py
     via a thread-pool executor so the event loop is never blocked).
  2. Publishes a message to *alerts_generated* for every matched rule.
  3. Publishes a message to *graph_updates* so the investigation graph
     reflects rule-triggered activity in real time.
  4. Records rule-evaluation latency in broker metrics.

On transient failure the message is re-queued with exponential back-off
(up to MAX_RETRIES); on permanent failure it is sent to the dead-letter queue.

Tenant isolation — only events whose embedded org_id matches the rule's
org_id are evaluated (enforced inside evaluate_rules_for_event).
"""
from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import time
from typing import Any, Optional

from services.event_broker import event_broker

log = logging.getLogger("worker.rule_evaluation")

# Shared thread pool — reused across invocations to avoid spawn overhead.
_THREAD_POOL = concurrent.futures.ThreadPoolExecutor(
    max_workers=4, thread_name_prefix="rule-eval"
)


# ── sync evaluation (runs in thread pool) ─────────────────────────────────────

def _sync_evaluate(
    event: dict[str, Any],
    org_id: str,
    source_event_id: Optional[int],
    event_source: str,
) -> list[dict[str, Any]]:
    """Call the synchronous evaluate_rules_for_event from main.py."""
    # Lazy import to avoid circular dependency at module load time.
    from main import evaluate_rules_for_event  # type: ignore  # noqa: PLC0415

    return evaluate_rules_for_event(
        event,
        org_id=org_id,
        source_event_id=source_event_id,
        event_source=event_source,
    )


# ── async wrapper ─────────────────────────────────────────────────────────────

async def _evaluate_rules_async(
    event: dict[str, Any],
    org_id: str,
    source_event_id: Optional[int],
    event_source: str,
) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _THREAD_POOL,
        _sync_evaluate,
        event,
        org_id,
        source_event_id,
        event_source,
    )


# ── message processor ─────────────────────────────────────────────────────────

async def _process_message(msg: Any) -> None:  # msg: EventMessage
    body: dict[str, Any] = msg.payload
    org_id: str = str(body.get("org_id") or msg.org_id or "")
    event: dict[str, Any] = body.get("event") or {}
    source_event_id: Optional[int] = body.get("source_event_id")
    event_source: str = str(
        body.get("event_source") or body.get("source") or "stream"
    )

    if not org_id:
        log.warning("Dropping telemetry message %s — missing org_id", msg.id)
        return

    t0 = time.monotonic()
    rule_alerts = await _evaluate_rules_async(
        event, org_id, source_event_id, event_source
    )
    latency_ms = (time.monotonic() - t0) * 1000

    event_broker.metrics.record_latency(latency_ms)
    event_broker.metrics.record_consume("telemetry_events")

    log.debug(
        "org=%s event_id=%s rules_matched=%d latency=%.1f ms",
        org_id,
        source_event_id,
        len(rule_alerts),
        latency_ms,
    )

    for alert in rule_alerts:
        # Publish to alerts_generated pipeline
        await event_broker.publish(
            "alerts_generated",
            {
                "alert": {**alert, "latency_ms": round(latency_ms, 3)},
                "org_id": org_id,
            },
            org_id=org_id,
            source="rule_evaluation_worker",
        )
        # Publish graph update
        await event_broker.publish(
            "graph_updates",
            {
                "update": {
                    "type": "rule_alert",
                    **alert,
                },
                "org_id": org_id,
            },
            org_id=org_id,
            source="rule_evaluation_worker",
        )


# ── main worker loop ──────────────────────────────────────────────────────────

async def run_rule_evaluation_worker(shutdown_event: asyncio.Event) -> None:
    """
    Long-running asyncio task.  Run this inside the FastAPI lifespan via
    ``asyncio.create_task(run_rule_evaluation_worker(shutdown_event))``.
    """
    log.info("Rule evaluation worker started.")
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
                "Rule worker failed msg=%s attempt=%d: %s",
                msg.id,
                msg.attempt,
                exc,
            )
            await event_broker.requeue(msg)
        finally:
            try:
                q.task_done()
            except ValueError:
                pass  # task_done() called more times than put()

    log.info("Rule evaluation worker stopped.")
