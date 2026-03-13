import React, { useState, useEffect } from "react";

export default function SimulationHistory({ onSelectSimulation }) {
  const [history, setHistory] = useState([]);
  const [role, setRole] = useState("viewer"); // default role for testing
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    fetch("/redteam/history")
      .then(res => res.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  return (
    <div className="simulation-history">
      <h2>Simulation History</h2>
      <div style={{marginBottom:'8px'}}>
        <label>Role:&nbsp;</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      {history.map((sim) => (
        <div
          key={sim.id}
          className="history-item"
          style={{cursor:'pointer',marginBottom:'6px',background:selectedRun===sim.id?'#333':'',color:selectedRun===sim.id?'#fff':'',padding:'6px',borderRadius:'4px'}}
          onClick={() => setSelectedRun(sim.id)}
        >
          <strong>{sim.name}</strong>  Score: {sim.score}
        </div>
      ))}
      {selectedRun && (
        <div style={{marginTop:'16px',background:'#222',color:'#fff',padding:'12px',borderRadius:'8px'}}>
          <b>Run Details</b>
          <p>Simulation ID: {selectedRun}</p>
          {/* Placeholder for more run details, can fetch results if needed */}
        </div>
      )}
    </div>
  );
}
