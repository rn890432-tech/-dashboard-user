import React, { useEffect, useState } from "react";

export default function SimulationResults({ simulationId }) {
  const [results, setResults] = useState(null);
  const [filterSynthetic, setFilterSynthetic] = useState(true);
  const [eventType, setEventType] = useState("");
  const [user, setUser] = useState("");
  const [device, setDevice] = useState("");
  const [ip, setIp] = useState("");
  const [role, setRole] = useState("analyst"); // default role for testing
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!simulationId) return;
    const interval = setInterval(() => {
      fetch(`/redteam/simulation/${simulationId}`)
        .then(res => res.json())
        .then(setResults)
        .catch(() => setResults(null));
    }, 2000); // poll every 2s for real-time feedback
    return () => clearInterval(interval);
  }, [simulationId]);

  if (!results) return null;

  const { result, event_log, detections, investigation } = results;

  let filteredEvents = event_log;
  if (filterSynthetic) filteredEvents = filteredEvents.filter(ev => ev.is_synthetic);
  if (eventType) filteredEvents = filteredEvents.filter(ev => ev.event_type === eventType);
  if (user) filteredEvents = filteredEvents.filter(ev => ev.user === user);
  if (device) filteredEvents = filteredEvents.filter(ev => ev.dst_device === device);
  if (ip) filteredEvents = filteredEvents.filter(ev => ev.ip === ip);

  return (
    <div className="simulation-results">
      <h2>Simulation Results</h2>
      <div style={{marginBottom:'8px'}}>
        <label>Role:&nbsp;</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <p>Coverage: {result.coverage * 100}%</p>
      <p>Hunter Score: {result.hunter_score}</p>
      <h3>Detected Techniques</h3>
      <ul>
        {result.techniques_detected.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>Missed Techniques</h3>
      <ul>
        {result.techniques_missed.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>Event Log</h3>
      <div style={{marginBottom:'8px'}}>
        <label>
          <input type="checkbox" checked={filterSynthetic} onChange={e => setFilterSynthetic(e.target.checked)} />
          Show only synthetic events
        </label>
        <input placeholder="Event Type" value={eventType} onChange={e => setEventType(e.target.value)} style={{marginLeft:'8px'}} />
        <input placeholder="User" value={user} onChange={e => setUser(e.target.value)} style={{marginLeft:'8px'}} />
        <input placeholder="Device" value={device} onChange={e => setDevice(e.target.value)} style={{marginLeft:'8px'}} />
        <input placeholder="IP" value={ip} onChange={e => setIp(e.target.value)} style={{marginLeft:'8px'}} />
      </div>
      <ul style={{maxHeight:'200px',overflowY:'auto',background:'#222',color:'#fff',padding:'8px',borderRadius:'6px'}}>
        {filteredEvents.map((ev, idx) => (
          <li key={idx}><pre>{JSON.stringify(ev, null, 2)}</pre></li>
        ))}
      </ul>
      <h3>Detections</h3>
      <pre style={{background:'#111',color:'#fff',padding:'8px',borderRadius:'6px'}}>{JSON.stringify(detections, null, 2)}</pre>
      <h3>Investigation</h3>
      <pre style={{background:'#111',color:'#fff',padding:'8px',borderRadius:'6px'}}>{JSON.stringify(investigation, null, 2)}</pre>
      {(role === "analyst" || role === "viewer") && (
        <button style={{marginTop:'12px'}} onClick={() => setShowOverlay(!showOverlay)}>
          {showOverlay ? "Hide Graph Overlay" : "View in Graph"}
        </button>
      )}
      {showOverlay && (
        <div style={{marginTop:'12px',background:'#2a2a4a',padding:'12px',borderRadius:'8px'}}>
          <b>Investigation Graph Overlay</b>
          <p>Synthetic nodes highlighted (purple halo). Toggle real/synthetic.</p>
          {/* Placeholder for actual graph overlay component */}
          <div style={{height:'120px',background:'#444',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'6px'}}>
            [Graph overlay for simulation_id: {simulationId}]
          </div>
        </div>
      )}
    </div>
  );
}
