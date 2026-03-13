import React from 'react';

const Dashboard = () => {
  return (
    <div className="soc-dashboard responsive-layout">
      <h1 style={{margin:'24px 0',color:'#00bfff',fontSize:'2rem',textAlign:'center'}}>Dashboard</h1>
      <div style={{margin:'16px 0',padding:'12px',background:'#222',color:'#fff',borderRadius:'8px',textAlign:'center'}}>
        <span data-cy="ThreatHeatMap-label">ThreatHeatMap Panel</span>
        <span data-cy="UserLabel-label" style={{marginLeft:'16px'}}>UserLabel Panel</span>
        <span data-cy="KillSwitch-label" style={{marginLeft:'16px'}}>KillSwitch Panel</span>
      </div>
      <div className="soc-footer">
        <span>OMNI-SOC VERSION 2026.3.11</span>
        <span className="live-pulse">● LIVE TELEMETRY ACTIVE</span>
      </div>
    </div>
  );
};

export default Dashboard;
