from __future__ import annotations

from typing import Any


ACTOR_PROFILES: dict[str, dict[str, Any]] = {
    "APT28": {
        "weights": {
            "phishing": 2.0,
            "credential_access": 1.4,
            "powershell": 1.2,
            "c2": 1.2,
            "lateral": 1.0,
            "t1566": 1.8,
            "t1059": 1.4,
            "t1071": 1.0,
        },
        "description": "Known for spear-phishing and rapid post-compromise credential abuse.",
    },
    "Lazarus Group": {
        "weights": {
            "malware": 1.8,
            "hash_ioc": 1.3,
            "c2": 1.4,
            "lateral": 1.2,
            "exfiltration": 1.0,
            "t1105": 1.2,
            "t1041": 1.1,
        },
        "description": "Frequently malware-driven campaigns with staged payload delivery and C2.",
    },
    "FIN7": {
        "weights": {
            "phishing": 1.2,
            "domain_ioc": 1.3,
            "credential_access": 1.0,
            "lateral": 1.3,
            "exfiltration": 1.4,
            "t1566": 1.1,
            "t1021": 1.2,
        },
        "description": "Known for financially motivated intrusion chains and broad enterprise targeting.",
    },
    "APT29": {
        "weights": {
            "stealth": 1.5,
            "c2": 1.1,
            "lateral": 1.1,
            "credential_access": 1.0,
            "t1071": 1.0,
            "t1550": 1.1,
        },
        "description": "Low-noise operations emphasizing persistence and stealthy movement.",
    },
}


def _extract_signals(threats: list[dict[str, Any]], alerts: list[dict[str, Any]], telemetry: list[dict[str, Any]]) -> dict[str, float]:
    signals: dict[str, float] = {
        "phishing": 0.0,
        "malware": 0.0,
        "credential_access": 0.0,
        "lateral": 0.0,
        "exfiltration": 0.0,
        "c2": 0.0,
        "powershell": 0.0,
        "domain_ioc": 0.0,
        "hash_ioc": 0.0,
        "stealth": 0.0,
    }

    for t in threats:
        ttype = str((t.get("type") or "")).lower()
        if "phish" in ttype:
            signals["phishing"] += 1.0
        if "malware" in ttype:
            signals["malware"] += 1.0
        if "credential" in ttype:
            signals["credential_access"] += 1.0
        if "lateral" in ttype:
            signals["lateral"] += 1.0
        if "exfil" in ttype:
            signals["exfiltration"] += 1.0

        mitre = str((t.get("mitre_technique") or "")).upper()
        if mitre:
            key = mitre.lower()
            signals[key] = signals.get(key, 0.0) + 1.0

        if t.get("indicator_domain"):
            signals["domain_ioc"] += 0.7
        if t.get("indicator_hash"):
            signals["hash_ioc"] += 0.7

    for a in alerts:
        atype = str((a.get("alert_type") or "")).lower()
        if "command_and_control" in atype or "c2" in atype:
            signals["c2"] += 1.0
        if "lateral" in atype:
            signals["lateral"] += 0.8
        if "credential" in atype:
            signals["credential_access"] += 0.8

        matched = str(a.get("matched_indicator") or "")
        if matched.startswith("domain:"):
            signals["domain_ioc"] += 0.4
        if matched.startswith("hash:"):
            signals["hash_ioc"] += 0.4

    noisy_events = 0.0
    stealth_events = 0.0
    for ev in telemetry:
        source = str((ev.get("source") or "")).lower()
        action = str((ev.get("action") or "")).lower()
        desc = str((ev.get("description") or "")).lower()

        joined = f"{source} {action} {desc}"
        if "powershell" in joined or "cmd.exe" in joined:
            signals["powershell"] += 1.0
        if "dns" in source and "suspicious" in joined:
            signals["c2"] += 0.4
        if "login" in joined and ("failed" in joined or "brute" in joined):
            signals["credential_access"] += 0.5
        if "lateral" in joined or "remote service" in joined or "wmic" in joined:
            signals["lateral"] += 0.7
        if "exfil" in joined or "large transfer" in joined:
            signals["exfiltration"] += 0.7

        if "blocked" in action or "deny" in action:
            noisy_events += 1.0
        else:
            stealth_events += 1.0

    # approximate stealth indicator: more allowed/silent events than blocked ones
    if stealth_events > noisy_events:
        signals["stealth"] = (stealth_events - noisy_events) / max(1.0, stealth_events + noisy_events)

    return signals


def attribute_threat_actor(
    threats: list[dict[str, Any]],
    alerts: list[dict[str, Any]],
    telemetry: list[dict[str, Any]],
) -> dict[str, Any]:
    signals = _extract_signals(threats, alerts, telemetry)

    actor_scores: list[dict[str, Any]] = []
    for actor, profile in ACTOR_PROFILES.items():
        weights = profile.get("weights", {})
        score = 0.0
        evidence: list[str] = []
        for signal_name, weight in weights.items():
            val = float(signals.get(signal_name, 0.0))
            if val > 0:
                score += val * float(weight)
                if len(evidence) < 8:
                    evidence.append(f"{signal_name}={val:.2f} x {weight:.2f}")

        actor_scores.append(
            {
                "actor": actor,
                "raw_score": round(score, 4),
                "description": profile.get("description", ""),
                "evidence": evidence,
            }
        )

    actor_scores.sort(key=lambda x: float(x["raw_score"]), reverse=True)
    max_score = float(actor_scores[0]["raw_score"]) if actor_scores else 0.0

    for row in actor_scores:
        conf = (float(row["raw_score"]) / max_score) if max_score > 0 else 0.0
        row["confidence"] = round(min(0.99, max(0.05, conf)), 3) if max_score > 0 else 0.0

    top_actor = actor_scores[0] if actor_scores else None
    return {
        "top_actor": top_actor,
        "candidates": actor_scores,
        "signals": {k: round(v, 3) for k, v in signals.items()},
    }
