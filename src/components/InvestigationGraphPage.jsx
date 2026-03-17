import React from 'react';
import ThreatInvestigationGraph3D from './ThreatInvestigationGraph3D.jsx';

export default function InvestigationGraphPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#02060d', color: '#d0e8ff', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ margin: 0, color: '#29b6f6', fontFamily: 'JetBrains Mono, monospace' }}>
                    Investigation / Graph
                </h2>
                <a href="/" style={{ color: '#81d4fa', textDecoration: 'none', border: '1px solid #81d4fa44', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                    ← Back to Dashboard
                </a>
            </div>

            <div style={{ marginBottom: 10, fontSize: 12, color: '#86a7b7', fontFamily: 'JetBrains Mono, monospace' }}>
                Relationship example: Attacker IP → Malicious Domain → Phishing Page → Compromised User → Internal Server
            </div>

            <ThreatInvestigationGraph3D />
        </div>
    );
}
