# IOC Extraction Engine
# Extracts indicators from alerts and stores them in the global intelligence database

def extract_iocs(alert):
    indicators = []
    if alert.get("source_ip"):
        indicators.append({
            "indicator_type": "ip",
            "value": alert["source_ip"]
        })
    if alert.get("domain"):
        indicators.append({
            "indicator_type": "domain",
            "value": alert["domain"]
        })
    if alert.get("malware_hash"):
        indicators.append({
            "indicator_type": "malware_hash",
            "value": alert["malware_hash"]
        })
    return indicators
