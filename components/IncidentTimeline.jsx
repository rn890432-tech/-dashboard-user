// IncidentTimeline: Shows timeline for a selected entity
import React from 'react';

export default function IncidentTimeline({ events }) {
  return (
    <div className="incident-timeline" style={{background:'#222',color:'#fff',padding:'12px',borderRadius:'8px',height:'100%'}}>
      <h4>Incident Timeline</h4>
      <ul style={{maxHeight:'300px',overflowY:'auto'}}>
        {events.map((evt, idx) => (
          <li key={idx} style={{marginBottom:'8px'}}>
            <span style={{color:'#ff9800',fontWeight:'bold'}}>{evt.timestamp}</span> - {evt.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
