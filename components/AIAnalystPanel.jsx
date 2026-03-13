// AIAnalystPanel: AI SOC analyst insights
import React from 'react';

export default function AIAnalystPanel({ insights }) {
  return (
    <div className="ai-analyst-panel" style={{background:'#222',color:'#00fff7',padding:'16px',borderRadius:'16px',boxShadow:'0 0 32px #00fff7',height:'100%'}}>
      <h4 style={{color:'#00fff7'}}>AI SOC Analyst</h4>
      <ul style={{maxHeight:'120px',overflowY:'auto'}}>
        {insights.map((ins, idx) => (
          <li key={idx} style={{marginBottom:'8px'}}>
            <span style={{color:'#ff0033',fontWeight:'bold'}}>{ins.title}</span>: {ins.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
