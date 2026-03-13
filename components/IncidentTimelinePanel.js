import React from 'react';

function IncidentTimelinePanel({ alerts }) {
  const sorted = [...alerts].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  return (
    <div className="incident-timeline-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Incident Timeline</h4>
      <ul style={{maxHeight:'180px',overflowY:'auto'}}>
        {sorted.map((a,i)=>(
          <li key={i} style={{marginBottom:'4px'}}>
            <span style={{color:'#888'}}>{new Date(a.timestamp).toLocaleString()}</span> - <span style={{color:'#ff0033'}}>{a.type}</span> ({a.severity}) <span style={{color:'#00bfff'}}>{a.target_region}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default IncidentTimelinePanel;
