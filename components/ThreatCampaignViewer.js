// Threat Campaign Viewer Component
// Shows detected threat campaigns and attribution
import React from 'react';

const ThreatCampaignViewer = ({ campaigns }) => (
  <div className="threat-campaign-viewer">
    <h2>Threat Campaigns</h2>
    <ul>
      {campaigns.map((campaign, idx) => (
        <li key={idx}>
          <strong>{campaign.campaign_name}</strong> - Confidence: {campaign.confidence}
          <br />Targets: {campaign.targets.join(', ')}
          <br />Indicators: {campaign.indicators.join(', ')}
        </li>
      ))}
    </ul>
  </div>
);

export default ThreatCampaignViewer;
