import React from "react";

export default function SimulationHistory() {
  // ...existing code...
  return (
    <div className="simulation-history">
      <h2>Simulation History</h2>
      {/* List past runs */}
    </div>
  );
  const [history, setHistory] = React.useState([]);
  React.useEffect(() => {
    fetch("/redteam/history")
      .then(res => res.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);
  return (
    <div className="simulation-history">
      <h2>Simulation History</h2>
      {history.map(run => (
        <div key={run.id} style={{cursor:'pointer',marginBottom:'6px'}} onClick={() => onSelectSimulation && onSelectSimulation(run.id)}>
          <strong>{run.name}</strong> — Score: {run.score}
        </div>
      ))}
    </div>
  );
}