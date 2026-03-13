import React, { useEffect, useState } from 'react';

function ThreatIntelFeedPanel() {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    fetch('/api/threat-intel').then(res=>res.json()).then(setFeed);
  }, []);
  return (
    <div className="threat-intel-feed-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Threat Intelligence Feed</h4>
      <ul style={{maxHeight:'180px',overflowY:'auto'}}>
        {feed.map((item,i)=>(<li key={i}><span style={{color:'#ff9800'}}>{item.title}</span> - <span style={{color:'#888'}}>{item.date}</span></li>))}
      </ul>
    </div>
  );
}

export default ThreatIntelFeedPanel;
