// CampaignMapOverlay: Zooms globe to campaign infrastructure
import React from 'react';

export default function CampaignMapOverlay({ campaign, globeRef }) {
  // TODO: Implement globe zoom/animation for campaign infrastructure
  return (
    <div className="campaign-map-overlay" style={{position:'absolute',top:0,right:0,padding:'8px',background:'#222',color:'#fff',borderRadius:'8px',zIndex:999}}>
      <span>Zooming to campaign: {campaign.cluster_id}</span>
    </div>
  );
}
