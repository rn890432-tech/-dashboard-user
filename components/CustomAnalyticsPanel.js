import React, { useEffect, useState } from 'react';

function CustomAnalyticsPanel({ alerts }) {
  const [trendData, setTrendData] = useState([]);
  const [anomaly, setAnomaly] = useState(null);

  useEffect(() => {
    // Example: calculate alert trend
    const hourly = Array(24).fill(0);
    alerts.forEach(a => {
      const hour = new Date(a.timestamp).getHours();
      hourly[hour]++;
    });
    setTrendData(hourly);
    // Example: simple anomaly detection
    const max = Math.max(...hourly);
    if (max > 2 * (hourly.reduce((a,b)=>a+b,0)/24)) setAnomaly('Spike detected in alert volume!');
  }, [alerts]);

  return (
    <div className="custom-analytics-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Custom Analytics</h4>
      <div>Hourly Alert Trend:</div>
      <div style={{display:'flex',gap:'4px',margin:'8px 0'}}>
        {trendData.map((v,i)=>(<div key={i} style={{height:v*6,width:'12px',background:'#00bfff',borderRadius:'4px'}} title={`Hour ${i}: ${v}`}></div>))}
      </div>
      {anomaly && <div style={{color:'#ff0033',fontWeight:'bold'}}>{anomaly}</div>}
    </div>
  );
}

export default CustomAnalyticsPanel;
