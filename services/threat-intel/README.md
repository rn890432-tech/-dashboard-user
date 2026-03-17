# Threat Intelligence Service

This service updates indicator feeds for:

- malicious IP lists
- malware hashes
- phishing domains

Runtime API endpoint:

- `GET /api/threat-intel/update`

Indicators are stored in the `indicators` collection-table with fields:

- `type`
- `value`
- `source`
- `confidence_score`
- `last_seen`
