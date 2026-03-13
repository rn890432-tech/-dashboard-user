from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import logging
import sqlite3
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Setup logging
logging.basicConfig(filename='response_api.log', level=logging.INFO)

# Database setup
DB_PATH = os.getenv('RESPONSE_DB_PATH', 'response_actions.db')
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detection_id TEXT,
        action TEXT,
        approved INTEGER,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()
init_db()

def log_action(detection_id, action, approved, status):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO actions (detection_id, action, approved, status) VALUES (?, ?, ?, ?)',
              (detection_id, action, int(approved), status))
    conn.commit()
    conn.close()
    logging.info(f"Action: {action}, Detection: {detection_id}, Approved: {approved}, Status: {status}")

# Dummy SOAR integration
SOAR_API_URL = os.getenv('SOAR_API_URL', 'https://soar.example.com/api/trigger')
def trigger_soar(detection_id, action):
    # Simulate SOAR call (replace with real requests.post)
    logging.info(f"SOAR triggered for {detection_id} with action {action}")
    return True

@app.route('/api/response-action', methods=['POST'])
def response_action():
    data = request.get_json()
    detection_id = data.get('detection_id')
    action = data.get('action')
    approved = data.get('approved', False)
    status = 'pending'
    # Approval logic
    if action in ['Escalate', 'SOAR Trigger'] and not approved:
        status = f'{action} denied'
        log_action(detection_id, action, approved, status)
        return jsonify({'status': status}), 403
    # Simulate action processing
    if action == 'Block IP':
        # TODO: Integrate with firewall API
        status = 'IP blocked'
    elif action == 'Isolate Device':
        # TODO: Integrate with device isolation API
        status = 'Device isolated'
    elif action == 'Escalate':
        status = 'Escalation completed'
    elif action == 'SOAR Trigger':
        trigger_soar(detection_id, action)
        status = 'SOAR triggered'
    else:
        status = f'{action} completed'
    log_action(detection_id, action, approved, status)
    # Emit WebSocket notification
    socketio.emit('response_update', {'detection_id': detection_id, 'action': action, 'status': status})
    return jsonify({'status': status})

@app.route('/api/orchestrate-action', methods=['POST'])
def orchestrate_action():
    data = request.get_json()
    detection_id = data.get('detection_id')
    action = data.get('action')
    node_ids = data.get('node_ids', [])
    status = f'{action} completed for nodes: {node_ids}'
    log_action(detection_id, action, True, status)
    socketio.emit('response_update', {'detection_id': detection_id, 'action': action, 'status': status, 'node_ids': node_ids})
    return jsonify({'status': status})

@app.route('/api/action-history', methods=['GET'])
def action_history():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT detection_id, action, approved, status, timestamp FROM actions ORDER BY timestamp DESC LIMIT 100')
    rows = c.fetchall()
    conn.close()
    history = [
        {'detection_id': r[0], 'action': r[1], 'approved': bool(r[2]), 'status': r[3], 'timestamp': r[4]}
        for r in rows
    ]
    return jsonify({'history': history})

# Simple API key authentication decorator
from functools import wraps
API_KEY = os.getenv('RESPONSE_API_KEY', 'changeme')
def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-API-Key')
        if key != API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# Example: protect action history endpoint
@app.route('/api/secure-action-history', methods=['GET'])
@require_api_key
def secure_action_history():
    return action_history()

if __name__ == '__main__':
    socketio.run(app, port=8765, debug=True)
