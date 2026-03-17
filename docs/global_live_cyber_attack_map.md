# Global Live Cyber Attack Map

## Overview

`GlobalLiveCyberAttackMap.jsx` adds a real-time global cyber map panel to the SOC dashboard.

Data source:
- `GET /api/cyber-map/live?limit=120`

Refresh strategy:
- Poll every 5 seconds
- Also refresh on `/ws/stream` push events

---

## Backend contract

Response schema:

```json
{
  "generated_at": "2026-03-14T18:12:00Z",
  "total_attacks": 120,
  "severity_counts": {
    "CRITICAL": 4,
    "HIGH": 21,
    "MEDIUM": 68,
    "LOW": 19,
    "INFO": 8
  },
  "attacks": [
    {
      "id": "threat_...",
      "kind": "threat|telemetry|alert",
      "title": "Event name",
      "severity": "HIGH",
      "source": { "ip": "1.2.3.4", "label": "40.1°N, 74.0°W", "lat": 40.1, "lon": -74.0 },
      "target": { "ip": "5.6.7.8", "label": "35.0°N, 139.7°E", "lat": 35.0, "lon": 139.7 },
      "arc": { "ctrl_lat": 52.0, "ctrl_lon": 32.0 },
      "timestamp": "2026-03-14T18:11:54Z",
      "live_offset_s": 27
    }
  ]
}
```

---

## Rendering model

- World canvas uses SVG Mercator-like projection.
- Animated attack arcs (`stroke-dasharray + dash animation`)
- Pulsing source/target points
- Severity color coding:
  - CRITICAL: `#ff1744`
  - HIGH: `#ff6d00`
  - MEDIUM: `#ffd54f`
  - LOW: `#64dd17`
  - INFO: `#29b6f6`

---

## Notes

- Geolocation is deterministic pseudo-geolocation derived from IP/hash for visualization consistency in local/demo mode.
- No external geolocation API dependency required.
