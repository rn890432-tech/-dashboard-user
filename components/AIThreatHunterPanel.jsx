// AIThreatHunterPanel: Displays automated investigations and detections
import React from 'react';

import { useState } from 'react';

export default function AIThreatHunterPanel({ detections, onSelect, onAction }) {
  const [actionStatus, setActionStatus] = useState({});
  const [pendingApproval, setPendingApproval] = useState(null);
  const handleAction = async (detection, action) => {
    // Approval flow for critical actions
    if (action === 'Escalate' || action === 'SOAR Trigger') {
      setPendingApproval({ detection, action });
      return;
    }
    setActionStatus(prev => ({ ...prev, [detection.detection_id]: action + ' in progress...' }));
    // Backend API call
    try {
      const res = await fetch(`/api/response-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection_id: detection.detection_id, action })
      });
      const result = await res.json();
      setActionStatus(prev => ({ ...prev, [detection.detection_id]: result.status || action + ' completed' }));
      if (onAction) onAction(detection, action);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, [detection.detection_id]: 'Error: ' + e.message }));
    }
  };
  const handleApproval = async (approved) => {
    if (!pendingApproval) return;
    const { detection, action } = pendingApproval;
    setPendingApproval(null);
    if (!approved) {
      setActionStatus(prev => ({ ...prev, [detection.detection_id]: action + ' denied' }));
      return;
    }
    setActionStatus(prev => ({ ...prev, [detection.detection_id]: action + ' in progress...' }));
    try {
      const res = await fetch(`/api/response-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection_id: detection.detection_id, action, approved: true })
      });
      const result = await res.json();
      setActionStatus(prev => ({ ...prev, [detection.detection_id]: result.status || action + ' completed' }));
      if (onAction) onAction(detection, action);
    } catch (e) {
      setActionStatus(prev => ({ ...prev, [detection.detection_id]: 'Error: ' + e.message }));
    }
  };
  return (
    <div className="ai-threat-hunter-panel" style={{background:'#222',color:'#00fff7',padding:'16px',borderRadius:'16px',boxShadow:'0 0 32px #00fff7',height:'100%'}}>
      <h4 style={{color:'#00fff7'}}>Autonomous AI Threat Hunter</h4>
      <ul style={{maxHeight:'300px',overflowY:'auto'}}>
        {detections.map((d, idx) => (
          <li key={d.detection_id} style={{marginBottom:'8px',cursor:'pointer',position:'relative'}} onClick={() => onSelect(d)}>
            <span style={{color:'#ff0033',fontWeight:'bold'}}>{d.technique_type}</span> - {d.severity}<br/>
            Indicators: {d.indicators.join(', ')} | Confidence: {d.confidence}<br/>
            <span style={{color:'#9c27b0'}}>Recommended Action: Investigate</span><br/>
            <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
              <button style={{background:'#00fff7',color:'#222',border:'none',borderRadius:'6px',padding:'4px 10px',boxShadow:'0 0 8px #00fff7'}} onClick={e => {e.stopPropagation();handleAction(d,'Block IP')}}>Block IP</button>
              <button style={{background:'#9c27b0',color:'#fff',border:'none',borderRadius:'6px',padding:'4px 10px',boxShadow:'0 0 8px #9c27b0'}} onClick={e => {e.stopPropagation();handleAction(d,'Isolate Device')}}>Isolate Device</button>
              <button style={{background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px',padding:'4px 10px',boxShadow:'0 0 8px #ff0033'}} onClick={e => {e.stopPropagation();handleAction(d,'Escalate')}}>Escalate</button>
              <button style={{background:'#00fff7',color:'#222',border:'none',borderRadius:'6px',padding:'4px 10px',boxShadow:'0 0 8px #00fff7'}} onClick={e => {e.stopPropagation();handleAction(d,'SOAR Trigger')}}>SOAR Trigger</button>
            </div>
            {actionStatus[d.detection_id] && <div style={{marginTop:'6px',color:'#00fff7',fontWeight:'bold',animation:'glow 1s infinite alternate'}}>{actionStatus[d.detection_id]}</div>}
          </li>
        ))}
      </ul>
      {pendingApproval && (
        <div style={{position:'fixed',top:'40%',left:'50%',transform:'translate(-50%,-50%)',background:'#222',color:'#fff',padding:'24px',borderRadius:'16px',boxShadow:'0 0 32px #ff0033',zIndex:999}}>
          <h4>Approval Required</h4>
          <div>Action: <span style={{color:'#ff0033'}}>{pendingApproval.action}</span></div>
          <div>Detection: <span style={{color:'#00fff7'}}>{pendingApproval.detection.detection_id}</span></div>
          <button style={{margin:'12px',padding:'8px 24px',background:'#00fff7',color:'#222',border:'none',borderRadius:'8px'}} onClick={()=>handleApproval(true)}>Approve</button>
          <button style={{margin:'12px',padding:'8px 24px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'8px'}} onClick={()=>handleApproval(false)}>Deny</button>
        </div>
      )}
      <style>{`
        @keyframes glow {
          from { text-shadow: 0 0 8px #00fff7; }
          to { text-shadow: 0 0 24px #00fff7, 0 0 8px #ff0033; }
        }
      `}</style>
    </div>
  );
}
