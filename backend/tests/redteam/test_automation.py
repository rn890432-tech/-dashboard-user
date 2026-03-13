import pytest
import os
from backend.src.redteam import automation

def test_load_and_validate_scenarios():
    scenarios = automation.load_and_validate_scenarios()
    assert len(scenarios) > 0
    for s in scenarios:
        assert 'name' in s
        assert 'description' in s
        assert 'techniques' in s
        assert 'stages' in s

def test_launch_all_simulations(monkeypatch):
    class DummyResp:
        def json(self):
            return {'id': 1, 'simulation_id': 1}
    monkeypatch.setattr(automation.requests, 'post', lambda *a, **kw: DummyResp())
    scenarios = [{'name': 'Test', 'description': 'Desc', 'techniques': [], 'stages': []}]
    sim_ids = automation.launch_all_simulations(scenarios)
    assert sim_ids == [1]

def test_export_audit_log(monkeypatch):
    monkeypatch.setattr(automation.requests, 'get', lambda *a, **kw: type('Dummy', (), {'json': lambda: [{'timestamp': 'now', 'action': 'test', 'user': 'admin', 'details': {}}]})())
    automation.export_audit_log()
    assert os.path.exists('audit_log_export.json')
