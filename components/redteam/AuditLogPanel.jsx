import React from "react";

export default function AuditLogPanel({ logs }) {
  const [filter, setFilter] = React.useState("");
  const filteredLogs = logs && logs.length > 0 ? logs.filter(log =>
    Object.values(log).join(" ").toLowerCase().includes(filter.toLowerCase())
  ) : [];
  const exportLog = () => {
    const csv = [
      ["Timestamp","User","Action","Simulation ID","Scenario Name","Status"].join(",")
    ].concat(filteredLogs.map(log => [log.timestamp,log.user,log.action,log.simulationId,log.scenarioName,log.status].join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="audit-log-panel" style={{background:'#222',padding:'16px',borderRadius:'8px'}}>
      <h3>Audit Log</h3>
      <input
        style={{marginBottom:'8px',width:'100%'}}
        placeholder="Filter/search audit log"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <table style={{width:'100%',background:'#333',color:'#fff',borderRadius:'6px'}}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Simulation ID</th>
            <th>Scenario Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? filteredLogs.map((log, idx) => (
            <tr key={idx}>
              <td>{log.timestamp}</td>
              <td>{log.user}</td>
              <td>{log.action}</td>
              <td>{log.simulationId}</td>
              <td>{log.scenarioName}</td>
              <td>{log.status}</td>
            </tr>
          )) : (
            <tr><td colSpan={6} style={{textAlign:'center'}}>No audit log entries</td></tr>
          )}
        </tbody>
      </table>
      <button style={{marginTop:'12px'}} onClick={exportLog}>Export Log</button>
    </div>
  );
}