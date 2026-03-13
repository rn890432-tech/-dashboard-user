import React, { useState } from "react";

export default function AutomationControlPanel() {
  const [status, setStatus] = useState("Idle");

  const handleRunScript = () => {
    setStatus("Running...");
    fetch("/automation/run", { method: "POST" })
      .then(res => res.ok ? res.json() : { result: "Failed" })
      .then(data => setStatus(data.result || "Completed"))
      .catch(() => setStatus("Error"));
  };

  return (
    <div className="automation-control-panel">
      <h2>Automation Control</h2>
      <button onClick={handleRunScript}>Run Automation Script</button>
      <div>Status: {status}</div>
    </div>
  );
}
