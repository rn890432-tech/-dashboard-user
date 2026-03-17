# AI Threat Intelligence Feed Aggregator

## Goal
Automatic ingestion of threat feeds (malicious IPs, phishing domains, malware hashes) and enrichment of investigations with AI-prioritized indicator context.

## Architecture

1. **Feed Sources Registry** (`threat_feed_sources`)
   - Stores source metadata and indicator payloads.
   - Tracks enablement, reliability, and run status.

2. **Aggregation Engine** (`services/threat_feed_aggregator`)
   - Normalizes indicators by type.
   - Applies deterministic AI-style relevance scoring (`ai_relevance`).
   - Produces merged indicator set and type breakdown.

3. **Persistence Layer**
   - IOC upsert into `indicators`.
   - AI enrichment upsert into `indicator_enrichment`.
   - Run telemetry in `threat_feed_runs`.

4. **Auto-Ingestion Loop**
   - Background task runs in FastAPI lifespan.
   - Reads config keys:
     - `threat_intel_auto_ingest_enabled`
     - `threat_intel_auto_ingest_interval_minutes`
   - Triggers periodic aggregation when due.

## API Endpoints

- `GET /api/threat-intel/aggregator/status`
  - Returns auto mode, interval, sources, and last run.

- `POST /api/threat-intel/aggregator/run`
  - Manual run trigger.

- `POST /api/threat-intel/aggregator/auto-config`
  - Update auto-ingestion config.

- `GET /api/threat-intel/aggregator/runs`
  - Historical run log.

- `GET /api/investigation/enrichment?incident_id=<id>&limit=30`
  - Indicator enrichment for investigations.

## Investigation Enrichment Integration

- `GET /api/investigation/graph-insights` now includes:
  - `threat_intel_enrichment`
  - prioritized indicator matches by `best_ai_relevance`

## Backward Compatibility

- Existing endpoint `GET /api/threat-intel/update` now delegates to the aggregator engine.
