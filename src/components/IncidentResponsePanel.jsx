import React, { useState, useEffect } from "react";

export default function IncidentResponsePanel() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetch("/incidents")
      .then(res => res.ok ? res.json() : [])
      .then(data => setIncidents(data))
      .catch(() => setIncidents([]));
  }, []);

  return (
    <div className="incident-response-panel">
      <h2>Incident Response</h2>
      <table>
        <thead>
          <tr>
            <th>Alert</th><th>Severity</th><th>Status</th><th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident, idx) => (
            <tr key={idx}>
              <td>{incident.alert}</td>
              <td>{incident.severity}</td>
              <td>{incident.status}</td>
              <td>{incident.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
