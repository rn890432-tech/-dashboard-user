# User management endpoints
@router.get("/users")
def list_users():
    return [
        {"id": "u1", "name": "Alice Johnson", "role": "Admin", "department": "SOC"},
        {"id": "u2", "name": "Bob Smith", "role": "Analyst", "department": "Threat Hunting"},
        {"id": "u3", "name": "Carol Lee", "role": "Viewer", "department": "Compliance"}
    ]

@router.get("/users/{id}")
def get_user(id: str):
    # Demo: return static user
    if id == "u1":
        return {"id": "u1", "name": "Alice Johnson", "role": "Admin", "department": "SOC"}
    elif id == "u2":
        return {"id": "u2", "name": "Bob Smith", "role": "Analyst", "department": "Threat Hunting"}
    elif id == "u3":
        return {"id": "u3", "name": "Carol Lee", "role": "Viewer", "department": "Compliance"}
    else:
        return {"id": id, "name": "Unknown", "role": "Viewer", "department": "Unknown"}

@router.patch("/users/{id}/role")
async def update_user_role(id: str, request: Request):
    body = await request.json()
    new_role = body.get("new_role")
    # Demo: just return updated role
    return {"id": id, "role": new_role, "status": "updated"}
from fastapi import APIRouter
from uuid import UUID
from ..redteam.scenario_library import ScenarioLibrary
from ..redteam.simulation_runner import SimulationRunner
from ..redteam.simulation_evaluator import SimulationEvaluator
from ..redteam.simulation_engine import SimulationEngine
from ..redteam.services import IngestionService, DetectionService, InvestigationService
from fastapi import Request
import time

router = APIRouter(prefix="/redteam")

scenario_library = ScenarioLibrary()
ingestion_service = IngestionService()
detection_service = DetectionService()
investigation_service = InvestigationService()
engine = SimulationEngine(ingestion_service)
runner = SimulationRunner(engine)
evaluator = SimulationEvaluator(detection_service, investigation_service, ingestion_service)

@router.get("/scenario")
def list_scenarios():
    return scenario_library.list_scenarios()

# In-memory audit log for demo
audit_log = []

@router.get("/audit")
def get_audit_log():
    return audit_log

@router.post("/audit")
async def add_audit_entry(request: Request):
    entry = await request.json()
    audit_log.append(entry)
    return {"success": True}

@router.get("/simulation/{simulation_id}/graph")
def get_simulation_graph(simulation_id: str):
    # Return synthetic and real event nodes for graph overlay
    # Stub: return empty graph
    return {"nodes": [], "edges": []}

@router.post("/simulation/{simulation_id}/cancel")
async def cancel_simulation(simulation_id: str):
    # Orchestration templates (predefined workflows)
    orchestration_templates = [
        {"id": "containment", "name": "Containment Workflow", "actions": ["isolate_host", "block_ip", "notify_admin"]},
        {"id": "forensics", "name": "Forensics Workflow", "actions": ["collect_artifacts", "snapshot_vm", "export_logs"]},
        {"id": "notification", "name": "Notification Workflow", "actions": ["notify_user", "notify_admin", "notify_soc"]},
    ]
    # Stub: mark simulation as cancelled
    # In real implementation, update status and stop runner
    return {"status": "cancelled"}

# Advanced workflow actions
@router.get("/orchestration/templates")
def list_orchestration_templates():
    return orchestration_templates

@router.post("/workflow/remediation")
async def trigger_remediation(request: Request):
    payload = await request.json()
    audit_log.append({"timestamp": time.time(), "action": "remediation", "user": "admin", "details": payload})
    return {"status": "remediation triggered"}

@router.post("/workflow/escalation")
async def trigger_escalation(request: Request):
    payload = await request.json()
    audit_log.append({"timestamp": time.time(), "action": "escalation", "user": "admin", "details": payload})
    return {"status": "escalation triggered"}

@router.post("/workflow/export")
async def trigger_export(request: Request):
    payload = await request.json()
    audit_log.append({"timestamp": time.time(), "action": "export", "user": "admin", "details": payload})
    return {"status": "export triggered"}

@router.post("/workflow/orchestration")
async def trigger_custom_orchestration(request: Request):
    payload = await request.json()
    audit_log.append({"timestamp": time.time(), "action": "custom_orchestration", "user": "admin", "details": payload})
    return {"status": "custom orchestration triggered"}

@router.post("/scenario")
async def save_scenario(request: Request):
    body = await request.json()
    scenario_id = scenario_library.save_scenario(body)
    return {"id": scenario_id}

@router.delete("/scenario/{scenario_id}")
def delete_scenario(scenario_id: str):
    success = scenario_library.delete_scenario(scenario_id)
    return {"success": success}

from fastapi import Request
@router.post("/simulate")
async def launch_simulation(request: Request):
    body = await request.json()
    scenario_id = body.get("scenario_id")
    scenario = scenario_library.get_scenario(scenario_id)
    users = body.get("users")
    devices = body.get("devices")
    ips = body.get("ips")
    stages = body.get("stages")
    merged = scenario.dict() if hasattr(scenario, "dict") else dict(scenario)
    if users:
        merged["users"] = users
    if devices:
        merged["devices"] = devices
    if ips:
        merged["ips"] = ips
    if stages and len(stages) > 0:
        merged["stages"] = stages
    # Scenario validation
    errors = []
    if not merged.get("name"):
        errors.append("Missing scenario name")
    if not merged.get("stages") or not isinstance(merged["stages"], list):
        errors.append("Missing or invalid stages")
    for idx, stage in enumerate(merged.get("stages", [])):
        if not stage.get("type"):
            errors.append(f"Stage {idx+1} missing type")
    if errors:
        return {"errors": errors}, 400
    simulation_id = runner.launch(merged)
    return {"simulation_id": simulation_id}

@router.get("/simulation/{simulation_id}")
def get_simulation_results(simulation_id: UUID):
    result = evaluator.evaluate(simulation_id)
    # Enhanced reporting
    events = ingestion_service.get_events(str(simulation_id))
    detections = detection_service.detections.get(str(simulation_id), [])
    investigation = investigation_service.investigations.get(str(simulation_id), {})
    synthetic_events = [e for e in events if e.get("is_synthetic")]
    return {
        "result": result,
        "event_log": synthetic_events,
        "detections": detections,
        "investigation": investigation
    }

@router.get("/history")
def get_simulation_history():
    # Example: Return last 10 simulation IDs and scores
    history = []
    for sim_id, inv in investigation_service.investigations.items():
        score = inv.get('nodes', 0) + 10  # Example scoring
        history.append({"id": sim_id, "name": "Scenario", "score": score})
    return history[-10:]
