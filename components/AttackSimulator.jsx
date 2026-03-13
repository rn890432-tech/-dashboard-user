import React, { useState } from "react";

export default function AttackSimulator({ onSimulationComplete }) {
  const [scenarioId, setScenarioId] = useState("");
  const [scenarioConfig, setScenarioConfig] = useState({});
  const [scenarioList, setScenarioList] = useState([]);
  const [role, setRole] = useState("analyst"); // default role for testing

  React.useEffect(() => {
    fetch("/redteam/scenario")
      .then(res => res.json())
      .then(setScenarioList)
      .catch(() => setScenarioList([]));
  }, []);

  const launch = async () => {
    try {
      const res = await fetch("/redteam/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenarioId, ...scenarioConfig })
      });
      const data = await res.json();
      onSimulationComplete(data.simulation_id);
    } catch (e) {
      alert("Simulation launch failed");
    }
  };

  return (
    <div className="attack-simulator">
      <h2>Launch Simulation</h2>
      <div style={{marginBottom:'8px'}}>
        <label>Role:&nbsp;</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <label>Scenario</label>
      <select value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
        <option value="">Select scenario</option>
        {scenarioList.map(s => (
          <option key={s.id} value={s.id}>{s.name || s.id}</option>
        ))}
      </select>
      {role === "admin" && <ScenarioBuilder onUpdate={setScenarioConfig} />}
      <button onClick={launch} disabled={role === "viewer" || !scenarioId} style={{marginTop:'12px'}}>Start Simulation</button>
      {role === "viewer" && <div style={{color:'gray',marginTop:'8px'}}>Viewers cannot launch simulations.</div>}
    </div>
  );
}
