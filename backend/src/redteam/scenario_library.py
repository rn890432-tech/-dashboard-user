import uuid
from typing import List, Dict, Any

class ScenarioLibrary:
    def __init__(self):
        self.scenarios: Dict[str, Dict[str, Any]] = {}

    def list_scenarios(self) -> List[Dict[str, Any]]:
        return [dict(id=k, **v) for k, v in self.scenarios.items()]

    def get_scenario(self, scenario_id: str) -> Dict[str, Any]:
        return self.scenarios.get(scenario_id, {})

    def save_scenario(self, scenario: Dict[str, Any]) -> str:
        scenario_id = scenario.get("id") or str(uuid.uuid4())
        scenario["id"] = scenario_id
        self.scenarios[scenario_id] = scenario
        return scenario_id

    def delete_scenario(self, scenario_id: str) -> bool:
        if scenario_id in self.scenarios:
            del self.scenarios[scenario_id]
            return True
        return False
