# Autonomous AI SOC Analyst Service

Capabilities implemented:

- automatic alert investigation
- attack classification
- response recommendation
- false-positive closure

API surface:

- `POST /api/ai-analyst/run`
- `GET /api/ai-analyst/findings`
- `GET /api/ai-analyst/summary`
- `PATCH /api/ai-analyst/alerts/{alert_id}/disposition`

Runtime logic is currently implemented in `main.py` via rule-based analyst functions.
