import React from "react";

export default function RedTeamConsolePanel() {
  const [activeTab, setActiveTab] = React.useState("builder");
  const [scenario, setScenario] = React.useState(null);
  const [simulationId, setSimulationId] = React.useState(null);
  const [auditLogs, setAuditLogs] = React.useState([]);

  React.useEffect(() => {
    if (activeTab === "audit") {
      fetch("/redteam/audit")
        .then(res => res.json())
        .then(setAuditLogs)
        .catch(() => setAuditLogs([]));
    }
  }, [activeTab]);

  return (
    <div className="redteam-console-panel">
      <h1>Red Team Console</h1>
      <div style={{marginBottom:'16px'}}>
        <button onClick={() => setActiveTab("builder")}>Scenario Builder</button>
        <button onClick={() => setActiveTab("simulator")}>Attack Simulator</button>
        <button onClick={() => setActiveTab("results")} disabled={!simulationId}>Simulation Results</button>
        <button onClick={() => setActiveTab("history")}>Simulation History</button>
        <button onClick={() => setActiveTab("audit")}>Audit Log</button>
      </div>
      {activeTab === "builder" && (
        <ScenarioBuilder onScenarioUpdate={setScenario} />
      )}
      {activeTab === "simulator" && (
        <AttackSimulator scenario={scenario} onSimulationComplete={setSimulationId} />
      )}
      {activeTab === "results" && simulationId && (
        <SimulationResults simulationId={simulationId} />
      )}
      {activeTab === "history" && (
        <SimulationHistory onSelectSimulation={setSimulationId} />
      )}
      {activeTab === "audit" && (
        <AuditLogPanel logs={auditLogs} />
      )}
    </div>
  );
}
import AuditLogPanel from "./AuditLogPanel";
}
// Import child components
import ScenarioBuilder from "./ScenarioBuilder";
import AttackSimulator from "./AttackSimulator";
import SimulationResults from "./SimulationResults";
import SimulationHistory from "./SimulationHistory";