import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def setup_db():
    conn = sqlite3.connect('redteam.db')
    conn.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, role TEXT, department TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS audit (actor_id TEXT, action TEXT, target_user_id TEXT, previous_role TEXT, new_role TEXT, timestamp TEXT, ip_address TEXT, status TEXT)")
    conn.execute("DELETE FROM users")
    conn.execute("DELETE FROM audit")
    conn.execute("INSERT INTO users VALUES ('user_123', 'Test User', 'test@example.com', 'User', 'IT')")
    conn.execute("INSERT INTO users VALUES ('admin_001', 'Admin User', 'admin@example.com', 'Admin', 'SOC')")
    conn.commit()
    conn.close()

@pytest.fixture(autouse=True)
def run_setup():
    setup_db()

def test_admin_can_update_user_role_and_log_action():
    # Step 1: PATCH role
    response = client.patch("/users/user_123/role?new_role=Manager&actor_id=admin_001")
    assert response.status_code == 200
    # Step 2: Check user role
    users = client.get("/users").json()
    user = next(u for u in users if u["id"] == "user_123")
    assert user["role"] == "Manager"
    # Step 3: Check audit log
    logs = client.get("/audit").json()
    entry = next(l for l in logs if l["actor_id"] == "admin_001" and l["target_user_id"] == "user_123")
    assert entry["action"] == "update_role"
    assert entry["new_role"] == "Manager"
    assert entry["status"] == "success"

# Negative test: unauthorized user
# (Assume RBAC middleware blocks non-admin, not implemented in this demo)
