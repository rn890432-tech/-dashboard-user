import React, { useState } from 'react';

function ScheduledReportsPanel({ alerts, sbom }) {
    const [eventTriggers, setEventTriggers] = useState([
      { type: 'alert', condition: 'alerts.length > 50', scheduleIdx: 0 },
      { type: 'compliance', condition: 'sbom.some(dep=>dep.vulnScore>0.7)', scheduleIdx: 0 }
    ]);
    const [customScript, setCustomScript] = useState('');
  const [lastReport, setLastReport] = useState(null);
  const [schedules, setSchedules] = useState([
    { frequency: 'daily', time: '08:00', emails: ['recipient@example.com'], exportType: 'pdf', template: 'default' }
  ]);
  const [newSchedule, setNewSchedule] = useState({ frequency: 'daily', time: '08:00', emails: '', exportType: 'pdf', template: 'default' });

  const handleGenerateReport = () => {
    const summary = `Total Alerts: ${alerts.length}\nHigh Severity: ${alerts.filter(a=>a.severity>=0.7).length}\nCompliance: ${sbom.every(dep=>dep.vulnScore<0.5)?'COMPLIANT':'REVIEW REQUIRED'}`;
    setLastReport(summary);
    // TODO: Email/export logic for all schedules
  };

  return (
    <div className="scheduled-reports-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Event-Driven Automation</h4>
      <ul style={{margin:'8px 0'}}>
        {eventTriggers.map((t,idx)=>(
          <li key={idx}>Trigger: {t.type} | Condition: {t.condition} | Schedule #{t.scheduleIdx+1}</li>
        ))}
      </ul>
      <div style={{marginBottom:'8px'}}>
        <label>Custom Script:
          <textarea value={customScript} onChange={e=>setCustomScript(e.target.value)} style={{width:'100%',height:'40px',marginLeft:'8px'}} placeholder="// JS logic for custom automation" />
        </label>
      </div>
      <h4>Scheduled Reports</h4>
      <div style={{marginBottom:'8px'}}>
        <strong>Schedules:</strong>
        <ul style={{margin:'8px 0'}}>
          {schedules.map((s,idx)=>(
            <li key={idx} style={{marginBottom:'4px'}}>
              {s.frequency} at {s.time} to {s.emails.join(', ')} ({s.exportType}) [Template: {s.template}]
            </li>
          ))}
        </ul>
        <div style={{marginTop:'8px'}}>
          <label>Frequency:
            <select value={newSchedule.frequency} onChange={e=>setNewSchedule({...newSchedule, frequency:e.target.value})} style={{marginLeft:'8px'}}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label style={{marginLeft:'16px'}}>Time:
            <input type="time" value={newSchedule.time} onChange={e=>setNewSchedule({...newSchedule, time:e.target.value})} style={{marginLeft:'8px'}} />
          </label>
          <label style={{marginLeft:'16px'}}>Emails (comma):
            <input type="text" value={newSchedule.emails} onChange={e=>setNewSchedule({...newSchedule, emails:e.target.value})} style={{marginLeft:'8px'}} placeholder="group1@example.com,group2@example.com" />
          </label>
          <label style={{marginLeft:'16px'}}>Export:
            <select value={newSchedule.exportType} onChange={e=>setNewSchedule({...newSchedule, exportType:e.target.value})} style={{marginLeft:'8px'}}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label style={{marginLeft:'16px'}}>Template:
            <input type="text" value={newSchedule.template} onChange={e=>setNewSchedule({...newSchedule, template:e.target.value})} style={{marginLeft:'8px'}} placeholder="default" />
          </label>
          <button onClick={()=>{
            setSchedules([...schedules, {...newSchedule, emails: newSchedule.emails.split(',').map(e=>e.trim()).filter(Boolean)}]);
            setNewSchedule({ frequency: 'daily', time: '08:00', emails: '', exportType: 'pdf', template: 'default' });
          }} style={{marginLeft:'16px',padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Add Schedule</button>
        </div>
      </div>
      <button onClick={handleGenerateReport} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Generate Report</button>
      {lastReport && <pre style={{marginTop:'8px',background:'#181f2a',padding:'8px',borderRadius:'6px'}}>{lastReport}</pre>}
    </div>
  );
}

export default ScheduledReportsPanel;
