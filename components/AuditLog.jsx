import React, { useState, useEffect } from "react";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch("/audit")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch audit logs");
        return res.json();
      })
      .then(data => setLogs(data))
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className="audit-log">
      <h2>Audit Log</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th><th>Action</th><th>User</th><th>Actor</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx}>
              <td>{log.timestamp}</td>
              <td>{log.action}</td>
              <td>{log.user_id}</td>
              <td>{log.actor_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
