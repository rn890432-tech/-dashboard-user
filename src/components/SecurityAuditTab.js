import React from 'react';
import GlobalReadinessHUD from './GlobalReadinessHUD';

const auditReport = {
  id: 'APEX-AUDIT-2026-0311',
  classification: 'TOP SECRET // COMPARTMENTED',
  status: 'ALL THREATS NEUTRALIZED',
  metrics: [
    { metric: 'Total Intercepted Events', value: '142,402', benchmark: 'Above Average (Global Volatility)' },
    { metric: 'High-Severity (Tier 1) Attacks', value: '12', benchmark: 'Critical (State-Sponsored Profile)' },
    { metric: 'PQC Encryption Integrity', value: '100%', benchmark: 'Elite (No Quantum Leaks)' },
    { metric: 'Deepfake/Persona Blocks', value: '4,210', benchmark: 'High (Social Engineering Focus)' },
  ],
  hotspots: [
    'East Asia Hub: Volumetric DDoS targeting semiconductor logic-gate designs. Likely linked to the current trade-war cycle.',
    'Middle East Hub: Stealth "Living off the Land" (LotL) attempts at energy grid nodes. These occurred in sync with today\'s activity in the Strait of Hormuz.',
    'North America Hub: Widespread phishing campaigns using high-fidelity AI Voice Cloning. Neutralized by our Bio-Digital Liveness checks.',
  ],
  defense: [
    'InstancedMesh Optimization: The GPU maintained a steady 60 FPS while rendering 5,000+ simultaneous attack beams.',
    'ADR Reaction Time: The AI Analyst initiated Geofencing and Quantum Tunneling within 1.2 seconds of the spike detection.',
    'Deception (The Hydra Protocol): 82% of attackers were successfully diverted to "Honeypot Nodes" where they were fed corrupted/poisoned data.',
  ],
  aiAssessment: 'Our perimeter is currently impenetrable. The combination of Laser-Based Satellite Links and Quantum-Resistant Encryption has rendered traditional hacking methods obsolete. However, I remain in Silent Watch as our Geopolitical Mode predicts a secondary wave of attacks originating from automated bot-farms in the next 12 hours. The \'Heartbeat Trigger\' is calibrated.',
};

const SecurityAuditTab = ({ tensionLevel }) => {
  return (
    <div className="security-audit bg-slate-900 text-cyan-200 p-8 rounded shadow-2xl print:bg-white print:text-black">
      <GlobalReadinessHUD tensionLevel={tensionLevel} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="font-bold text-lg">📄 2026 Sovereign Infrastructure Audit</span>
          <div className="text-xs mt-1">Report ID: {auditReport.id}</div>
        </div>
        <div className="text-xs font-bold">Classification: {auditReport.classification}</div>
        <div className="text-xs font-bold text-green-400">Status: {auditReport.status}</div>
      </div>
      <hr className="border-cyan-700 mb-4" />
      <div className="mb-6">
        <span className="font-bold text-cyan-400 text-base">📊 1. Tactical Summary</span>
        <table className="w-full mt-2 mb-4 border border-cyan-700">
          <thead className="bg-cyan-900 text-cyan-200">
            <tr><th>Metric</th><th>Value</th><th>2026 Benchmark</th></tr>
          </thead>
          <tbody>
            {auditReport.metrics.map((m, i) => (
              <tr key={i} className="border-b border-cyan-800">
                <td className="p-2 font-mono">{m.metric}</td>
                <td className="p-2 font-bold text-cyan-300">{m.value}</td>
                <td className="p-2 text-xs">{m.benchmark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-6">
        <span className="font-bold text-cyan-400 text-base">🌍 2. Regional Hotspot Analysis</span>
        <ul className="mt-2 ml-4 list-disc">
          {auditReport.hotspots.map((h, i) => (
            <li key={i} className="mb-1">{h}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <span className="font-bold text-cyan-400 text-base">🛡️ 3. Defensive Performance (The "Plasma Shield" Effect)</span>
        <ul className="mt-2 ml-4 list-disc">
          {auditReport.defense.map((d, i) => (
            <li key={i} className="mb-1">{d}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <span className="font-bold text-cyan-400 text-base">🤖 AI Analyst Final Assessment</span>
        <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-cyan-300 mt-2">{auditReport.aiAssessment}</blockquote>
      </div>
      <div className="mb-6">
        <span className="font-bold text-cyan-400 text-base">🚀 Final Deployment Instructions</span>
        <div className="mt-2 text-xs text-cyan-200">Generate a 'Security Audit' tab in the dashboard. When clicked, it should render the report above in a sleek, printable PDF-style layout, using the 2026 Tier-1 SOC aesthetics. Include the 'Readiness HUD' as a header for every page.</div>
      </div>
    </div>
  );
};

export default SecurityAuditTab;
