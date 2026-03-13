import React, { useState } from 'react';

function AIAlertTriagePanel({ alerts }) {
    const [customScript, setCustomScript] = useState('');
    const [selfLearning, setSelfLearning] = useState(false);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [autoTriage, setAutoTriage] = useState(false);
  const [feedback, setFeedback] = useState([]);

  const handleTriage = () => {
    // Simple natural language filter
    setFiltered(alerts.filter(a => a.description && a.description.toLowerCase().includes(query.toLowerCase())));
    setFeedback([]);
  };

  return (
    <div className="ai-alert-triage-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Self-Learning & Custom Logic</h4>
      <label style={{marginRight:'16px'}}>
        <input type="checkbox" checked={selfLearning} onChange={e=>setSelfLearning(e.target.checked)} /> Self-Learning
      </label>
      <label>
        Custom Script:
        <textarea value={customScript} onChange={e=>setCustomScript(e.target.value)} style={{width:'100%',height:'40px',marginLeft:'8px'}} placeholder="// JS logic for custom triage" />
      </label>
      <h4>AI Alert Triage</h4>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Describe alert to triage..." style={{width:'60%',marginRight:'8px',padding:'6px'}} />
      <button onClick={handleTriage} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Triage</button>
      <label style={{marginLeft:'16px'}}>
        <input type="checkbox" checked={autoTriage} onChange={e=>setAutoTriage(e.target.checked)} /> Auto-Triage
      </label>
      <ul style={{marginTop:'8px'}}>
        {(autoTriage ? alerts : filtered).map((a,i)=>(
          <li key={i}>
            {a.description} <span style={{color:'#ff0033'}}>{a.severity}</span>
            <button style={{marginLeft:'8px',padding:'2px 8px'}} onClick={()=>setFeedback([...feedback, {id: a.id, value: 'good'}])}>👍</button>
            <button style={{marginLeft:'4px',padding:'2px 8px'}} onClick={()=>setFeedback([...feedback, {id: a.id, value: 'bad'}])}>👎</button>
          </li>
        ))}
      </ul>
      {feedback.length > 0 && <div style={{marginTop:'8px',color:'#ff9800'}}>Feedback: {feedback.map((f,i)=>(<span key={i}>{f.id} {f.value} </span>))}</div>}
    </div>
  );
}

export default AIAlertTriagePanel;
