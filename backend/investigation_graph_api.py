# investigation_graph_api.py
# Exposes /api/investigation-graph endpoint
from flask import Flask, jsonify
import neo4j

app = Flask(__name__)

# Placeholder: Replace with Neo4j query logic
@app.route('/api/investigation-graph')
def get_graph():
    # Example static graph
    graph = {
        'nodes': [
            {'id': 'ip1', 'type': 'ip', 'label': '185.220.101.5'},
            {'id': 'domain1', 'type': 'domain', 'label': 'evil-domain.com'},
            {'id': 'user1', 'type': 'user', 'label': 'employee@company.com'}
        ],
        'edges': [
            {'source': 'ip1', 'target': 'domain1'},
            {'source': 'domain1', 'target': 'user1'}
        ]
    }
    return jsonify(graph)

if __name__ == '__main__':
    app.run(port=5000)
