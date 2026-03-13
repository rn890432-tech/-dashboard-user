// IncidentReplayTimeline: Scrub through attack sequences
import React from 'react';

export default function IncidentReplayTimeline({ events, onScrub }) {
  return (
    <div className="incident-replay-timeline" style={{background:'#222',color:'#ff0033',padding:'16px',borderRadius:'16px',boxShadow:'0 0 32px #ff0033',height:'100%'}}>
      <h4 style={{color:'#ff0033'}}>Incident Replay Timeline</h4>
      <input type="range" min="0" max={events.length-1} onChange={e => onScrub(Number(e.target.value))} style={{width:'100%'}} />
      <ul style={{maxHeight:'120px',overflowY:'auto'}}>
        {events.map((evt, idx) => (
          <li key={idx} style={{marginBottom:'8px'}}>
            <span style={{color:'#00fff7',fontWeight:'bold'}}>{evt.timestamp}</span> - {evt.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
