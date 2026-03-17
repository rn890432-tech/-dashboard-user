from __future__ import annotations

from typing import Any


DEFAULT_RESPONSE_PLAYBOOKS: list[dict[str, Any]] = [
    {
        "playbook_name": "Phishing Containment",
        "trigger": "phishing_detected",
        "actions": [
            "block_domain",
            "disable_user_account",
            "notify_security_team",
        ],
        "base_confidence": 0.82,
    },
    {
        "playbook_name": "Credential Abuse Lockdown",
        "trigger": "credential_access_detected",
        "actions": [
            "revoke_sessions",
            "enforce_mfa",
            "disable_user_account",
            "notify_email",
        ],
        "base_confidence": 0.79,
    },
    {
        "playbook_name": "Malware Isolation",
        "trigger": "malware_detected",
        "actions": [
            "isolate_device",
            "block_ip",
            "notify_slack",
        ],
        "base_confidence": 0.86,
    },
    {
        "playbook_name": "Data Exfiltration Emergency",
        "trigger": "data_exfiltration_detected",
        "actions": [
            "block_ip",
            "revoke_sessions",
            "notify_security_team",
            "notify_email",
        ],
        "base_confidence": 0.9,
    },
]
