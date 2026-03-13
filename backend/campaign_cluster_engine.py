# campaign_cluster_engine.py
# Groups related indicators into campaign clusters

def cluster_indicators(indicators):
    clusters = []
    # Example: group by ASN, domain infra, attack pattern, malware family, campaign ID
    for ind in indicators:
        # Placeholder logic: group by 'campaign_id' if present
        cid = ind.get('campaign_id', 'default')
        found = next((c for c in clusters if c['cluster_id'] == cid), None)
        if not found:
            clusters.append({
                'cluster_id': cid,
                'indicators': [ind],
                'attack_type': ind.get('attack_type', 'unknown'),
                'first_seen': ind.get('first_seen'),
                'last_seen': ind.get('last_seen'),
                'confidence': ind.get('confidence', 0.5)
            })
        else:
            found['indicators'].append(ind)
    return clusters
