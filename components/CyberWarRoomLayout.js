// CyberWarRoomLayout: Optimized layout for large displays
import React from 'react';

const CyberWarRoomLayout = ({ globe, investigationGraph, threatFeed, aiAnalyst, incidentTimeline, threatHeatmap }) => (
  <div className="cyber-war-room-layout" style={{display:'flex',flexDirection:'column',height:'100vh'}}>
    <div style={{display:'flex',flex:1}}>
      <div style={{flex:1}}>{globe}</div>
      <div style={{flex:2}}>{investigationGraph}</div>
      <div style={{flex:1}}>{threatFeed}</div>
    </div>
    <div style={{display:'flex',flexDirection:'row',height:'30vh'}}>
      <div style={{flex:1}}>{aiAnalyst}</div>
      <div style={{flex:1}}>{incidentTimeline}</div>
      <div style={{flex:1}}>{threatHeatmap}</div>
    </div>
  </div>
);

export default CyberWarRoomLayout;
