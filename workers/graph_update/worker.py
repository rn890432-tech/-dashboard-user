"""
Graph Update Worker
===================

Consumes *graph_updates* topic messages and forwards them to all connected
WebSocket clients via the existing ``queue_broadcast`` StreamHub mechanism.

Responsibilities
----------------
* Receive graph node/edge update payloads from the broker.
* Validate tenant isolation (org_id must be present).
* Broadcast via ``queue_broadcast("graph_update", payload)`` so the
  Investigation Graph panel and any other WebSocket consumers react in
  real time.
* Maintain per-org deduplication: identical updates within a 5-second
  window are collapsed to avoid flooding the graph panel.
* On failure — back-off and requeue via broker.requeue().

Tenant isolation — org_id is carried in every EventMessage; the worker
skips messages that lack it.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from services.event_broker import event_broker

log = logging.getLogger("worker.graph_update")

# Dedup window in seconds — same update within this window is dropped
_DEDUP_WINDOW = 5.0

# Lightweight dedup cache: {dedup_key: last_broadcast_ts}
_dedup_cache: dict[str, float] = {}
_DEDUP_MAX_SIZE = 5_000   # evict when over this limit


def _dedup_key(org_id: str, update: dict[str, Any]) -> str:
    """Produce a short key for deduplication."""
    return (
        f"{org_id}:"
        f"{update.get('type', '')}:"
        f"{update.get('alert_id', '')}:"
        f"{update.get('rule_id', '')}"
    )


def _is_duplicate(key: str) -> bool:
    now = time.time()
    last = _dedup_cache.get(key)
    if last and (now - last) < _DEDUP_WINDOW:
        return True
    _dedup_cache[key] = now
    # Evict old entries when cache grows too large
    if len(_dedup_cache) > _DEDUP_MAX_SIZE:
        cutoff = now - _DEDUP_WINDOW * 2
        stale = [k for k, ts in _dedup_cache.items() if ts < cutoff]
        for k in stale:
            del _dedup_cache[k]
    return False


# ── broadcast helper ──────────────────────────────────────────────────────────

def _broadcast_to_graph(update: dict[str, Any], org_id: str) -> None:
    """Forward update to the StreamHub — best effort."""
    try:
        from main import queue_broadcast  # type: ignore  # noqa: PLC0415

        queue_broadcast(
            "graph_update",
            {
                **update,
                "org_id": org_id,
                "worker_ts": time.time(),
            },
        )
        log.debug(
            "graph_update broadcast org=%s type=%s",
            org_id,
            update.get("type", "unknown"),
        )
    except Exception as exc:  # noqa: BLE001
        log.debug("graph_update broadcast skipped: %s", exc)


# ── message processor ─────────────────────────────────────────────────────────

async def _process_message(msg: Any) -> None:  # msg: EventMessage
    body: dict[str, Any] = msg.payload
    org_id: str = str(body.get("org_id") or msg.org_id or "")
    update: dict[str, Any] = body.get("update") or {}

    if not org_id:
        log.warning("Dropping graph_update message %s — missing org_id", msg.id)
        return

    event_broker.metrics.record_consume("graph_updates")

    key = _dedup_key(org_id, update)
    if _is_duplicate(key):
        log.debug("Deduped graph_update %s (key=%s)", msg.id, key)
        return

    _broadcast_to_graph(update, org_id)


# ── main worker loop ──────────────────────────────────────────────────────────

async def run_graph_update_worker(shutdown_event: asyncio.Event) -> None:
    """
    Long-running asyncio task.  Registered during FastAPI lifespan startup.

    Safe to cancel — the loop exits cleanly on asyncio.CancelledError.
    """
    log.info("Graph update worker started.")
    q = event_broker._queues["graph_updates"]

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
                "Graph worker failed msg=%s attempt=%d: %s",
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

    log.info("Graph update worker stopped.")
