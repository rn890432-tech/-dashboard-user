import React, { useState } from 'react';

function CustomQueryPanel({ alerts }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleQuery = () => {
    // Simple filter: search by type or region
    const q = query.toLowerCase();
    setResults(alerts.filter(a => a.type.toLowerCase().includes(q) || a.target_region.toLowerCase().includes(q)));
  };

  return (
    <div className="custom-query-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Custom Query</h4>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search type or region..." style={{padding:'6px',borderRadius:'4px',marginRight:'8px'}} />
      <button onClick={handleQuery} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Run</button>
      <ul style={{marginTop:'12px',maxHeight:'120px',overflowY:'auto'}}>
        {results.map((a,i)=>(<li key={i}><span style={{color:'#ff0033'}}>{a.type}</span> - <span style={{color:'#00bfff'}}>{a.target_region}</span> ({a.severity})</li>))}
      </ul>
    </div>
  );
}

export default CustomQueryPanel;
