import React, { useState } from 'react';

const adversaryPacks = [
  { name: 'Noisy Intruder', scenarios: ['Brute Force Storm', 'Credential Stuffing', 'Loud lateral movement'] },
  { name: 'Stealth Walker', scenarios: ['Slow beaconing', 'Low-and-slow lateral movement', 'Geo anomalies'] },
  { name: 'Data Thief', scenarios: ['Privilege escalation', 'File access anomalies', 'Exfiltration bursts'] },
  { name: 'Full Kill Chain', scenarios: ['Phishing', 'Malware execution', 'Lateral movement', 'Exfiltration'] }
];

const abusePatterns = [
  'Poisoning attempts',
  'Alert floods',
  'Evasion patterns',
  'Access control bypass attempts',
  'Graph pivot enumeration tests'
];

export default function RedTeamConsolePanel() {
  const [selectedPack, setSelectedPack] = useState(adversaryPacks[0]);
  const [noiseLevel, setNoiseLevel] = useState(0.5);
  const [simulationResult, setSimulationResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8766/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: selectedPack.name, noise: noiseLevel })
      });
      if (!res.ok) throw new Error('Simulation failed');
      const result = await res.json();
      setSimulationResult(result);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{background:'#222',color:'#fff',padding:'24px',borderRadius:'16px',maxWidth:'700px',margin:'auto'}}>
      <h2>Red Team Console</h2>
      <div style={{display:'flex',gap:'12px',marginBottom:'16px'}}>
        <button>Scenario Builder</button>
        <button>Attack Simulator</button>
        <button>History</button>
      </div>
      <div style={{marginBottom:'16px'}}>
        <h3>Scenario Builder</h3>
        <label>Adversary Pack:
          <select value={selectedPack.name} onChange={e => setSelectedPack(adversaryPacks.find(p => p.name === e.target.value))}>
            {adversaryPacks.map(pack => <option key={pack.name} value={pack.name}>{pack.name}</option>)}
          </select>
        </label>
        <div>Scenarios: {selectedPack.scenarios.join(', ')}</div>
        <label>Noise Level:
          <input type="range" min={0} max={1} step={0.01} value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} />
          <span>{Math.round(noiseLevel*100)}%</span>
        </label>
        <button style={{marginTop:'12px',padding:'8px 24px',background:'#00fff7',color:'#222',border:'none',borderRadius:'8px'}} onClick={runSimulation}>Save Scenario & Run Simulation</button>
      </div>
      <div style={{marginBottom:'16px'}}>
        <h3>Abuse Patterns (Built-In Tests)</h3>
        <ul>{abusePatterns.map(p => <li key={p}>{p}</li>)}</ul>
      </div>
      {loading && <div style={{color:'#00fff7'}}>Running simulation...</div>}
      {error && <div style={{color:'#ff0033'}}>Error: {error}</div>}
      {simulationResult && (
        <div style={{background:'#111',padding:'16px',borderRadius:'12px',marginBottom:'16px'}}>
          <h3>Simulation Results: {selectedPack.name}</h3>
          <div>Coverage: {Math.round(simulationResult.coverage*100)}%</div>
          <div>Time to Detect: {simulationResult.time_to_detect_seconds}s</div>
          <div>Techniques Detected: {simulationResult.techniques_detected.join(', ')}</div>
          <div>Techniques Missed: {simulationResult.techniques_missed.join(', ')}</div>
          <div>Investigation Nodes: {simulationResult.investigation_nodes}</div>
          <div>Hunter Score: {simulationResult.hunter_score}</div>
          <div>Simulation ID: {simulationResult.simulation_id}</div>
          <div>Campaign Clustered: {simulationResult.campaign_clustered ? 'Yes' : 'No'}</div>
          <button style={{margin:'8px',padding:'8px 24px',background:'#00fff7',color:'#222',border:'none',borderRadius:'8px'}}>View Investigation Graph</button>
          <button style={{margin:'8px',padding:'8px 24px',background:'#9c27b0',color:'#fff',border:'none',borderRadius:'8px'}}>View Timeline</button>
        </div>
      )}
      <div style={{marginBottom:'16px'}}>
        <h3>Hardening Guidance</h3>
        <ul>
          <li>Strong auth on all APIs</li>
          <li>Token validation on WebSockets</li>
          <li>Rate limiting on synthetic events</li>
          <li>Separate synthetic vs. real baselines</li>
          <li>Non-root containers</li>
          <li>NetworkPolicies</li>
          <li>Secrets management</li>
          <li>Audit logs for all simulation actions</li>
        </ul>
      </div>
    </div>
  );
}
