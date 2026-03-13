import os
import json
import time
import requests

SCENARIO_DIR = "backend/src/redteam/scenarios"
API_BASE = "http://localhost:8000/redteam"

# 1. Auto-load and validate scenarios

def load_and_validate_scenarios():
    scenarios = []
    for fname in os.listdir(SCENARIO_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(SCENARIO_DIR, fname), "r") as f:
                scenario = json.load(f)
                # Basic validation
                assert "name" in scenario
                assert "description" in scenario
                assert "techniques" in scenario
                assert "stages" in scenario
                scenarios.append(scenario)
    print(f"Loaded {len(scenarios)} scenarios.")
    return scenarios

# 2. Launch all scenarios as simulations

def launch_all_simulations(scenarios):
    sim_ids = []
    for scenario in scenarios:
        resp = requests.post(f"{API_BASE}/scenario", json=scenario)
        scenario_id = resp.json().get("id")
        sim_resp = requests.post(f"{API_BASE}/simulate", json={"scenario_id": scenario_id})
        sim_id = sim_resp.json().get("simulation_id")
        sim_ids.append(sim_id)
        print(f"Launched simulation: {sim_id} for scenario: {scenario['name']}")
    return sim_ids

# 3. Poll results and graph overlays

def poll_results(sim_ids):
    for sim_id in sim_ids:
        result = requests.get(f"{API_BASE}/simulation/{sim_id}").json()
        graph = requests.get(f"{API_BASE}/simulation/{sim_id}/graph").json()
        print(f"Simulation {sim_id} results: {result}")
        print(f"Simulation {sim_id} graph: {graph}")

# 4. Export audit log

def export_audit_log():
    logs = requests.get(f"{API_BASE}/audit").json()
    with open("audit_log_export.json", "w") as f:
        json.dump(logs, f, indent=2)
    print(f"Exported {len(logs)} audit log entries.")

# 5. Run integration tests (pytest)

def run_tests():
    os.system("pytest backend/tests/redteam/")

if __name__ == "__main__":
    scenarios = load_and_validate_scenarios()
    sim_ids = launch_all_simulations(scenarios)
    time.sleep(5)  # Wait for simulations to run
    poll_results(sim_ids)
    export_audit_log()
    run_tests()
