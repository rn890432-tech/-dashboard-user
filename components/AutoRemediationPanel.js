import React, { useState } from 'react';

function AutoRemediationPanel({ alerts }) {
    const [chainedActions, setChainedActions] = useState([
      { trigger: 'severity >= 0.95', actions: ['isolate', 'notify', 'reset'] }
    ]);
    const [customScript, setCustomScript] = useState('');
  const [remediationLog, setRemediationLog] = useState([]);
  const [action, setAction] = useState('isolate');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [approved, setApproved] = useState(false);
  const [rules, setRules] = useState([
    { if: 'severity >= 0.9', then: 'isolate', escalation: 'notify', rollback: 'reset' }
  ]);
  const [newRule, setNewRule] = useState({ if: '', then: 'isolate', escalation: '', rollback: '' });

  const handleRemediate = () => {
    const highAlerts = alerts.filter(a=>a.severity>=0.8);
    if (approvalRequired && !approved) {
      setRemediationLog(log=>[...log,'Remediation requires approval.']);
      return;
    }
    // Apply rules
    rules.forEach(rule => {
      // Simple eval for demo
      if (highAlerts.some(a => eval(rule.if.replace('severity', 'a.severity')))) {
        setRemediationLog(log=>[...log,`Rule: ${rule.if} -> ${rule.then} | Escalate: ${rule.escalation} | Rollback: ${rule.rollback}`]);
      }
    });
    if (highAlerts.length) {
      setRemediationLog(log=>[...log,`Remediation (${action}) triggered for ${highAlerts.length} high-severity alerts.`]);
      setApproved(false);
    } else {
      setRemediationLog(log=>[...log,'No high-severity alerts to remediate.']);
    }
  };

  return (
    <div className="auto-remediation-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Chained Automation & Custom Logic</h4>
      <ul style={{margin:'8px 0'}}>
        {chainedActions.map((c,idx)=>(
          <li key={idx}>Trigger: {c.trigger} | Actions: {c.actions.join(' → ')}</li>
        ))}
      </ul>
      <div style={{marginBottom:'8px'}}>
        <label>Custom Script:
          <textarea value={customScript} onChange={e=>setCustomScript(e.target.value)} style={{width:'100%',height:'40px',marginLeft:'8px'}} placeholder="// JS logic for custom remediation" />
        </label>
      </div>
      <h4>Auto-Remediation</h4>
      <div style={{marginBottom:'8px'}}>
        <strong>Automation Rules:</strong>
        <ul style={{margin:'8px 0'}}>
          {rules.map((r,idx)=>(
            <li key={idx} style={{marginBottom:'4px'}}>
              IF {r.if} THEN {r.then} | Escalate: {r.escalation} | Rollback: {r.rollback}
            </li>
          ))}
        </ul>
        <div style={{marginTop:'8px'}}>
          <label>IF:
            <input type="text" value={newRule.if} onChange={e=>setNewRule({...newRule, if:e.target.value})} style={{marginLeft:'8px'}} placeholder="severity >= 0.9" />
          </label>
          <label style={{marginLeft:'16px'}}>THEN:
            <select value={newRule.then} onChange={e=>setNewRule({...newRule, then:e.target.value})} style={{marginLeft:'8px'}}>
              <option value="isolate">Isolate Node</option>
              <option value="block">Block IP</option>
              <option value="reset">Reset Credentials</option>
              <option value="notify">Notify Admin</option>
            </select>
          </label>
          <label style={{marginLeft:'16px'}}>Escalate:
            <input type="text" value={newRule.escalation} onChange={e=>setNewRule({...newRule, escalation:e.target.value})} style={{marginLeft:'8px'}} placeholder="notify" />
          </label>
          <label style={{marginLeft:'16px'}}>Rollback:
            <input type="text" value={newRule.rollback} onChange={e=>setNewRule({...newRule, rollback:e.target.value})} style={{marginLeft:'8px'}} placeholder="reset" />
          </label>
          <button onClick={()=>{
            setRules([...rules, {...newRule}]);
            setNewRule({ if: '', then: 'isolate', escalation: '', rollback: '' });
          }} style={{marginLeft:'16px',padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Add Rule</button>
        </div>
        <label style={{marginLeft:'16px'}}>Action:
          <select value={action} onChange={e=>setAction(e.target.value)} style={{marginLeft:'8px'}}>
            <option value="isolate">Isolate Node</option>
            <option value="block">Block IP</option>
            <option value="reset">Reset Credentials</option>
            <option value="notify">Notify Admin</option>
          </select>
        </label>
        <label style={{marginLeft:'16px'}}>Approval Required:
          <input type="checkbox" checked={approvalRequired} onChange={e=>setApprovalRequired(e.target.checked)} style={{marginLeft:'8px'}} />
        </label>
        {approvalRequired && !approved && <button onClick={()=>setApproved(true)} style={{marginLeft:'16px',padding:'6px 12px',background:'#ff9800',color:'#fff',border:'none',borderRadius:'6px'}}>Approve</button>}
      </div>
      <button onClick={handleRemediate} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Trigger Remediation</button>
      <ul style={{marginTop:'8px'}}>
        {remediationLog.map((log,i)=>(<li key={i}>{log}</li>))}
      </ul>
    </div>
  );
}

export default AutoRemediationPanel;
