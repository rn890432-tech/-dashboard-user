import React, { useMemo } from 'react';

function AIThreatClusteringPanel({ alerts }) {
    const [customScript, setCustomScript] = React.useState('');
    const [adaptiveClustering, setAdaptiveClustering] = React.useState(false);
  // Simple clustering by type
  const clusters = useMemo(() => {
    const map = {};
    alerts.forEach(a => {
      const key = a.type || 'Unknown';
      map[key] = map[key] || [];
      map[key].push(a);
    });
    return map;
  }, [alerts]);
  const [autoCluster, setAutoCluster] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState([]);
  React.useEffect(() => {
    if (autoCluster) {
      // Demo: recommend action for each cluster
      setRecommendations(Object.keys(clusters).map(type => ({ type, action: clusters[type].length > 5 ? 'Escalate' : 'Monitor' })));
    } else {
      setRecommendations([]);
    }
  }, [autoCluster, clusters]);

  return (
    <div className="ai-threat-clustering-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Adaptive Clustering & Custom Logic</h4>
      <label style={{marginRight:'16px'}}>
        <input type="checkbox" checked={adaptiveClustering} onChange={e=>setAdaptiveClustering(e.target.checked)} /> Adaptive Clustering
      </label>
      <label>
        Custom Script:
        <textarea value={customScript} onChange={e=>setCustomScript(e.target.value)} style={{width:'100%',height:'40px',marginLeft:'8px'}} placeholder="// JS logic for custom clustering" />
      </label>
      <h4>AI Threat Clustering</h4>
      <label style={{marginBottom:'8px',display:'block'}}>
        <input type="checkbox" checked={autoCluster} onChange={e=>setAutoCluster(e.target.checked)} /> Auto-Cluster & Recommend
      </label>
      {Object.keys(clusters).map(type => (
        <div key={type} style={{marginBottom:'8px'}}>
          <strong>{type}</strong> <span style={{color:'#ff9800'}}>({clusters[type].length})</span>
          <ul>
            {clusters[type].map((a,i)=>(<li key={i}>{a.description} <span style={{color:'#ff0033'}}>{a.severity}</span></li>))}
          </ul>
        </div>
      ))}
      {recommendations.length > 0 && <div style={{marginTop:'8px',color:'#00bfff'}}>
        <strong>Recommendations:</strong>
        <ul>
          {recommendations.map((r,i)=>(<li key={i}>{r.type}: {r.action}</li>))}
        </ul>
      </div>}
    </div>
  );
}

export default AIThreatClusteringPanel;
