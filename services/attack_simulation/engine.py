import asyncio
import json
import random
import sqlite3
import time
import uuid
from typing import Any, Callable, Optional

BroadcastFn = Callable[[str, object], None]

COUNTRY_POINTS: dict[str, tuple[float, float]] = {
    "United States": (38.0, -97.0),
    "Russia": (61.0, 105.0),
    "China": (35.0, 103.0),
    "Germany": (51.0, 10.0),
    "Brazil": (-14.0, -51.0),
    "United Kingdom": (55.0, -3.0),
    "India": (21.0, 78.0),
    "Japan": (36.0, 138.0),
    "France": (46.0, 2.0),
    "Canada": (56.0, -106.0),
    "Australia": (-25.0, 133.0),
}

SUPPORTED_SIMULATION_RESPONSE_ACTIONS: list[str] = [
    "block_ip",
    "isolate_device",
    "disable_user_account",
    "segment_network",
    "block_domain",
    "reset_credentials",
]

ATTACK_SIMULATION_SCENARIOS: dict[str, dict[str, object]] = {
    "phishing_campaign": {
        "label": "Phishing Campaign",
        "default_attack_type": "phishing_campaign",
        "events": [
            {"event_type": "phishing_email_sent", "phase": "Initial access", "title": "Phishing email sent", "severity": "MEDIUM", "map_attack": True, "delay_ms": 800},
            {"event_type": "user_clicked_link", "phase": "Initial access", "title": "User clicked malicious link", "severity": "HIGH", "map_attack": True, "delay_ms": 1000},
            {"event_type": "malware_executed", "phase": "Execution", "title": "Payload executed", "severity": "HIGH", "map_attack": True, "delay_ms": 900},
            {"event_type": "credential_theft", "phase": "Credential access", "title": "Credential theft observed", "severity": "CRITICAL", "map_attack": True, "delay_ms": 900},
            {"event_type": "lateral_movement", "phase": "Lateral movement", "title": "Lateral movement started", "severity": "CRITICAL", "map_attack": True, "delay_ms": 1100},
            {"event_type": "incident_alert", "phase": "Detection", "title": "SOC incident alert generated", "severity": "HIGH", "incident_alert": True, "delay_ms": 500},
        ],
    },
    "credential_brute_force": {
        "label": "Credential Brute Force",
        "default_attack_type": "brute_force",
        "events": [
            {"event_type": "botnet_traffic", "phase": "Reconnaissance", "title": "Distributed login traffic spike", "severity": "MEDIUM", "map_attack": True, "delay_ms": 700},
            {"event_type": "credential_brute_force", "phase": "Credential access", "title": "Password spray underway", "severity": "HIGH", "map_attack": True, "delay_ms": 900},
            {"event_type": "credential_theft", "phase": "Credential access", "title": "Valid account guessed", "severity": "CRITICAL", "map_attack": True, "delay_ms": 900},
            {"event_type": "incident_alert", "phase": "Detection", "title": "Identity alert triggered", "severity": "HIGH", "incident_alert": True, "delay_ms": 500},
        ],
    },
    "ransomware_attack": {
        "label": "Ransomware Attack",
        "default_attack_type": "ransomware_delivery",
        "events": [
            {"event_type": "phishing_email_sent", "phase": "Initial access", "title": "Weaponized attachment delivered", "severity": "MEDIUM", "map_attack": True, "delay_ms": 700},
            {"event_type": "malware_executed", "phase": "Execution", "title": "Ransomware loader executed", "severity": "HIGH", "map_attack": True, "delay_ms": 900},
            {"event_type": "lateral_movement", "phase": "Lateral movement", "title": "SMB lateral movement", "severity": "CRITICAL", "map_attack": True, "delay_ms": 1000},
            {"event_type": "impact", "phase": "Impact", "title": "Encryption activity detected", "severity": "CRITICAL", "map_attack": True, "delay_ms": 1100},
            {"event_type": "incident_alert", "phase": "Detection", "title": "Ransomware incident declared", "severity": "CRITICAL", "incident_alert": True, "delay_ms": 500},
        ],
    },
    "data_exfiltration": {
        "label": "Data Exfiltration",
        "default_attack_type": "data_exfiltration",
        "events": [
            {"event_type": "credential_theft", "phase": "Credential access", "title": "Session token stolen", "severity": "HIGH", "map_attack": True, "delay_ms": 800},
            {"event_type": "collection", "phase": "Collection", "title": "Sensitive records staged", "severity": "HIGH", "map_attack": True, "delay_ms": 900},
            {"event_type": "data_exfiltration", "phase": "Data exfiltration", "title": "Outbound exfiltration channel active", "severity": "CRITICAL", "map_attack": True, "delay_ms": 1000},
            {"event_type": "incident_alert", "phase": "Detection", "title": "DLP alert raised", "severity": "HIGH", "incident_alert": True, "delay_ms": 500},
        ],
    },
    "botnet_traffic": {
        "label": "Botnet Traffic",
        "default_attack_type": "botnet_traffic",
        "events": [
            {"event_type": "botnet_traffic", "phase": "Reconnaissance", "title": "Botnet nodes beaconing", "severity": "MEDIUM", "map_attack": True, "delay_ms": 700},
            {"event_type": "botnet_traffic", "phase": "Command and control", "title": "Command bursts observed", "severity": "HIGH", "map_attack": True, "delay_ms": 800},
            {"event_type": "credential_brute_force", "phase": "Credential access", "title": "Botnet pivots into auth spray", "severity": "HIGH", "map_attack": True, "delay_ms": 900},
            {"event_type": "incident_alert", "phase": "Detection", "title": "Traffic anomaly incident", "severity": "HIGH", "incident_alert": True, "delay_ms": 500},
        ],
    },
}


