// GlobalThreatHeatmapPanel: Aggregates attack sources by country
import React from 'react';

const GlobalThreatHeatmapPanel = ({ countryStats }) => (
  <div className="global-threat-heatmap-panel">
    <h4>Global Threat Heatmap</h4>
    {/* Render heatmap by country */}
    <pre>{JSON.stringify(countryStats, null, 2)}</pre>
  </div>
);

export default GlobalThreatHeatmapPanel;
