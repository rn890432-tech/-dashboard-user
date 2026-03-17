"""
Streaming throughput + latency metrics for the async event broker.

All operations are lock-free; atomic integer increments are safe under
the GIL so no asyncio.Lock is needed for counters.
"""
from __future__ import annotations

import time
from collections import deque
from typing import Any

# Rolling window (seconds) for events-per-second calculation
_EPS_WINDOW = 60


class _TopicMetrics:
    __slots__ = (
        "published", "consumed", "dropped", "dlq_count", "_ts_window",
    )

    def __init__(self) -> None:
        self.published: int = 0
        self.consumed: int = 0
        self.dropped: int = 0
        self.dlq_count: int = 0
        # Each entry is a publish timestamp; trimmed to _EPS_WINDOW
        self._ts_window: deque[float] = deque()

    def record_publish(self) -> None:
        self.published += 1
        now = time.time()
        self._ts_window.append(now)
        cutoff = now - _EPS_WINDOW
        while self._ts_window and self._ts_window[0] < cutoff:
            self._ts_window.popleft()

    def record_consume(self) -> None:
        self.consumed += 1

    def record_drop(self) -> None:
        self.dropped += 1

    def record_dlq(self) -> None:
        self.dlq_count += 1

    @property
    def eps(self) -> float:
        """Events published per second (rolling 60 s window)."""
        if not self._ts_window:
            return 0.0
        elapsed = max(time.time() - self._ts_window[0] + 1e-6, 1e-6)
        window = min(_EPS_WINDOW, elapsed)
        return len(self._ts_window) / window


class BrokerMetrics:
    """Aggregate metrics across all broker topics."""

    def __init__(self, topics: list[str]) -> None:
        self._topics: dict[str, _TopicMetrics] = {
            t: _TopicMetrics() for t in topics
        }
        self._start = time.time()
        # Keep last 1 000 latency samples for p99 calculation
        self._latency_samples: deque[float] = deque(maxlen=1000)

    # ── per-topic recording ───────────────────────────────────────────────────

    def record_publish(self, topic: str) -> None:
        if topic in self._topics:
            self._topics[topic].record_publish()

    def record_consume(self, topic: str) -> None:
        if topic in self._topics:
            self._topics[topic].record_consume()

    def record_drop(self, topic: str) -> None:
        if topic in self._topics:
            self._topics[topic].record_drop()

    def record_dlq(self, topic: str) -> None:
        if topic in self._topics:
            self._topics[topic].record_dlq()

    def record_latency(self, latency_ms: float) -> None:
        self._latency_samples.append(latency_ms)

    # ── snapshot ──────────────────────────────────────────────────────────────

    def snapshot(self) -> dict[str, Any]:
        samples = sorted(self._latency_samples)
        n = len(samples)
        avg_latency = round(sum(samples) / n, 3) if n else 0.0
        p99_latency = round(samples[int(n * 0.99)], 3) if n else 0.0
        total_eps = sum(m.eps for m in self._topics.values())

        return {
            "uptime_seconds": round(time.time() - self._start, 1),
            "total_eps": round(total_eps, 2),
            "avg_rule_eval_latency_ms": avg_latency,
            "p99_rule_eval_latency_ms": p99_latency,
            "topics": {
                t: {
                    "eps": round(m.eps, 2),
                    "published": m.published,
                    "consumed": m.consumed,
                    "dropped": m.dropped,
                    "dlq_count": m.dlq_count,
                }
                for t, m in self._topics.items()
            },
        }
