// CampaignCommandPanel: Active campaign details
import React from 'react';

export default function CampaignCommandPanel({ campaigns, onSelect }) {
  return (
    <div className="campaign-command-panel" style={{background:'#222',color:'#9c27b0',padding:'16px',borderRadius:'16px',boxShadow:'0 0 32px #9c27b0',height:'100%'}}>
      <h4 style={{color:'#9c27b0'}}>Active Campaigns</h4>
      <ul style={{maxHeight:'300px',overflowY:'auto'}}>
        {campaigns.map((c, idx) => (
          <li key={c.cluster_id} style={{marginBottom:'8px',cursor:'pointer'}} onClick={() => onSelect(c)}>
            <span style={{color:'#ff0033',fontWeight:'bold'}}>{c.campaign_name}</span> - {c.threat_type}<br/>
            Indicators: {c.num_indicators} | Risk: {c.risk_score}<br/>
            Timeline: {c.timeline_activity}
          </li>
        ))}
      </ul>
    </div>
  );
}
