# graph_correlation_engine.py
# Extracts entities and builds relationships for investigation graph

def extract_entities(event):
    entities = []
    if event.get('source_ip'):
        entities.append({'id': event['source_ip'], 'type': 'ip'})
    if event.get('domain'):
        entities.append({'id': event['domain'], 'type': 'domain'})
    if event.get('user'):
        entities.append({'id': event['user'], 'type': 'user'})
    if event.get('device'):
        entities.append({'id': event['device'], 'type': 'device'})
    if event.get('malware_hash'):
        entities.append({'id': event['malware_hash'], 'type': 'malware'})
    return entities

def build_relationships(event):
    nodes = extract_entities(event)
    edges = []
    # Example: link IP to domain, domain to user, etc.
    if event.get('source_ip') and event.get('domain'):
        edges.append({'source': event['source_ip'], 'target': event['domain']})
    if event.get('domain') and event.get('user'):
        edges.append({'source': event['domain'], 'target': event['user']})
    if event.get('user') and event.get('device'):
        edges.append({'source': event['user'], 'target': event['device']})
    if event.get('device') and event.get('malware_hash'):
        edges.append({'source': event['device'], 'target': event['malware_hash']})
    return {'nodes': nodes, 'edges': edges}
