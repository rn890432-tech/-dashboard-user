// MitreKillChainBar — MITRE ATT&CK kill chain progress visualization for replay
import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:8000';

const PHASE_COLORS = {
    'Reconnaissance': '#78909c',
    'Initial access': '#e53935',
    'Execution': '#ff7043',
    'Persistence': '#ffa726',
    'Privilege escalation': '#ffca28',
    'Defense evasion': '#66bb6a',
    'Lateral movement': '#26c6da',
    'Collection': '#42a5f5',
    'Command and control': '#7e57c2',
    'Data exfiltration': '#ab47bc',
    'Impact': '#ef5350',
};

export default function MitreKillChainBar({ scenarioId, activePhase }) {
    const [killChain, setKillChain] = useState([]);

    useEffect(() => {
        if (!scenarioId) return;
        fetch(`${API_BASE}/api/replay/${encodeURIComponent(scenarioId)}/kill-chain`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data?.kill_chain) setKillChain(data.kill_chain);
            })
            .catch(() => { });
    }, [scenarioId]);

    if (!killChain.length) return null;

    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.68rem', color: '#78909c', marginBottom: 4, letterSpacing: '0.06em' }}>
                MITRE ATT&CK KILL CHAIN
            </div>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {killChain.map((entry) => {
                    const isActive = entry.phase === activePhase;
                    const color = PHASE_COLORS[entry.phase] || '#546e7a';
                    return (
                        <div
                            key={entry.phase}
                            title={
                                entry.hit
                                    ? `${entry.phase}${entry.matched_techniques?.length ? ` — ${entry.matched_techniques.join(', ')}` : ''}`
                                    : `${entry.phase} (not observed)`
                            }
                            style={{
                                flex: 1,
                                minWidth: 44,
                                textAlign: 'center',
                                padding: '5px 3px',
                                borderRadius: 4,
                                fontSize: '0.58rem',
                                fontWeight: entry.hit ? 700 : 400,
                                letterSpacing: '0.02em',
                                background: entry.hit ? `${color}30` : 'rgba(255,255,255,0.03)',
                                border: isActive
                                    ? `2px solid ${color}`
                                    : entry.hit
                                        ? `1px solid ${color}66`
                                        : '1px solid #1a3a4a33',
                                color: entry.hit ? color : '#546e7a55',
                                boxShadow: isActive ? `0 0 8px ${color}55` : 'none',
                                transition: 'all 0.25s',
                                cursor: 'default',
                                position: 'relative',
                            }}
                        >
                            {entry.phase.split(' ').map((w) => w.charAt(0).toUpperCase()).join('')}
                            {entry.hit && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: -3,
                                        right: -3,
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: color,
                                        boxShadow: `0 0 4px ${color}`,
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Legend for active phase */}
            {activePhase && (
                <div style={{ fontSize: '0.62rem', color: PHASE_COLORS[activePhase] || '#78909c', marginTop: 3 }}>
                    ● Active: {activePhase}
                </div>
            )}
        </div>
    );
}
