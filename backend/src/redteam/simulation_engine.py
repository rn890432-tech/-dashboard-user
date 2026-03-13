from uuid import uuid4
from .telemetry_generator import TelemetryGenerator

class SimulationEngine:
    """Executes a scenario by generating and injecting synthetic events."""
    def __init__(self, ingestion_service):
        self.ingestion = ingestion_service
        self.generator = TelemetryGenerator()

    def run(self, scenario):
        simulation_id = uuid4()
        for stage in scenario.stages:
            events = self.generator.generate(stage, simulation_id)
            for event in events:
                self.ingestion.ingest(event)
        return simulation_id
