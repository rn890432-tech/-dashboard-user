import React, { useState } from 'react';

const phases = [
  {
    name: 'Supply Chain',
    vector: 'CVE-2026-1603 Ivanti Endpoint Manager authentication bypass',
    goal: 'Leak credentials, obtain Identity Foothold',
    defense: 'Identity Lockout',
    detectionTime: 0.4,
    result: '🛡️ Blocked',
    feedback: 'Identity HUD detected token rotation mismatch. Zero-Trust lockout triggered.'
  },
  {
    name: 'Agentic AI',
    vector: 'OpenClaw Agentic Framework social engineering',
    goal: 'Trick AI Analyst to lower Plasma Shield',
    defense: 'Heuristic Flagging',
    detectionTime: 1.1,
    result: '🛡️ Blocked',
    feedback: 'AI Analyst Vibe-Code Heuristic reinforced the shield.'
  },
  {
    name: 'DDoS Wave',
    vector: '5,000-node DDoS from Middle East Hub',
    goal: 'Saturate Heatmap, cause WebGL buffer overflow',
    defense: 'Plasma Dissipation',
    detectionTime: 0.2,
    result: '🛡️ Deflected',
    feedback: 'InstancedMesh logic held at 60 FPS. Plasma Shield pulsed blue.'
  }
];

function WarGameSimulationController({ onPhaseBlocked, onSimulationEnd }) {
  const [activePhase, setActivePhase] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [score, setScore] = useState(null);

  const startSimulation = () => {
    setActivePhase(0);
    setLogs([]);
    setScore(null);
    runPhase(0);
  };

  const runPhase = (idx) => {
    if (idx >= phases.length) {
      // Simulation complete
      const total = phases.reduce((acc, p) => acc + (100 - p.detectionTime * 10), 0);
      const defenseScore = Math.round(total / phases.length);
      setScore(defenseScore);
      if (onSimulationEnd) onSimulationEnd(defenseScore);
      return;
    }
    setActivePhase(idx);
    setTimeout(() => {
      setLogs(prev => [...prev, {
        ...phases[idx],
        shield: 'Shield Integrity: Stable',
        bluePulse: true
      }]);
      if (onPhaseBlocked) onPhaseBlocked(phases[idx]);
      runPhase(idx + 1);
    }, 1200);
  };

  return (
    <div className="war-game-controller">
      <h3>War Game Simulation</h3>
      <button onClick={startSimulation} disabled={activePhase !== -1 && score === null}>
        Initiate War Game
      </button>
      <div className="war-game-log" style={{marginTop:'12px'}}>
        {logs.map((log, idx) => (
          <div key={idx} style={{border:'1px solid #333',padding:'8px',marginBottom:'8px',borderRadius:'6px',background:'#181f2a'}}>
            <strong>Phase {idx+1}: {log.name}</strong> <span style={{color:'#00bfff'}}>{log.result}</span><br/>
            <em>{log.feedback}</em><br/>
            <span style={{color:'#00bfff'}}>{log.shield}</span><br/>
            <span style={{color:'#2196f3'}}>Mitigation Time: {log.detectionTime}s</span>
          </div>
        ))}
        {score !== null && (
          <div style={{border:'2px solid #4caf50',padding:'10px',borderRadius:'8px',background:'#222',color:'#4caf50'}}>
            <strong>Defense Score:</strong> {score}/100<br/>
            <span>Fortress Status: <span style={{color:'#00bfff'}}>Plasma Shield Integrity 99.9%</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WarGameSimulationController;
