import React, { useEffect, useState } from 'react';

function AIRecommendationsPanel({ alerts }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // Example: generate recommendations
    const recs = [];
    if (alerts.some(a => a.severity >= 0.8)) recs.push('Increase monitoring for high-severity threats.');
    if (alerts.some(a => a.type === 'Agentic AI')) recs.push('Review AI Analyst terminal for agentic activity.');
    if (alerts.length > 20) recs.push('Consider scaling up automated response capacity.');
    setRecommendations(recs);
  }, [alerts]);

  return (
    <div className="ai-recommendations-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>AI Recommendations</h4>
      <ul>
        {recommendations.length === 0 ? <li>No urgent actions.</li> : recommendations.map((r,i)=>(<li key={i}>{r}</li>))}
      </ul>
    </div>
  );
}

export default AIRecommendationsPanel;
