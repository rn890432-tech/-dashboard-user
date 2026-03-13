import React, { useEffect, useState } from 'react';

function AIPredictiveThreatPanel({ alerts }) {
  const [prediction, setPrediction] = useState('');

  useEffect(() => {
    // Example: simple predictive model
    const avgSeverity = alerts.reduce((acc,a)=>acc+a.severity,0)/(alerts.length||1);
    if (avgSeverity > 0.6) setPrediction('Elevated risk of major incident in next 24h.');
    else if (alerts.length > 30) setPrediction('High alert volume, monitor closely.');
    else setPrediction('Risk level stable.');
  }, [alerts]);

  return (
    <div className="ai-predictive-threat-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>AI Predictive Threat Modeling</h4>
      <div>{prediction}</div>
    </div>
  );
}

export default AIPredictiveThreatPanel;
