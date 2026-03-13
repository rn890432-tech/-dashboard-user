class Scenario:
    def __init__(self, id, name, description, stages, users, devices, ips, tags):
        self.id = id
        self.name = name
        self.description = description
        self.stages = stages
        self.users = users
        self.devices = devices
        self.ips = ips
        self.tags = tags

class SimulationResult:
    def __init__(self, simulation_id, coverage, hunter_score, techniques_detected, techniques_missed):
        self.simulation_id = simulation_id
        self.coverage = coverage
        self.hunter_score = hunter_score
        self.techniques_detected = techniques_detected
        self.techniques_missed = techniques_missed
