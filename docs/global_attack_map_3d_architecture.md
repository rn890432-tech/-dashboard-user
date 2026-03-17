# 3D Global Live Cyber Attack Map

## Attack event pipeline

1. **Ingestion sources**
   - `POST /threats` emits `new_attack`
   - IOC alert creation emits `new_attack`
   - `POST /incidents` emits `incident_detected`
   - `POST /api/threat-attribution/analyze` emits `threat_actor_activity`

2. **Aggregation API**
   - `GET /api/attacks/live?limit=180&window_minutes=15`
   - Returns normalized attack events with:
     - source/target geo points
     - country names
     - attack type and severity
     - optional threat actor overlay data
     - live statistics (APM, top countries, sectors, attack types)

3. **Detail drilldown API**
   - `GET /api/attacks/live/{attack_id}/details`
   - Returns:
     - linked incident details
     - related alerts
     - MITRE ATT&CK mapping

---

## 3D globe visualization

Route:
- `/dashboard/global-attack-map`

Main features:
- rotating WebGL globe (`@react-three/fiber` + Three.js)
- zoom/rotate controls (`OrbitControls`)
- procedural Earth texture (self-contained, no external asset dependency)
- country boundary overlays (enhanced polygonal outlines)
- procedural night-lights overlay layer (additive blending)
- dynamic atmosphere shell (animated opacity)
- animated attack arcs between source and target
- pulsing source/target points (active region glow)
- severity-aware arc speed (critical fastest, low slowest)
- persistent visual trail for critical attack arcs
- threat actor icon (`🕵️`) near source when attribution confidence exists
- toggle between 2D and 3D mode
- auto-rotate toggle for analyst control
- performance mode toggle (adaptive quality profile)
- time-window slider (5–60 minutes)
- hotspot clustering list for famous cyber-map style UX

Performance mode behavior:
- lower globe mesh segments
- reduced starfield density
- capped visible arcs in 3D
- reduced trail persistence sampling
- lower device pixel ratio target
- slower polling cadence to reduce CPU/GPU/network load

Severity color model:
- low → yellow
- medium → orange
- high → red
- critical → purple

---

## Real-time streaming architecture

WebSocket:
- `/ws/stream`

Live events consumed by the map page:
- `new_attack`
- `incident_detected`
- `threat_actor_activity`

Client behavior:
- polling fallback every 5s
- immediate refresh on qualifying websocket events
- details fetched on-demand when an attack arc is clicked
