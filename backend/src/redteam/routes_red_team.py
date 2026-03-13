import sqlite3
from fastapi import APIRouter, Request, HTTPException, Depends
from .utils import get_db_connection
from .auth import AuthMiddleware, check_permission

auth = AuthMiddleware()

# --- User Endpoints ---
@router.get("/users")
def list_users():
    conn = get_db_connection()
    users = conn.execute("SELECT id, name, email, role, department FROM users").fetchall()
    return [dict(row) for row in users]

@router.patch("/users/{id}/role")
async def update_user_role(id: str, new_role: str, actor_id: str, request: Request, credentials=Depends(auth)):
    user_payload = request.state.user
    check_permission(user_payload["role"], "update_role")
    conn = get_db_connection()
    user = conn.execute("SELECT role FROM users WHERE id=?", (id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    previous_role = user["role"]
    conn.execute("UPDATE users SET role=? WHERE id=?", (new_role, id))
    conn.commit()
    # Audit log
    audit_entry = {
        "actor_id": actor_id,
        "action": "update_role",
        "target_user_id": id,
        "previous_role": previous_role,
        "new_role": new_role,
        "timestamp": request.headers.get("X-Timestamp") or request.scope.get("time") or "",
        "ip_address": request.client.host,
        "status": "success"
    }
    conn.execute("INSERT INTO audit (actor_id, action, target_user_id, previous_role, new_role, timestamp, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                 (audit_entry["actor_id"], audit_entry["action"], audit_entry["target_user_id"], audit_entry["previous_role"], audit_entry["new_role"], audit_entry["timestamp"], audit_entry["ip_address"], audit_entry["status"]))
    conn.commit()
    return {"id": id, "role": new_role, "status": "updated"}

# --- Audit Log Endpoint ---
@router.get("/audit")
async def get_audit_logs(request: Request, credentials=Depends(auth)):
    user_payload = request.state.user
    check_permission(user_payload["role"], "view_audit")
    conn = get_db_connection()
    logs = conn.execute("SELECT * FROM audit ORDER BY timestamp DESC").fetchall()
    return [dict(row) for row in logs]
