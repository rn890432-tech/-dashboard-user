# Telemetry Ingestion Service

This service defines ingestion contracts for security telemetry sources:

- firewall logs
- endpoint logs
- authentication logs
- network flow logs
- DNS logs

Runtime API endpoint:

- `POST /api/telemetry/ingest`

The active implementation is wired in `main.py` and persists to the `telemetry_events` table.
