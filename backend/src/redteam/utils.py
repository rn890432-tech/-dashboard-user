import datetime

import datetime
import sqlite3

def get_db_connection():
    conn = sqlite3.connect('redteam.db')
    conn.row_factory = sqlite3.Row
    return conn

def log_audit(action, user_id, actor_id):
    # In production, write to secure audit DB or SIEM
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "action": action,
        "user_id": user_id,
        "actor_id": actor_id
    }
    print(f"[AUDIT] {entry}")  # Placeholder
    return entry
