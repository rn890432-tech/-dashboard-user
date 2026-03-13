# campaign_detector.py
# Detects and updates active attack campaigns

def detect_campaigns(events, clusters):
    detected = []
    for cluster in clusters:
        targeted_assets = set()
        for ind in cluster['indicators']:
            for evt in events:
                if ind['value'] in evt.values():
                    targeted_assets.add(evt.get('target_asset'))
        detected.append({
            'cluster_id': cluster['cluster_id'],
            'num_indicators': len(cluster['indicators']),
            'targeted_assets': list(targeted_assets),
            'attack_type': cluster['attack_type'],
            'risk_score': cluster['confidence'] * len(targeted_assets)
        })
    return detected
