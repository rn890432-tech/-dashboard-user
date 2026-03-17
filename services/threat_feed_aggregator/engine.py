from __future__ import annotations

import hashlib
from typing import Any

SUPPORTED_INDICATOR_TYPES = ("ip", "domain", "hash")

DEFAULT_FEED_SOURCES: list[dict[str, Any]] = [
    {
        "source_id": "feed_malicious_ip",
        "name": "Global Malicious IP Pulse",
        "indicator_type": "ip",
        "reliability": 0.92,
        "items": ["45.33.12.90", "185.94.111.22", "103.12.44.8", "91.242.47.19", "46.183.221.33"],
    },
    {
        "source_id": "feed_phishing_domains",
        "name": "Phishing Domain Radar",
        "indicator_type": "domain",
        "reliability": 0.88,
        "items": ["login-reset-secure.com", "microsoft-verify-now.net", "payroll-auth-check.org", "invoice-review-portal.com"],
    },
    {
        "source_id": "feed_malware_hashes",
        "name": "Malware Hash Exchange",
        "indicator_type": "hash",
        "reliability": 0.95,
        "items": [
            "sha256:7f3aa9d0e4f9c12db5c0a882001a99be11ab19d4f0da0093324f11f0a9ac1ee1",
            "sha256:19e840f7a22aa1d6da2127de88e6a3d8a497fc741fa31a6f76f8f2201a749cb9",
            "sha256:4f3a5bb1e2f2fa39d939807d2df38f3988d1e5c3cebe919f9497a6e68ab2c7b1",
        ],
    },
]


def _normalize_indicator(indicator_type: str, value: str) -> str:
    t = (indicator_type or "").strip().lower()
    v = (value or "").strip()
    if t == "domain":
        return v.lower()
    if t == "hash":
        return v.lower()
    return v


def _ai_relevance_score(indicator_type: str, value: str, reliability: float) -> float:
    """Deterministic 'AI-style' enrichment score for triage prioritization.

    This intentionally avoids non-deterministic model calls while still producing
    an explainable score used by investigation enrichment.
    """
    t = (indicator_type or "").strip().lower()
    base = max(0.0, min(1.0, float(reliability or 0.5)))

    rarity_hint = 0.0
    if t == "ip":
        rarity_hint = 0.04 if value and value.split(".")[0].isdigit() and int(value.split(".")[0]) % 3 == 0 else 0.0
    elif t == "domain":
        suspicious_tokens = ["verify", "secure", "auth", "reset", "update", "invoice", "payroll"]
        rarity_hint = 0.06 if any(tok in value.lower() for tok in suspicious_tokens) else 0.0
    elif t == "hash":
        rarity_hint = 0.08 if value.startswith("sha256:") else 0.04

    digest = hashlib.sha256(f"{t}:{value}".encode("utf-8", errors="ignore")).hexdigest()
    jitter = (int(digest[:4], 16) % 9) / 100.0  # deterministic 0.00-0.08

    score = base * 0.72 + rarity_hint + jitter
    return round(max(0.0, min(1.0, score)), 2)


def aggregate_threat_feeds(feed_sources: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    sources = feed_sources or DEFAULT_FEED_SOURCES

    indicators: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for source in sources:
        indicator_type = str(source.get("indicator_type") or "").strip().lower()
        if indicator_type not in SUPPORTED_INDICATOR_TYPES:
            continue
        source_name = str(source.get("name") or source.get("source_id") or "threat_feed")
        source_id = str(source.get("source_id") or source_name.lower().replace(" ", "_"))
        reliability = float(source.get("reliability") or 0.7)

        for raw in list(source.get("items") or []):
            normalized = _normalize_indicator(indicator_type, str(raw))
            if not normalized:
                continue
            key = (indicator_type, normalized)
            if key in seen:
                continue
            seen.add(key)
            ai_score = _ai_relevance_score(indicator_type, normalized, reliability)
            indicators.append(
                {
                    "type": indicator_type,
                    "value": normalized,
                    "source": source_name,
                    "source_id": source_id,
                    "confidence": round(max(0.0, min(1.0, reliability)), 2),
                    "ai_relevance": ai_score,
                    "enrichment": {
                        "explainability": f"Scored by deterministic threat heuristics for {indicator_type} indicators.",
                        "score_factors": {
                            "feed_reliability": round(max(0.0, min(1.0, reliability)), 2),
                            "pattern_score": ai_score,
                        },
                    },
                }
            )

    type_breakdown: dict[str, int] = {"ip": 0, "domain": 0, "hash": 0}
    for item in indicators:
        t = str(item.get("type") or "")
        type_breakdown[t] = type_breakdown.get(t, 0) + 1

    return {
        "sources": [
            {
                "source_id": str(s.get("source_id") or ""),
                "name": str(s.get("name") or ""),
                "indicator_type": str(s.get("indicator_type") or ""),
                "enabled": bool(s.get("enabled", True)),
                "items": len(list(s.get("items") or [])),
            }
            for s in sources
        ],
        "indicators": indicators,
        "total_indicators": len(indicators),
        "type_breakdown": type_breakdown,
    }
