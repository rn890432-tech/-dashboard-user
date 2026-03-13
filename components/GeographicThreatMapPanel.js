import React from 'react';

function GeographicThreatMapPanel({ alerts }) {
  // Example: render threat counts by region
  const regionCounts = alerts.reduce((acc, a) => {
    acc[a.target_region] = (acc[a.target_region] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="geo-threat-map-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Geographic Threat Map</h4>
      <ul>
        {Object.entries(regionCounts).map(([region, count]) => (
          <li key={region}><strong>{region}:</strong> <span style={{color:'#ff0033'}}>{count}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default GeographicThreatMapPanel;
