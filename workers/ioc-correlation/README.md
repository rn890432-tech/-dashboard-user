# IOC Correlation Worker

Responsibilities:

- match incoming telemetry against known indicators
- generate alerts on IOC matches

Runtime integration:

- Ingestion entrypoint: `POST /api/telemetry/ingest`
- Alert endpoint: `POST /api/alerts/create`
- Realtime event: `new_alert`

The active worker logic is implemented in `main.py` via correlation helpers.
