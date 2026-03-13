// CampaignClusterPanel: Lists active attack campaigns
import React from 'react';

export default function CampaignClusterPanel({ campaigns, onSelect }) {
  return (
    <div className="campaign-cluster-panel" style={{background:'#222',color:'#fff',padding:'12px',borderRadius:'8px',height:'100%'}}>
      <h4>Active Attack Campaigns</h4>
      <ul style={{maxHeight:'300px',overflowY:'auto'}}>
        {campaigns.map((c, idx) => (
          <li key={c.cluster_id} style={{marginBottom:'8px',cursor:'pointer'}} onClick={() => onSelect(c)}>
            <span style={{color:'#ff9800',fontWeight:'bold'}}>Cluster {c.cluster_id}</span> - {c.attack_type}<br/>
            Indicators: {c.num_indicators} | Assets: {c.targeted_assets.join(', ')} | Risk: {c.risk_score}
          </li>
        ))}
      </ul>
    </div>
  );
}
