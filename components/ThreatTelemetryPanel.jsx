// ThreatTelemetryPanel: Real-time threat metrics
import React from 'react';

export default function ThreatTelemetryPanel({ stats }) {
  return (
    <div className="threat-telemetry-panel" style={{background:'#222',color:'#00fff7',padding:'16px',borderRadius:'16px',boxShadow:'0 0 32px #00fff7',height:'100%'}}>
      <h4 style={{color:'#00fff7'}}>Live Threat Telemetry</h4>
      <div>Attacks per minute: <span style={{color:'#ff0033'}}>{stats.attacksPerMinute}</span></div>
      <div>Top attacking countries: <span style={{color:'#9c27b0'}}>{stats.topCountries.join(', ')}</span></div>
      <div>Most targeted assets: <span style={{color:'#00fff7'}}>{stats.targetedAssets.join(', ')}</span></div>
      <div>Active campaigns: <span style={{color:'#ff0033'}}>{stats.activeCampaigns}</span></div>
      <div>Detection pipeline health: <span style={{color:'#00fff7'}}>{stats.pipelineHealth}</span></div>
    </div>
  );
}
