# infrastructure_clusterer.py
# Groups indicators by shared infrastructure (ASN, domain, malware family)

def group_by_infrastructure(indicators):
    infra_groups = {}
    for ind in indicators:
        key = ind.get('asn') or ind.get('domain') or ind.get('malware_family') or 'other'
        if key not in infra_groups:
            infra_groups[key] = []
        infra_groups[key].append(ind)
    return infra_groups
