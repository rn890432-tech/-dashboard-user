import React from "react";

export default function AttackSimulator() {
  const [scenarioList, setScenarioList] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
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
        body: JSON.stringify({ scenario_id: selectedId })
      });
      const data = await res.json();
      onSimulationComplete && onSimulationComplete(data.simulation_id);
    } catch (e) {
      alert("Simulation launch failed");
    }
  };
  return (
    <div className="attack-simulator">
      <h2>Attack Simulator</h2>
      <label>Scenario</label>
      <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
        <option value="">Select scenario</option>
        {scenarioList.map(s => (
          <option key={s.id} value={s.id}>{s.name || s.id}</option>
        ))}
      </select>
      <button onClick={launch} disabled={!selectedId} style={{marginLeft:'8px'}}>Launch Simulation</button>
    </div>
  );
}