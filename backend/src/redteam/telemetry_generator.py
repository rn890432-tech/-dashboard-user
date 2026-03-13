from uuid import UUID
from datetime import datetime
from typing import Dict, List

class TelemetryGenerator:
    """Generates synthetic telemetry events for simulation stages."""

    def generate(self, stage: Dict, simulation_id: UUID) -> List[Dict]:
        event_type = stage.get("type")
        if event_type == "failed_logins":
            return self._generate_failed_logins(stage, simulation_id)
        if event_type == "failed_logins_distributed":
            return self._generate_failed_logins_distributed(stage, simulation_id)
        if event_type == "successful_login":
            return self._generate_successful_login(stage, simulation_id)
        if event_type == "remote_service_access":
            return self._generate_remote_access(stage, simulation_id)
        if event_type == "beacon":
            return self._generate_beaconing(stage, simulation_id)
        if event_type == "data_exfiltration":
            return self._generate_exfiltration(stage, simulation_id)
        if event_type == "phishing_click":
            return self._generate_phishing_click(stage, simulation_id)
        if event_type == "malware_execution":
            return self._generate_malware_execution(stage, simulation_id)
        if event_type == "process_spawn":
            return self._generate_process_spawn(stage, simulation_id)
        if event_type == "network_scan":
            return self._generate_network_scan(stage, simulation_id)
        if event_type == "file_access":
            return self._generate_file_access(stage, simulation_id)
        if event_type == "data_staging":
            return self._generate_data_staging(stage, simulation_id)
        if event_type == "login":
            return self._generate_login(stage, simulation_id)
        return []

    def _base_event(self, simulation_id: UUID) -> Dict:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "simulation_id": str(simulation_id),
            "source": "simulation",
            "is_synthetic": True
        }

    def _generate_failed_logins(self, stage, simulation_id):
        events = []
        for _ in range(stage.get("count", 1)):
            event = self._base_event(simulation_id)
            event.update({
                "event_type": "auth",
                "status": "failure",
                "ip": stage.get("ip", "192.168.1.10"),
                "user": stage.get("user", "unknown")
            })
            events.append(event)
        return events

    def _generate_failed_logins_distributed(self, stage, simulation_id):
        events = []
        ips = stage.get("ips", 10)
        count = stage.get("count", 100)
        for i in range(count):
            event = self._base_event(simulation_id)
            event.update({
                "event_type": "auth",
                "status": "failure",
                "ip": f"192.168.1.{i % ips}",
                "user": stage.get("user", "unknown")
            })
            events.append(event)
        return events

    def _generate_successful_login(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "auth",
            "status": "success",
            "user": stage.get("user")
        })
        return [event]

    def _generate_remote_access(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "network",
            "dst_device": stage.get("device"),
            "protocol": "tcp"
        })
        return [event]

    def _generate_beaconing(self, stage, simulation_id):
        events = []
        interval = stage.get("interval_seconds", 60)
        count = stage.get("count", 10)
        domain = stage.get("domain")
        for i in range(count):
            event = self._base_event(simulation_id)
            event.update({
                "event_type": "dns",
                "domain": domain,
                "sequence": i
            })
            events.append(event)
        return events

    def _generate_exfiltration(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "network",
            "action": "exfiltration",
            "bytes": stage.get("bytes", 0)
        })
        return [event]

    def _generate_phishing_click(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "phishing",
            "user": stage.get("user", "unknown")
        })
        return [event]

    def _generate_malware_execution(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "malware",
            "process": stage.get("process", "unknown")
        })
        return [event]

    def _generate_process_spawn(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "process",
            "process": stage.get("process", "unknown")
        })
        return [event]

    def _generate_network_scan(self, stage, simulation_id):
        events = []
        ips = stage.get("ips", 1)
        ports = stage.get("ports", [80])
        for i in range(ips):
            for port in ports:
                event = self._base_event(simulation_id)
                event.update({
                    "event_type": "scan",
                    "ip": f"192.168.1.{i}",
                    "port": port
                })
                events.append(event)
        return events

    def _generate_file_access(self, stage, simulation_id):
        events = []
        files = stage.get("files", 1)
        for i in range(files):
            event = self._base_event(simulation_id)
            event.update({
                "event_type": "file",
                "file_id": f"file-{i}"
            })
            events.append(event)
        return events

    def _generate_data_staging(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "staging",
            "bytes": stage.get("bytes", 0)
        })
        return [event]

    def _generate_login(self, stage, simulation_id):
        event = self._base_event(simulation_id)
        event.update({
            "event_type": "auth",
            "status": "success",
            "user": stage.get("user", "unknown"),
            "location": stage.get("location", "unknown")
        })
        return [event]
