import uuid
import time

def evaluate_simulation(simulation_id, events, detected_techniques, missed_techniques, investigation_nodes, clustered, hunter_score):
    coverage = len(detected_techniques) / (len(detected_techniques) + len(missed_techniques)) if (detected_techniques + missed_techniques) else 0
    time_to_detect = min([e['detect_time'] for e in events if 'detect_time' in e], default=0)
    return {
        "simulation_id": simulation_id,
        "coverage": round(coverage, 2),
        "techniques_detected": detected_techniques,
        "techniques_missed": missed_techniques,
        "time_to_detect_seconds": time_to_detect,
        "investigation_nodes": investigation_nodes,
        "campaign_clustered": clustered,
        "hunter_score": hunter_score
    }

# Example usage:
if __name__ == '__main__':
    sim_id = str(uuid.uuid4())
    events = [
        {"technique": "T1110", "detect_time": 12},
        {"technique": "T1021", "detect_time": 14}
    ]
    detected = ["T1110", "T1021"]
    missed = ["T1041"]
    nodes = 14
    clustered = True
    score = 92
    result = evaluate_simulation(sim_id, events, detected, missed, nodes, clustered, score)
    print(result)
