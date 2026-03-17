# Autonomous Cyber Defense Engine

## Defense engine architecture

1. **Incident intake** (`POST /incidents`)
   - Incident is stored in `incidents`.
   - Timeline event is added in `incident_events`.
   - For `HIGH`/`CRITICAL`, backend auto-triggers defense evaluation.

2. **Evaluation service** (`services/auto_defense_engine`)
   - `playbooks.py` provides `DEFAULT_RESPONSE_PLAYBOOKS`.
   - `engine.py` maps incident signals -> trigger -> candidate actions.
   - Output: ranked recommendations with confidence + rationale.

3. **Execution and approval layer**
   - Safety mode is read from `defense_engine_config.mode`:
     - `monitor_only`
     - `analyst_approval_required`
     - `full_autonomous`
   - Actions are written to `autonomous_defense_log` with status:
     - `monitored`, `pending`, `executed`, `rejected`

4. **Audit + timeline integration**
   - Each defense action is appended to `incident_events` (`event_type=defense_action`).
   - Dashboard timeline and graph can visualize response actions.

5. **Graph integration**
   - Investigation graph includes `defense_action` nodes and links to target assets/IP/domain.

---

## Playbook structure

```json
{
  "playbook_name": "Phishing Containment",
  "trigger": "phishing_detected",
  "actions": ["block_domain", "disable_user_account", "notify_security_team"],
  "base_confidence": 0.82
}
```

Supported action types:
- `block_ip`
- `block_domain`
- `disable_user_account`
- `revoke_sessions`
- `isolate_device`
- `enforce_mfa`
- `notify_slack`
- `notify_email`

---

## Automated response workflow

1. Incident created or selected in `IncidentTimeline`.
2. Frontend requests recommendations:
   - `GET /api/incidents/{incident_id}/defense/recommendations`
3. Analyst picks execution path:
   - Execute immediately: `POST /api/defense/execute`
   - Approve pending: `POST /api/defense/{log_id}/approve`
   - Reject pending: `POST /api/defense/{log_id}/reject`
   - Force run pending: `POST /api/defense/{log_id}/execute-now`
4. System logs action and emits `defense_action` stream event.
5. Incident timeline + graph reflect the response event.
