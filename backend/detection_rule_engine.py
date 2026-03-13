# detection_rule_engine.py
# Maps behaviors to attack techniques and generates detection objects

def map_detection(evt):
    detection = {
        'detection_id': evt.get('detection_id'),
        'technique_type': evt.get('technique_type'),
        'severity': evt.get('severity'),
        'indicators': evt.get('indicators', []),
        'confidence': evt.get('confidence', 0.5)
    }
    return detection
