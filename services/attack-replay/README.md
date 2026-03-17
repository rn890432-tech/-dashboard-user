# Attack Replay Service

This service reconstructs intrusion timelines so analysts can replay attacks like a movie.

## Responsibilities

- collect related events from incidents, alerts, telemetry, and threat context
- order events by timestamp
- reconstruct timeline phases (Initial access, Lateral movement, Data exfiltration, etc.)
- expose bookmarkable moments and MITRE ATT&CK mapping

## Runtime Endpoints

- `GET /api/replay/scenarios`
- `GET /api/replay/{scenario_id}`
- `GET /api/attack-replay/{incident_id}`
- `GET /api/attack-replay/{incident_id}/export?format=json|pdf`
