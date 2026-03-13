import time
import requests
import threading

API_BASE = "http://localhost:8000/redteam"

# Schedule simulation runs every N seconds
def schedule_simulation(scenario_id, interval=60):
    def run():
        while True:
            resp = requests.post(f"{API_BASE}/simulate", json={"scenario_id": scenario_id})
            sim_id = resp.json().get("simulation_id")
            print(f"Scheduled simulation: {sim_id} for scenario {scenario_id}")
            time.sleep(interval)
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread

if __name__ == "__main__":
    # Example: schedule all scenarios every 60 seconds
    scenario_ids = [1, 2, 3]  # Replace with actual scenario IDs
    threads = [schedule_simulation(sid, interval=60) for sid in scenario_ids]
    print("Simulation scheduling started.")
    while True:
        time.sleep(3600)
