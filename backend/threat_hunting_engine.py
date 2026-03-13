# threat_hunting_engine.py
# Scans event stream for suspicious patterns

def scan_events(events, threat_intel):
    detections = []
    for evt in events:
        # Repeated failed logins
        if evt.get('type') == 'login_failed' and evt.get('ip'):
            if evt.get('fail_count', 0) > 5:
                detections.append({'detection_id': f"fail-{evt['ip']}", 'technique_type': 'Brute Force', 'severity': 'high', 'indicators': [evt['ip']], 'confidence': 0.9})
        # Domain linked to threat intel
        if evt.get('domain') and evt['domain'] in threat_intel:
            detections.append({'detection_id': f"domain-{evt['domain']}", 'technique_type': 'Phishing', 'severity': 'medium', 'indicators': [evt['domain']], 'confidence': 0.8})
        # Malware beaconing
        if evt.get('malware_hash') and evt.get('beaconing'):
            detections.append({'detection_id': f"malware-{evt['malware_hash']}", 'technique_type': 'Malware Beaconing', 'severity': 'critical', 'indicators': [evt['malware_hash']], 'confidence': 0.95})
        # Unusual login geography
        if evt.get('user') and evt.get('geo') == 'unusual':
            detections.append({'detection_id': f"geo-{evt['user']}", 'technique_type': 'Suspicious Geography', 'severity': 'medium', 'indicators': [evt['user']], 'confidence': 0.7})
        # Lateral movement
        if evt.get('type') == 'lateral_movement' and evt.get('device'):
            detections.append({'detection_id': f"lateral-{evt['device']}", 'technique_type': 'Lateral Movement', 'severity': 'high', 'indicators': [evt['device']], 'confidence': 0.85})
    return detections
