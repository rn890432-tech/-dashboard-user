import React, { useState, useEffect } from "react";

export default function ComplianceMetricsPanel() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetch("/compliance-metrics")
      .then(res => res.ok ? res.json() : [])
      .then(data => setMetrics(data))
      .catch(() => setMetrics([]));
  }, []);

  return (
    <div className="compliance-metrics-panel">
      <h2>Compliance Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th><th>Value</th><th>Status</th><th>Last Audit</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, idx) => (
            <tr key={idx}>
              <td>{metric.name}</td>
              <td>{metric.value}</td>
              <td>{metric.status}</td>
              <td>{metric.lastAudit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
