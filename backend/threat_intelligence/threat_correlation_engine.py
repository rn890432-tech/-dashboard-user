# Global Threat Correlation Engine
# Correlates indicators across tenants and scores reputation

def correlate_indicator(indicator, db):
    matches = db.query(
        "SELECT * FROM alerts WHERE source_ip = %s",
        indicator["value"]
    )
    if len(matches) > 3:
        return "Global Threat Detected"
    return None

def score_reputation(indicator, tenants_affected, severity):
    return tenants_affected * severity
