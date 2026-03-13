import React from "react";
import InvestigationGraph from "./InvestigationGraph";

export default function SimulationResults({ simulationId }) {
  const [results, setResults] = React.useState(null);
  const [status, setStatus] = React.useState("Running");
  const [showGraph, setShowGraph] = React.useState(false);
  const [showSyntheticOnly, setShowSyntheticOnly] = React.useState(true);
  const [role, setRole] = React.useState("admin"); // For demo, default to admin

  const cancelSimulation = async () => {
    await fetch(`/redteam/simulation/${simulationId}/cancel`, { method: "POST" });
    setStatus("Cancelled");
    // Add audit log entry
    await fetch("/redteam/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        user: "admin", // Replace with real user
        action: "cancel",
        simulationId,
        scenarioName: results?.scenarioName || "",
        status: "cancelled"
      })
    });
  };

  React.useEffect(() => {
    if (!simulationId) return;

    setStatus("Running");
    const interval = setInterval(() => {
      fetch(`/redteam/simulation/${simulationId}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setStatus("Completed");
        })
        .catch(() => setResults(null));
    }, 2000);

    return () => clearInterval(interval);
  }, [simulationId]);

  if (!results) {
    return (
      <div className="simulation-results">
        <h2>Simulation Results</h2>
        <p>No results yet.</p>
        <p>Status: {status}</p>
      </div>
    );
  }

  return (
    <div className="simulation-results">
      <h2>Simulation Results</h2>

      <div style={{ marginBottom: "8px" }}>
        <label>Role:&nbsp;</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      <p>Status: {status}</p>
      <p>Coverage: {results.coverage * 100}%</p>
      <p>Hunter Score: {results.hunter_score}</p>

      <h3>Detected Techniques</h3>
      <ul>{results.techniques_detected.map((t) => <li key={t}>{t}</li>)}</ul>

      <h3>Missed Techniques</h3>
      <ul>{results.techniques_missed.map((t) => <li key={t}>{t}</li>)}</ul>

      {role === "admin" && status === "Running" && (
        <button
          style={{ marginTop: "12px", background: "red", color: "#fff" }}
          onClick={cancelSimulation}
        >
          Cancel Simulation
        </button>
      )}

      <button style={{ marginTop: "12px" }} onClick={() => setShowGraph(!showGraph)}>
        {showGraph ? "Hide Graph Overlay" : "View in Graph"}
      </button>

      {showGraph && (
        <InvestigationGraph
          simulationId={simulationId}
          events={results.event_log}
          showSyntheticOnly={showSyntheticOnly}
        />
      )}

      {showGraph && (
        <div style={{ marginTop: "8px" }}>
          <label>
            <input
              type="checkbox"
              checked={showSyntheticOnly}
              onChange={(e) => setShowSyntheticOnly(e.target.checked)}
            />{" "}
            Show Synthetic Only
          </label>
        </div>
      )}
    </div>
  );
}
