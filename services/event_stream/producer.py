"""
Event Stream Producer
=====================
Thin publishing wrapper that routes structured events to the correct
broker topic.  All methods are async-first; publish_*_sync variants
fire-and-forget from synchronous FastAPI endpoints.
"""
from __future__ import annotations

import time
from typing import Any, Optional

from services.event_broker import event_broker


class EventStreamProducer:
    """Publish telemetry and pipeline events to the async broker."""

    # ── async publish helpers ─────────────────────────────────────────────────

    async def publish_telemetry(
        self,
        event: dict[str, Any],
        org_id: str,
        source: str = "api",
        source_event_id: Optional[int] = None,
        event_source: str = "telemetry",
    ) -> None:
        """Publish a raw telemetry event to the *telemetry_events* topic."""
        await event_broker.publish(
            "telemetry_events",
            {
                "event": event,
                "org_id": org_id,
                "source": source,
                "source_event_id": source_event_id,
                "event_source": event_source,
                "ingested_at": time.time(),
            },
            org_id=org_id,
            source=source,
        )

    async def publish_rule_evaluation(
        self,
        event: dict[str, Any],
        org_id: str,
        source_event_id: Optional[int] = None,
        event_source: str = "telemetry",
    ) -> None:
        """Publish a rule-evaluation work item to *rule_evaluations*."""
        await event_broker.publish(
            "rule_evaluations",
            {
                "event": event,
                "org_id": org_id,
                "source_event_id": source_event_id,
                "event_source": event_source,
                "queued_at": time.time(),
            },
            org_id=org_id,
            source=event_source,
        )

    async def publish_alert_generated(
        self,
        alert: dict[str, Any],
        org_id: str,
    ) -> None:
        """Publish a generated alert summary to *alerts_generated*."""
        await event_broker.publish(
            "alerts_generated",
            {
                "alert": alert,
                "org_id": org_id,
                "generated_at": time.time(),
            },
            org_id=org_id,
        )

    async def publish_graph_update(
        self,
        update: dict[str, Any],
        org_id: str,
    ) -> None:
        """Publish an investigation graph node/edge update to *graph_updates*."""
        await event_broker.publish(
            "graph_updates",
            {
                "update": update,
                "org_id": org_id,
                "updated_at": time.time(),
            },
            org_id=org_id,
        )

    # ── fire-and-forget sync wrappers (callable from synchronous FastAPI routes) ─

    def publish_telemetry_sync(
        self,
        event: dict[str, Any],
        org_id: str,
        source: str = "api",
        source_event_id: Optional[int] = None,
        event_source: str = "telemetry",
    ) -> None:
        """Non-blocking publish from synchronous request handlers."""
        event_broker.publish_sync(
            "telemetry_events",
            {
                "event": event,
                "org_id": org_id,
                "source": source,
                "source_event_id": source_event_id,
                "event_source": event_source,
                "ingested_at": time.time(),
            },
            org_id=org_id,
            source=source,
        )

    def publish_rule_evaluation_sync(
        self,
        event: dict[str, Any],
        org_id: str,
        source_event_id: Optional[int] = None,
        event_source: str = "telemetry",
    ) -> None:
        """Non-blocking rule-evaluation dispatch from synchronous code."""
        event_broker.publish_sync(
            "rule_evaluations",
            {
                "event": event,
                "org_id": org_id,
                "source_event_id": source_event_id,
                "event_source": event_source,
                "queued_at": time.time(),
            },
            org_id=org_id,
            source=event_source,
        )


# ── module-level singleton ─────────────────────────────────────────────────────
event_stream_producer: EventStreamProducer = EventStreamProducer()

    async def publish_graph_update(
        self,
        update: dict[str, Any],
        org_id: str,
    ) -> None:
        """Publish a graph node/edge update to *graph_updates*."""
        await event_broker.publish(
            "graph_updates",
            {
                "update": update,
                "org_id": org_id,
                "updated_at": time.time(),
            },
            org_id=org_id,
        )

    # ── sync fire-and-forget variants (for sync FastAPI routes) ───────────────

    def publish_telemetry_sync(
        self,
        event: dict[str, Any],
        org_id: str,
        source: str = "api",
        source_event_id: Optional[int] = None,
        event_source: str = "telemetry",
    ) -> None:
        """Fire-and-forget from a synchronous endpoint — does not block."""
        event_broker.publish_sync(
            "telemetry_events",
            {
                "event": event,
                "org_id": org_id,
                "source": source,
                "source_event_id": source_event_id,
                "event_source": event_source,
                "ingested_at": time.time(),
            },
            org_id=org_id,
            source=source,
        )

    def publish_graph_update_sync(
        self,
        update: dict[str, Any],
        org_id: str,
    ) -> None:
        """Fire-and-forget graph update from sync code."""
        event_broker.publish_sync(
            "graph_updates",
            {
                "update": update,
                "org_id": org_id,
                "updated_at": time.time(),
            },
            org_id=org_id,
        )


# Module-level singleton — imported by main.py and workers.
event_stream_producer: EventStreamProducer = EventStreamProducer()
