from typing import Dict, Any

class IngestionService:
    """Handles ingestion of synthetic and real telemetry events."""
    def __init__(self):
        self.events = []

    def ingest(self, event: Dict[str, Any]):
        self.events.append(event)

    def get_events(self, simulation_id: str):
        return [e for e in self.events if e.get('simulation_id') == simulation_id]

class DetectionService:
    """Simulates detection logic for threat techniques."""
    def __init__(self):
        self.detections = {}

    def detect(self, events):
        detected = set()
        for e in events:
            if e.get('event_type') == 'auth' and e.get('status') == 'failure':
                detected.add('T1110')  # Brute Force
            if e.get('event_type') == 'network' and e.get('action') == 'exfiltration':
                detected.add('T1041')  # Data Exfiltration
            if e.get('event_type') == 'dns' and e.get('domain'):
                detected.add('T1021')  # Beaconing
        return list(detected)

    def get_detections(self, simulation_id: str, events):
        detected = self.detect(events)
        self.detections[simulation_id] = detected
        return detected

class InvestigationService:
    """Simulates investigation graph completeness and clustering."""
    def __init__(self):
        self.investigations = {}

    def investigate(self, events):
        nodes = len(events)
        clustered = any(e.get('event_type') == 'network' and e.get('action') == 'exfiltration' for e in events)
        return nodes, clustered

    def get_investigation(self, simulation_id: str, events):
        nodes, clustered = self.investigate(events)
        self.investigations[simulation_id] = {'nodes': nodes, 'clustered': clustered}
        return nodes, clustered
