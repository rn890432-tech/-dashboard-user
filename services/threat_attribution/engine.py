from __future__ import annotations

from typing import Any


def _normalize_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [x.strip() for x in str(value).split(",") if x.strip()]


def _signal_from_telemetry(telemetry: list[dict[str, Any]]) -> dict[str, float]:
    signals = {
        "phishing": 0.0,
        "execution": 0.0,
        "lateral": 0.0,
        "exfiltration": 0.0,
        "credential": 0.0,
    }
    for ev in telemetry:
        s = f"{ev.get('source', '')} {ev.get('action', '')} {ev.get('description', '')}".lower()
        if "phish" in s or "email" in s:
            signals["phishing"] += 1.0
        if "powershell" in s or "cmd" in s or "script" in s:
            signals["execution"] += 1.0
        if "lateral" in s or "remote service" in s or "wmic" in s or "rdp" in s:
            signals["lateral"] += 1.0
        if "exfil" in s or "large transfer" in s:
            signals["exfiltration"] += 1.0
        if "credential" in s or "login failed" in s or "brute" in s:
            signals["credential"] += 1.0
    return signals


def analyze_attribution(
    incident: dict[str, Any] | None,
    threats: list[dict[str, Any]],
    alerts: list[dict[str, Any]],
    telemetry: list[dict[str, Any]],
    threat_actor_records: list[dict[str, Any]],
) -> dict[str, Any]:
    matched_ips = set()
    matched_domains = set() # type: ignore
    matched_hashes = set()
    matched_techniques = set()

    for t in threats:
        if t.get("source_ip"):
            matched_ips.add(str(t["source_ip"]))
        if t.get("dest_ip"):
            matched_ips.add(str(t["dest_ip"]))
        if t.get("indicator_domain"):
            matched_domains.add(str(t["indicator_domain"]))
        if t.get("indicator_hash"):
            matched_hashes.add(str(t["indicator_hash"]))
        if t.get("mitre_technique"):
            matched_techniques.add(str(t["mitre_technique"]).upper())

    for a in alerts:
        mi = str(a.get("matched_indicator") or "")
        if mi.startswith("ip:"):
            matched_ips.add(mi.split(":", 1)[1])
        elif mi.startswith("domain:"):
            matched_domains.add(mi.split(":", 1)[1])
        elif mi.startswith("hash:"):
            matched_hashes.add(mi.split(":", 1)[1])

    telemetry_signals = _signal_from_telemetry(telemetry)

    candidates: list[dict[str, Any]] = []
    for actor in threat_actor_records:
        actor_name = str(actor.get("actor_name") or "Unknown")
        known_ips = set(_normalize_list(actor.get("known_ips")))
        known_domains = set(_normalize_list(actor.get("known_domains")))
        associated_malware = set(_normalize_list(actor.get("associated_malware")))
        techniques = {x.upper() for x in _normalize_list(actor.get("attack_techniques"))}

        ip_matches = sorted(matched_ips & known_ips)
        domain_matches = sorted(matched_domains & known_domains)
        hash_matches = sorted(matched_hashes & associated_malware)
        technique_matches = sorted(matched_techniques & techniques)

        indicator_match_score = min(1.0, (len(ip_matches) * 0.22) + (len(domain_matches) * 0.2) + (len(hash_matches) * 0.28))
        technique_match_score = min(1.0, len(technique_matches) * 0.24)

        behavior_boost = 0.0
        if "T1566" in techniques:
            behavior_boost += min(0.18, telemetry_signals["phishing"] * 0.03)
        if "T1059" in techniques:
            behavior_boost += min(0.18, telemetry_signals["execution"] * 0.03)
        if "T1021" in techniques:
            behavior_boost += min(0.12, telemetry_signals["lateral"] * 0.02)

        confidence = max(0.05, min(0.98, (indicator_match_score * 0.52) + (technique_match_score * 0.36) + behavior_boost))

        candidates.append(
            {
                "actor_name": actor_name,
                "confidence": round(confidence, 3),
                "matching_techniques": technique_matches,
                "matching_indicators": {
                    "ips": ip_matches,
                    "domains": domain_matches,
                    "hashes": hash_matches,
                },
                "known_campaign_info": {
                    "aliases": _normalize_list(actor.get("aliases")),
                    "target_industries": _normalize_list(actor.get("target_industries")),
                },
                "component_scores": {
                    "indicator_match": round(indicator_match_score, 3),
                    "technique_match": round(technique_match_score, 3),
                    "behavior_boost": round(behavior_boost, 3),
                },
            }
        )

    candidates.sort(key=lambda c: c["confidence"], reverse=True)
    best = candidates[0] if candidates else None

    return {
        "incident_id": incident.get("id") if incident else None,
        "possible_actor": best["actor_name"] if best else "unknown",
        "confidence": best["confidence"] if best else 0.0,
        "matching_techniques": best["matching_techniques"] if best else [],
        "matching_indicators": (
            (best["matching_indicators"]["ips"] + best["matching_indicators"]["domains"] + best["matching_indicators"]["hashes"])
            if best
            else []
        ),
        "top_candidate": best,
        "candidates": candidates,
    }