def _normalize_ts(ts: Optional[str] = None) -> str:
    if ts:
        text = ts.strip()
        if "T" in text:
            return text
        return text.replace(" ", "T") + "Z"
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _country_point(country: str) -> tuple[float, float]:
    return COUNTRY_POINTS.get(country, (0.0, 0.0))


def _with_jitter(lat: float, lon: float) -> tuple[float, float]:
    return round(lat + (random.random() - 0.5) * 3.2, 4), round(lon + (random.random() - 0.5) * 3.2, 4)


def ensure_attack_simulation_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS customer_organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            status TEXT DEFAULT 'active',
            plan_code TEXT DEFAULT 'pro',
            created_at TEXT DEFAULT (datetime('now'))
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS organization_memberships (
            id TEXT PRIMARY KEY,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            email TEXT,
            display_name TEXT,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(organization_id, user_id)
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS billing_subscriptions (
            id TEXT PRIMARY KEY,
            organization_id TEXT NOT NULL,
            plan_code TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            seats INTEGER DEFAULT 5,
            price_monthly REAL DEFAULT 499.0,
            currency TEXT DEFAULT 'USD',
            current_period_start TEXT DEFAULT (datetime('now')),
            current_period_end TEXT,
            trial_ends_at TEXT,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(organization_id)
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS billing_invoices (
            id TEXT PRIMARY KEY,
            organization_id TEXT NOT NULL,
            subscription_id TEXT,
            amount_due REAL DEFAULT 0,
            amount_paid REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            status TEXT DEFAULT 'open',
            description TEXT,
            invoice_date TEXT DEFAULT (datetime('now')),
            due_date TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS simulation_runs (
            id TEXT PRIMARY KEY,
            organization_id TEXT,
            created_by TEXT,
            scenario_key TEXT NOT NULL,
            origin_country TEXT,
            target_country TEXT,
            target_sector TEXT,
            status TEXT DEFAULT 'queued',
            detected_at TEXT,
            started_at TEXT DEFAULT (datetime('now')),
            paused_at TEXT,
            completed_at TEXT,
            metadata_json TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS simulation_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            organization_id TEXT,
            sequence_no INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            phase TEXT,
            title TEXT,
            description TEXT,
            severity TEXT,
            attack_type TEXT,
            src_country TEXT,
            dst_country TEXT,
            src_lat REAL,
            src_lon REAL,
            dst_lat REAL,
            dst_lon REAL,
            target_sector TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            payload_json TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS simulation_response_actions (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            organization_id TEXT,
            action TEXT NOT NULL,
            target TEXT,
            actor_user_id TEXT,
            effectiveness_score REAL DEFAULT 0.0,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )"""
    )

    org_count = conn.execute("SELECT COUNT(*) FROM customer_organizations").fetchone()[0]
    if int(org_count or 0) == 0:
        org_id = "org_default"
        conn.execute(
            "INSERT INTO customer_organizations (id, name, slug, status, plan_code) VALUES (?, ?, ?, 'active', 'enterprise')",
            (org_id, "Default SOC Org", "default-soc"),
        )
        conn.execute(
            """INSERT INTO billing_subscriptions (
                id, organization_id, plan_code, status, seats, price_monthly, currency,
                current_period_start, current_period_end
            ) VALUES (?, ?, 'enterprise', 'active', 25, 1999.0, 'USD', datetime('now'), datetime('now', '+30 day'))""",
            ("sub_default", org_id),
        )
        conn.execute(
            """INSERT INTO billing_invoices (
                id, organization_id, subscription_id, amount_due, amount_paid, currency, status, description, due_date
            ) VALUES (?, ?, ?, 1999.0, 0, 'USD', 'open', 'Initial enterprise subscription', datetime('now', '+14 day'))""",
            ("inv_default", org_id, "sub_default"),
        )


def _event_attack_payload(run_id: str, event_id: int, sequence_no: int, scenario_key: str, event: dict[str, object], origin_country: str, target_country: str, target_sector: str) -> dict[str, object]:
    src_lat, src_lon = _with_jitter(*_country_point(origin_country))
    dst_lat, dst_lon = _with_jitter(*_country_point(target_country))
    attack_type = str(event.get("attack_type") or ATTACK_SIMULATION_SCENARIOS[scenario_key].get("default_attack_type") or event.get("event_type") or "suspicious_activity")
    severity = str(event.get("severity") or "MEDIUM")
    return {
        "id": f"sim_evt_{event_id}",
        "run_id": run_id,
        "src_country": origin_country,
        "dst_country": target_country,
        "attack_type": attack_type,
        "severity": severity,
        "timestamp": _normalize_ts(),
        "source": {"lat": src_lat, "lon": src_lon, "label": origin_country, "ip": ""},
        "target": {"lat": dst_lat, "lon": dst_lon, "label": target_country, "ip": ""},
        "target_sector": target_sector,
        "title": f"SIM · {str(event.get('title') or event.get('event_type') or 'simulation').strip()}",
        "kind": "simulation",
        "simulation": True,
        "phase": str(event.get("phase") or "Investigation"),
        "sequence_no": sequence_no,
        "scenario_key": scenario_key,
    }


def load_recent_simulation_attacks(
    conn: sqlite3.Connection,
    *,
    limit: int = 80,
    window_minutes: int = 15,
    organization_id: Optional[str] = None,
) -> list[dict[str, object]]:
    query = """SELECT * FROM simulation_events
               WHERE datetime(created_at) >= datetime('now', ?)
               ORDER BY created_at DESC LIMIT ?"""
    params: list[object] = [f"-{max(1, window_minutes)} minutes", min(max(limit, 1), 200)]
    if organization_id:
        query = """SELECT * FROM simulation_events
                   WHERE datetime(created_at) >= datetime('now', ?) AND organization_id=?
                   ORDER BY created_at DESC LIMIT ?"""
        params = [f"-{max(1, window_minutes)} minutes", organization_id, min(max(limit, 1), 200)]
    rows = conn.execute(query, params).fetchall()
    attacks: list[dict[str, object]] = []
    for row in rows:
        try:
            payload = json.loads(str(row["payload_json"] or "{}"))
        except Exception:
            payload = {}
        if isinstance(payload, dict) and payload.get("id"):
            attacks.append(payload)
    return attacks


def build_simulation_attack_details(conn: sqlite3.Connection, attack_id: str) -> dict[str, object]:
    if not attack_id.startswith("sim_evt_"):
        raise ValueError("attack_id must start with sim_evt_")
    event_id = int(attack_id.replace("sim_evt_", "", 1))
    row = conn.execute("SELECT * FROM simulation_events WHERE id=?", (event_id,)).fetchone()
    if not row:
        raise ValueError("Simulation event not found")
    run = conn.execute("SELECT * FROM simulation_runs WHERE id=?", (str(row["run_id"]),)).fetchone()
    actions = conn.execute(
        "SELECT * FROM simulation_response_actions WHERE run_id=? ORDER BY created_at ASC",
        (str(row["run_id"]),),
    ).fetchall()
    try:
        payload = json.loads(str(row["payload_json"] or "{}"))
    except Exception:
        payload = {}
    return {
        "attack_id": attack_id,
        "simulation_run": dict(run) if run else None,
        "incident_details": [
            {
                "id": str(run["id"]) if run else "",
                "title": str(run["scenario_key"] if run else "simulation"),
                "severity": str(row["severity"] or "MEDIUM"),
                "status": str(run["status"] if run else "completed"),
                "created_at": str(row["created_at"] or ""),
            }
        ],
        "related_alerts": [
            {
                "id": f"sim-alert-{event_id}",
                "type": str(row["event_type"] or "simulation_event"),
                "severity": str(row["severity"] or "MEDIUM"),
                "classification": str(row["attack_type"] or "simulation"),
                "matched_indicator": f"simulation:{row['event_type']}",
                "timestamp": str(row["created_at"] or ""),
            }
        ],
        "mitre_mapping": {
            "technique": "SIM-TRAINING",
            "label": str(row["phase"] or "Training simulation"),
            "playbook_steps": [
                "Validate telemetry for the simulated event.",
                "Practice containment according to tenant runbook.",
                "Measure detection and response lag for the drill.",
            ],
        },
        "response_actions": [dict(a) for a in actions],
        "payload": payload,
        "attribution": None,
    }


class AttackSimulationEngine:
    def __init__(self, db_path: str, broadcaster: BroadcastFn) -> None:
        self.db_path = db_path
        self.broadcaster = broadcaster
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._resume_events: dict[str, asyncio.Event] = {}

    async def start_simulation(
        self,
        *,
        scenario_key: str,
        organization_id: str,
        actor_user_id: str,
        origin_country: str,
        target_country: str,
        target_sector: str,
    ) -> dict[str, object]:
        if scenario_key not in ATTACK_SIMULATION_SCENARIOS:
            raise ValueError(f"Unsupported simulation scenario: {scenario_key}")
        run_id = str(uuid.uuid4())
        metadata = {
            "scenario_label": ATTACK_SIMULATION_SCENARIOS[scenario_key].get("label", scenario_key),
            "origin_country": origin_country,
            "target_country": target_country,
            "target_sector": target_sector,
        }
        with _get_conn(self.db_path) as conn:
            ensure_attack_simulation_tables(conn)
            conn.execute(
                """INSERT INTO simulation_runs (
                    id, organization_id, created_by, scenario_key, origin_country, target_country, target_sector, status, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)""",
                (run_id, organization_id, actor_user_id, scenario_key, origin_country, target_country, target_sector, json.dumps(metadata)),
            )
            conn.commit()

        resume_event = asyncio.Event()
        resume_event.set()
        self._resume_events[run_id] = resume_event
        self._tasks[run_id] = asyncio.create_task(self._run_simulation(run_id))
        return {
            "run_id": run_id,
            "status": "running",
            "scenario": scenario_key,
            "organization_id": organization_id,
            **metadata,
        }

    async def _run_simulation(self, run_id: str) -> None:
        try:
            with _get_conn(self.db_path) as conn:
                run = conn.execute("SELECT * FROM simulation_runs WHERE id=?", (run_id,)).fetchone()
                if not run:
                    return
                scenario_key = str(run["scenario_key"])
                events = list(ATTACK_SIMULATION_SCENARIOS[scenario_key].get("events") or [])
                origin_country = str(run["origin_country"] or "Unknown")
                target_country = str(run["target_country"] or "Unknown")
                target_sector = str(run["target_sector"] or "Enterprise")
                organization_id = str(run["organization_id"] or "")
                for idx, raw_event in enumerate(events, start=1):
                    if not isinstance(raw_event, dict):
                        continue
                    await self._resume_events[run_id].wait()
                    latest = conn.execute("SELECT status FROM simulation_runs WHERE id=?", (run_id,)).fetchone()
                    if not latest or str(latest["status"] or "") == "stopped":
                        return
                    await asyncio.sleep(max(0.25, float(raw_event.get("delay_ms") or 800) / 1000.0))
                    conn2 = _get_conn(self.db_path)
                    try:
                        payload = {
                            "event_type": str(raw_event.get("event_type") or "simulation_event"),
                            "phase": str(raw_event.get("phase") or "Investigation"),
                            "title": str(raw_event.get("title") or "Simulation Event"),
                            "severity": str(raw_event.get("severity") or "MEDIUM"),
                            "scenario": scenario_key,
                            "sequence_no": idx,
                        }
                        result = conn2.execute(
                            """INSERT INTO simulation_events (
                                run_id, organization_id, sequence_no, event_type, phase, title, description,
                                severity, attack_type, src_country, dst_country, src_lat, src_lon, dst_lat, dst_lon,
                                target_sector, payload_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                            (
                                run_id,
                                organization_id,
                                idx,
                                str(raw_event.get("event_type") or "simulation_event"),
                                str(raw_event.get("phase") or "Investigation"),
                                str(raw_event.get("title") or "Simulation Event"),
                                str(raw_event.get("title") or "Simulation Event"),
                                str(raw_event.get("severity") or "MEDIUM"),
                                str(raw_event.get("attack_type") or ATTACK_SIMULATION_SCENARIOS[scenario_key].get("default_attack_type") or raw_event.get("event_type") or "simulation"),
                                origin_country,
                                target_country,
                                0,
                                0,
                                0,
                                0,
                                target_sector,
                                "{}",
                            ),
                        )
                        event_id = int(result.lastrowid or 0)
                        attack_payload = _event_attack_payload(run_id, event_id, idx, scenario_key, raw_event, origin_country, target_country, target_sector)
                        conn2.execute(
                            "UPDATE simulation_events SET src_lat=?, src_lon=?, dst_lat=?, dst_lon=?, payload_json=? WHERE id=?",
                            (
                                float(attack_payload["source"]["lat"]),
                                float(attack_payload["source"]["lon"]),
                                float(attack_payload["target"]["lat"]),
                                float(attack_payload["target"]["lon"]),
                                json.dumps(attack_payload),
                                event_id,
                            ),
                        )
                        if str(raw_event.get("event_type") or "").endswith("alert"):
                            conn2.execute(
                                "UPDATE simulation_runs SET detected_at=COALESCE(detected_at, datetime('now')) WHERE id=?",
                                (run_id,),
                            )
                        conn2.commit()
                    finally:
                        conn2.close()

                    self.broadcaster("simulation_event", {
                        "run_id": run_id,
                        "organization_id": organization_id,
                        "sequence_no": idx,
                        "event_type": str(raw_event.get("event_type") or "simulation_event"),
                        "phase": str(raw_event.get("phase") or "Investigation"),
                        "title": str(raw_event.get("title") or "Simulation Event"),
                        "severity": str(raw_event.get("severity") or "MEDIUM"),
                    })
                    if bool(raw_event.get("map_attack", False)):
                        self.broadcaster("new_attack", attack_payload)
                    if bool(raw_event.get("incident_alert", False)):
                        self.broadcaster("incident_detected", {
                            "id": run_id,
                            "title": str(raw_event.get("title") or "Simulation Incident"),
                            "severity": str(raw_event.get("severity") or "HIGH"),
                            "status": "investigating",
                            "simulation": True,
                            "organization_id": organization_id,
                        })
                with _get_conn(self.db_path) as done_conn:
                    done_conn.execute(
                        "UPDATE simulation_runs SET status='completed', completed_at=datetime('now') WHERE id=?",
                        (run_id,),
                    )
                    done_conn.commit()
            self.broadcaster("simulation_status", {"run_id": run_id, "status": "completed"})
        finally:
            self._tasks.pop(run_id, None)
            self._resume_events.pop(run_id, None)

    def pause_simulation(self, run_id: str) -> dict[str, object]:
        event = self._resume_events.get(run_id)
        if not event:
            raise ValueError("Simulation run is not active")
        event.clear()
        with _get_conn(self.db_path) as conn:
            conn.execute("UPDATE simulation_runs SET status='paused', paused_at=datetime('now') WHERE id=?", (run_id,))
            conn.commit()
        self.broadcaster("simulation_status", {"run_id": run_id, "status": "paused"})
        return {"run_id": run_id, "status": "paused"}

    def resume_simulation(self, run_id: str) -> dict[str, object]:
        event = self._resume_events.get(run_id)
        if not event:
            raise ValueError("Simulation run is not active")
        event.set()
        with _get_conn(self.db_path) as conn:
            conn.execute("UPDATE simulation_runs SET status='running', paused_at=NULL WHERE id=?", (run_id,))
            conn.commit()
        self.broadcaster("simulation_status", {"run_id": run_id, "status": "running"})
        return {"run_id": run_id, "status": "running"}

    def stop_simulation(self, run_id: str) -> dict[str, object]:
        task = self._tasks.get(run_id)
        if task:
            task.cancel()
        with _get_conn(self.db_path) as conn:
            conn.execute("UPDATE simulation_runs SET status='stopped', completed_at=datetime('now') WHERE id=?", (run_id,))
            conn.commit()
        self._tasks.pop(run_id, None)
        self._resume_events.pop(run_id, None)
        self.broadcaster("simulation_status", {"run_id": run_id, "status": "stopped"})
        return {"run_id": run_id, "status": "stopped"}

    async def replay_simulation(self, run_id: str, speed_multiplier: float = 1.0) -> dict[str, object]:
        with _get_conn(self.db_path) as conn:
            rows = conn.execute(
                "SELECT * FROM simulation_events WHERE run_id=? ORDER BY sequence_no ASC, created_at ASC",
                (run_id,),
            ).fetchall()
        safe_speed = max(0.25, min(speed_multiplier, 8.0))
        async def _replay() -> None:
            for row in rows:
                try:
                    payload = json.loads(str(row["payload_json"] or "{}"))
                except Exception:
                    payload = {}
                if isinstance(payload, dict) and payload:
                    payload["replay"] = True
                    self.broadcaster("new_attack", payload)
                self.broadcaster("simulation_event", {
                    "run_id": run_id,
                    "event_type": str(row["event_type"] or "simulation_event"),
                    "title": str(row["title"] or "Replay Event"),
                    "phase": str(row["phase"] or "Investigation"),
                    "replay": True,
                })
                await asyncio.sleep(max(0.15, 0.8 / safe_speed))
            self.broadcaster("simulation_status", {"run_id": run_id, "status": "replayed"})
        asyncio.create_task(_replay())
        return {"run_id": run_id, "status": "replaying", "speed_multiplier": safe_speed}

    def record_response_action(
        self,
        *,
        run_id: str,
        organization_id: str,
        action: str,
        target: str,
        actor_user_id: str,
        notes: str = "",
    ) -> dict[str, object]:
        if action not in SUPPORTED_SIMULATION_RESPONSE_ACTIONS:
            raise ValueError(f"Unsupported response action: {action}")
        score = {
            "block_ip": 0.72,
            "isolate_device": 0.84,
            "disable_user_account": 0.91,
            "segment_network": 0.78,
            "block_domain": 0.69,
            "reset_credentials": 0.81,
        }.get(action, 0.65)
        response_id = str(uuid.uuid4())
        with _get_conn(self.db_path) as conn:
            conn.execute(
                """INSERT INTO simulation_response_actions (
                    id, run_id, organization_id, action, target, actor_user_id, effectiveness_score, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (response_id, run_id, organization_id, action, target, actor_user_id, score, notes[:400]),
            )
            conn.commit()
        payload = {
            "id": response_id,
            "run_id": run_id,
            "organization_id": organization_id,
            "action": action,
            "target": target,
            "actor_user_id": actor_user_id,
            "effectiveness_score": round(score, 2),
            "notes": notes[:400],
            "simulation": True,
        }
        self.broadcaster("defense_action", payload)
        return payload

    def get_run_stats(self, run_id: str) -> dict[str, object]:
        with _get_conn(self.db_path) as conn:
            run = conn.execute("SELECT * FROM simulation_runs WHERE id=?", (run_id,)).fetchone()
            if not run:
                raise ValueError("Simulation run not found")
            events = conn.execute(
                "SELECT * FROM simulation_events WHERE run_id=? ORDER BY sequence_no ASC",
                (run_id,),
            ).fetchall()
            actions = conn.execute(
                "SELECT * FROM simulation_response_actions WHERE run_id=? ORDER BY created_at ASC",
                (run_id,),
            ).fetchall()
        attack_progression = [
            {
                "sequence_no": int(r["sequence_no"] or 0),
                "event_type": str(r["event_type"] or ""),
                "phase": str(r["phase"] or ""),
                "severity": str(r["severity"] or "MEDIUM"),
            }
            for r in events
        ]
        time_to_detection = None
        if run["detected_at"]:
            try:
                started = time.mktime(time.strptime(str(run["started_at"]), "%Y-%m-%d %H:%M:%S"))
                detected = time.mktime(time.strptime(str(run["detected_at"]), "%Y-%m-%d %H:%M:%S"))
                time_to_detection = max(0, int(detected - started))
            except Exception:
                time_to_detection = None
        response_effectiveness = round(sum(float(a["effectiveness_score"] or 0.0) for a in actions) / max(1, len(actions)), 2)
        return {
            "run_id": run_id,
            "scenario": str(run["scenario_key"] or ""),
            "status": str(run["status"] or "unknown"),
            "attack_progression": attack_progression,
            "time_to_detection_seconds": time_to_detection,
            "response_effectiveness": response_effectiveness,
            "response_actions_taken": len(actions),
            "events_total": len(events),
        }
