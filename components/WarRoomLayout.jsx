// WarRoomLayout: Cyber Command Center grid layout
import React from 'react';

export default function WarRoomLayout({
  globe,
  telemetry,
  investigationGraph,
  campaignPanel,
  aiAnalyst,
  threatFeed,
  incidentTimeline
}) {
  return (
    <div className="war-room-layout" style={{background:'#181a1b',color:'#fff',minHeight:'100vh',display:'grid',gridTemplateRows:'1fr 1.2fr 0.8fr',gridTemplateColumns:'1fr 1fr',gap:'24px',padding:'24px'}}>
      {/* Top Row */}
      <div style={{gridRow:'1',gridColumn:'1',borderRadius:'16px',boxShadow:'0 0 32px #00fff7',background:'#222'}}>{globe}</div>
      <div style={{gridRow:'1',gridColumn:'2',borderRadius:'16px',boxShadow:'0 0 32px #ff0033',background:'#222'}}>{telemetry}</div>
      {/* Middle Row */}
      <div style={{gridRow:'2',gridColumn:'1',borderRadius:'16px',boxShadow:'0 0 32px #9c27b0',background:'#222'}}>{investigationGraph}</div>
      <div style={{gridRow:'2',gridColumn:'2',borderRadius:'16px',boxShadow:'0 0 32px #00fff7',background:'#222'}}>{campaignPanel}</div>
      {/* Bottom Row */}
      <div style={{gridRow:'3',gridColumn:'1',borderRadius:'16px',boxShadow:'0 0 32px #ff0033',background:'#222',display:'flex',gap:'16px'}}>
        <div style={{flex:1}}>{aiAnalyst}</div>
        <div style={{flex:1}}>{threatFeed}</div>
        <div style={{flex:1}}>{incidentTimeline}</div>
      </div>
    </div>
  );
}
