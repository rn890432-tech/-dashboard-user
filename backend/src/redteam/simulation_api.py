from flask import Flask, request, jsonify
from simulation_evaluator import evaluate_simulation
import uuid

app = Flask(__name__)

@app.route('/api/run-simulation', methods=['POST'])
def run_simulation():
    data = request.get_json()
    pack = data.get('pack')
    noise = data.get('noise')
    # Generate events based on pack and noise (stub)
    events = []
    detected = []
    missed = []
    investigation_nodes = 0
    clustered = True
    hunter_score = 0
    # Example: fill with dummy data
    if pack == 'Full Kill Chain':
        events = [
            {"technique": "T1110", "detect_time": 12},
            {"technique": "T1021", "detect_time": 14}
        ]
        detected = ["T1110", "T1021"]
        missed = ["T1041"]
        investigation_nodes = 22
        hunter_score = 88
    else:
        events = [{"technique": "T1110", "detect_time": 10}]
        detected = ["T1110"]
        missed = []
        investigation_nodes = 10
        hunter_score = 70
    sim_id = str(uuid.uuid4())
    result = evaluate_simulation(sim_id, events, detected, missed, investigation_nodes, clustered, hunter_score)
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=8766, debug=True)
