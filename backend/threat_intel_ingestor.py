# threat_intel_ingestor.py
# Pulls indicators from external feeds and normalizes them

def normalize_indicator(raw):
    indicator = {}
    if 'ip' in raw:
        indicator['type'] = 'ip'
        indicator['value'] = raw['ip']
    elif 'domain' in raw:
        indicator['type'] = 'domain'
        indicator['value'] = raw['domain']
    elif 'url' in raw:
        indicator['type'] = 'url'
        indicator['value'] = raw['url']
    elif 'file_hash' in raw:
        indicator['type'] = 'file_hash'
        indicator['value'] = raw['file_hash']
    return indicator

def ingest_feed(feed):
    return [normalize_indicator(item) for item in feed]
