// Auto-preview script for scenario, results, graph, and audit log

import axios from 'axios';

const API_BASE = 'http://localhost:8000/redteam';

async function previewScenarios() {
  const resp = await axios.get(`${API_BASE}/scenarios`);
  const scenarios = resp.data;
  scenarios.forEach(s => {
    console.log(`Scenario: ${s.name} - ${s.description}`);
    // Preview stages, techniques, tags
    console.log(`Stages: ${s.stages.length}, Techniques: ${s.techniques.join(', ')}, Tags: ${s.tags}`);
  });
}

async function previewSimulations() {
  const resp = await axios.get(`${API_BASE}/simulations`);
  const sims = resp.data;
  sims.forEach(sim => {
    console.log(`Simulation: ${sim.simulation_id} - Status: ${sim.status}`);
    // Preview results
    axios.get(`${API_BASE}/simulation/${sim.simulation_id}`).then(r => {
      console.log(`Results:`, r.data);
    });
    // Preview graph overlay
    axios.get(`${API_BASE}/simulation/${sim.simulation_id}/graph`).then(r => {
      console.log(`Graph:`, r.data);
    });
  });
}

async function previewAuditLog() {
  const resp = await axios.get(`${API_BASE}/audit`);
  const logs = resp.data;
  logs.forEach(log => {
    console.log(`Audit: ${log.timestamp} - ${log.action} - ${log.user}`);
  });
}

async function runAutoPreview() {
  await previewScenarios();
  await previewSimulations();
  await previewAuditLog();
}

runAutoPreview();
