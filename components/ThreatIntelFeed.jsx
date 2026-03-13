// ThreatIntelFeed: Displays normalized threat indicators
import React from 'react';

export default function ThreatIntelFeed({ indicators }) {
  return (
    <div className="threat-intel-feed" style={{background:'#181a1b',color:'#fff',padding:'12px',borderRadius:'8px',height:'100%'}}>
      <h4>Threat Intelligence Feed</h4>
      <ul style={{maxHeight:'300px',overflowY:'auto'}}>
        {indicators.map((ind, idx) => (
          <li key={idx} style={{marginBottom:'8px'}}>
            <span style={{color:'#ff0033',fontWeight:'bold'}}>{ind.type}</span>: {ind.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
