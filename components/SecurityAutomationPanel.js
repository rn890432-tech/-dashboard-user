import React, { useState } from 'react';

function SecurityAutomationPanel({ alerts }) {
  const [autoResponse, setAutoResponse] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleAutoResponse = () => {
    setAutoResponse(!autoResponse);
    if (!autoResponse && alerts.some(a => a.severity >= 0.8)) {
      setLastAction('Automated containment triggered for high-severity alert.');
    }
  };

  return (
    <div className="security-automation-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Security Automation</h4>
      <label style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <input type="checkbox" checked={autoResponse} onChange={handleAutoResponse} />
        Enable Automated Incident Response
      </label>
      {lastAction && <div style={{marginTop:'8px',color:'#ff9800'}}>{lastAction}</div>}
    </div>
  );
}

export default SecurityAutomationPanel;
