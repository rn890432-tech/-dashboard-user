"""
Async event broker — lightweight Kafka-style topic queue backed by asyncio.Queue.

Design goals
------------
* Zero external dependencies (no Kafka, Redis).  Pure Python asyncio.
* Drop-in interface — swap for a real broker by replacing publish / subscribe.
* Tenant isolation — every EventMessage carries org_id.
* Back-pressure — QueueFull drops oldest message and records metric.
* Retries + dead-letter queue for failed processing workers.

Topics
------
  telemetry_events   — raw ingested telemetry from the API
  rule_evaluations   — work items dispatched to rule workers  (future use)
  alerts_generated   — generated alert summaries from rule engine
  graph_updates      — investigation graph node/edge updates
"""
from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, AsyncGenerator

from .metrics import BrokerMetrics

# ── constants ─────────────────────────────────────────────────────────────────

TOPICS = (
    "telemetry_events",
    "rule_evaluations",
    "alerts_generated",
    "graph_updates",
)

MAX_QUEUE_SIZE = 10_000   # per topic; back-pressure kicks in at capacity
MAX_DLQ_SIZE   = 1_000
MAX_RETRIES    = 3


# ── message envelope ──────────────────────────────────────────────────────────

class EventMessage:
    """Envelope that travels through the pipeline."""

    __slots__ = ("id", "topic", "payload", "org_id", "ts", "attempt", "source")

    def __init__(
        self,
        topic: str,
        payload: dict[str, Any],
        org_id: str,
        source: str = "system",
    ) -> None:
        self.id:      str             = uuid.uuid4().hex
        self.topic:   str             = topic
        self.payload: dict[str, Any]  = payload
        self.org_id:  str             = org_id
        self.ts:      float           = time.time()
        self.attempt: int             = 0
        self.source:  str             = source

    def __repr__(self) -> str:
        return (
            f"<EventMessage id={self.id[:8]} topic={self.topic!r} "
            f"org={self.org_id!r} attempt={self.attempt}>"
        )


# ── broker ────────────────────────────────────────────────────────────────────

class EventBroker:
    """
    Central async message broker.

    Usage::

        # producer
        await broker.publish("telemetry_events", payload, org_id="acme")

        # consumer (async generator)
        async for msg in broker.subscribe("telemetry_events"):
            ...  # process msg; exceptions are handled by the caller
    """

    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue[EventMessage]] = {
            topic: asyncio.Queue(maxsize=MAX_QUEUE_SIZE) for topic in TOPICS
        }
        self._dlq: asyncio.Queue[dict[str, Any]] = asyncio.Queue(
            maxsize=MAX_DLQ_SIZE
        )
        self.metrics: BrokerMetrics = BrokerMetrics(list(TOPICS))

    # ── publishing ────────────────────────────────────────────────────────────

    async def publish(
        self,
        topic: str,
        payload: dict[str, Any],
        org_id: str,
        source: str = "system",
    ) -> EventMessage:
        """Publish a message; back-pressure: drop oldest if queue is full."""
        if topic not in self._queues:
            raise ValueError(f"Unknown broker topic: {topic!r}")

        msg = EventMessage(topic, payload, org_id, source)
        q = self._queues[topic]
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            # Back-pressure: evict oldest, then insert new message
            try:
                q.get_nowait()
                q.task_done()
            except asyncio.QueueEmpty:
                pass
            await q.put(msg)
            self.metrics.record_drop(topic)

        self.metrics.record_publish(topic)
        return msg

    def publish_sync(
        self,
        topic: str,
        payload: dict[str, Any],
        org_id: str,
        source: str = "system",
    ) -> None:
        """
        Fire-and-forget publish from synchronous code.

        Schedules an async task on the running event loop.  Does nothing if
        no loop is running (e.g. test context without asyncio).
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(self.publish(topic, payload, org_id, source))

    # ── consuming ─────────────────────────────────────────────────────────────

    async def subscribe(self, topic: str) -> AsyncGenerator[EventMessage, None]:
        """Async generator yielding EventMessages indefinitely."""
        if topic not in self._queues:
            raise ValueError(f"Unknown broker topic: {topic!r}")
        q = self._queues[topic]
        while True:
            msg = await q.get()
            try:
                yield msg
            finally:
                q.task_done()

    # ── failure handling ──────────────────────────────────────────────────────

    async def dead_letter(self, msg: EventMessage, reason: str) -> None:
        """Move a message to the dead-letter queue."""
        record: dict[str, Any] = {
            "id":      msg.id,
            "topic":   msg.topic,
            "org_id":  msg.org_id,
            "ts":      msg.ts,
            "attempt": msg.attempt,
            "reason":  reason,
            "payload": msg.payload,
        }
        try:
            self._dlq.put_nowait(record)
        except asyncio.QueueFull:
            pass   # DLQ full — silently drop; monitor dlq_count metric
        self.metrics.record_dlq(msg.topic)

    async def requeue(self, msg: EventMessage) -> None:
        """Re-publish after a transient failure with exponential back-off."""
        msg.attempt += 1
        if msg.attempt >= MAX_RETRIES:
            await self.dead_letter(msg, f"exceeded_max_retries={MAX_RETRIES}")
            return
        # Exponential back-off: 200 ms, 400 ms, 800 ms …
        delay = 0.2 * (2 ** (msg.attempt - 1))
        await asyncio.sleep(delay)
        await self._queues[msg.topic].put(msg)

    # ── introspection ─────────────────────────────────────────────────────────

    @property
    def queue_depths(self) -> dict[str, int]:
        return {t: q.qsize() for t, q in self._queues.items()}

    @property
    def dlq_depth(self) -> int:
        return self._dlq.qsize()

    def peek_dlq(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return up to *limit* messages from the DLQ without removing them."""
        snapshot: list[dict[str, Any]] = []
        tmp: list[Any] = []
        safe = min(max(limit, 1), 200)
        while not self._dlq.empty() and len(snapshot) < safe:
            try:
                item = self._dlq.get_nowait()
                self._dlq.task_done()
                snapshot.append(item)
                tmp.append(item)
            except asyncio.QueueEmpty:
                break
        # Put messages back (order preserved — prepend via sequential put)
        for item in tmp:
            try:
                self._dlq.put_nowait(item)
            except asyncio.QueueFull:
                pass
        return snapshot

    def drain_dlq(self, limit: int = 100) -> list[dict[str, Any]]:
        """Return up to *limit* messages from the DLQ and remove them (destructive)."""
        out: list[dict[str, Any]] = []
        while not self._dlq.empty() and len(out) < limit:
            try:
                out.append(self._dlq.get_nowait())
                self._dlq.task_done()
            except asyncio.QueueEmpty:
                break
        return out


# ── module-level singleton ────────────────────────────────────────────────────
# Imported by all services and workers — the single shared event bus.
event_broker: EventBroker = EventBroker()
