import React, { useState } from 'react';

function ExternalIntegrationPanel() {
  const [endpoint, setEndpoint] = useState('');
  const [payload, setPayload] = useState('{}');
  const [result, setResult] = useState('');
  const [type, setType] = useState('rest');
  const templates = {
    siem: '{ "event": "ALERT", "details": { ... } }',
    slack: '{ "text": "SOC Alert: High severity detected!" }',
    teams: '{ "text": "SOC Alert: Compliance issue!" }',
    email: '{ "subject": "SOC Report", "body": "See attached." }',
    rest: '{ "data": { ... } }',
    pagerduty: '{ "incident_key": "SOC-ALERT", "event_type": "trigger", "description": "High severity alert" }',
    servicenow: '{ "short_description": "SOC Alert", "description": "Incident details..." }',
    jira: '{ "fields": { "summary": "SOC Alert", "description": "Incident details..." } }',
    splunk: '{ "event": "SOC_ALERT", "data": { ... } }',
    tcp: 'ALERT|HIGH|SOC',
    udp: 'ALERT|LOW|SOC',
    mqtt: '{ "topic": "soc/alert", "message": "High severity detected" }'
  };

  const handleSend = async () => {
    try {
      // Demo: echo endpoint and payload
      setResult('Sent to ' + endpoint + ' with payload: ' + payload);
      // TODO: actual fetch/webhook logic
    } catch (e) {
      setResult('Error: ' + e.message);
    }
  };

  return (
    <div className="external-integration-panel" style={{background:'#181f2a',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>External Integration</h4>
      <label>Type:
        <select value={type} onChange={e=>{setType(e.target.value);setPayload(templates[e.target.value]);}} style={{marginLeft:'8px'}}>
          <option value="rest">REST API</option>
          <option value="siem">SIEM</option>
          <option value="slack">Slack</option>
          <option value="teams">MS Teams</option>
          <option value="email">Email</option>
          <option value="pagerduty">PagerDuty</option>
          <option value="servicenow">ServiceNow</option>
          <option value="jira">Jira</option>
          <option value="splunk">Splunk</option>
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
          <option value="mqtt">MQTT</option>
        </select>
      </label>
      <input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="Endpoint/webhook/email address" style={{width:'60%',marginRight:'8px',padding:'6px',marginTop:'8px'}} />
      <textarea value={payload} onChange={e=>setPayload(e.target.value)} style={{width:'100%',height:'40px',margin:'8px 0'}} placeholder="{ }" />
      <button onClick={handleSend} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Send</button>
      {result && <div style={{marginTop:'8px',background:'#222',padding:'8px',borderRadius:'6px'}}>{result}</div>}
    </div>
  );
}

export default ExternalIntegrationPanel;
