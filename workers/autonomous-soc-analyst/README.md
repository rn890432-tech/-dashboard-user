# Autonomous SOC Analyst Worker

Worker behavior:

1. Pull open alerts
2. Enrich with telemetry context
3. Classify attack type
4. Recommend response actions
5. Close likely false positives
6. Emit realtime `analyst_update`

Current runtime entrypoint:

- `POST /api/ai-analyst/run`
