// ReplayAttackPathGraph — animated SVG attack-path graph for replay scenarios
import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:8000';

const TYPE_COLOR = {
    incident_created: '#29b6f6',
    threat_detected: '#ff5252',
    ioc_alert: '#ffc107',
    alert_created: '#ffa726',
    telemetry_event: '#66bb6a',
    ip: '#42a5f5',
    asset: '#26c6da',
    indicator: '#ab47bc',
    event: '#78909c',
};

function layoutNodes(nodes) {
    // Simple force-free grid layout grouped by phase
    const phaseOrder = [
        'Reconnaissance', 'Initial access', 'Execution', 'Persistence',
        'Privilege escalation', 'Defense evasion', 'Lateral movement',
        'Collection', 'Command and control', 'Data exfiltration', 'Impact', 'Investigation',
    ];
    const byPhase = {};
    for (const n of nodes) {
        const p = n.phase || 'Investigation';
        if (!byPhase[p]) byPhase[p] = [];
        byPhase[p].push(n);
    }

    const positioned = {};
    let colIdx = 0;
    for (const phase of phaseOrder) {
        const group = byPhase[phase];
        if (!group || !group.length) continue;
        group.forEach((n, rowIdx) => {
            positioned[n.id] = {
                ...n,
                cx: 80 + colIdx * 130,
                cy: 40 + rowIdx * 56,
            };
        });
        colIdx++;
    }
    return positioned;
}

export default function ReplayAttackPathGraph({ scenarioId, currentStep }) {
    const [graphData, setGraphData] = useState(null);

    useEffect(() => {
        if (!scenarioId) return;
        fetch(`${API_BASE}/api/replay/${encodeURIComponent(scenarioId)}/attack-path`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data) setGraphData(data);
            })
            .catch(() => { });
    }, [scenarioId]);

    const positioned = useMemo(() => {
        if (!graphData?.nodes?.length) return {};
        return layoutNodes(graphData.nodes);
    }, [graphData]);

    const visibleEdges = useMemo(() => {
        if (!graphData?.edges?.length) return [];
        return graphData.edges.filter((e) => {
            const fromNode = positioned[e.from];
            const toNode = positioned[e.to];
            if (!fromNode || !toNode) return false;
            // Show edges up to current step
            const fromStep = fromNode.step || 0;
            const toStep = toNode.step || 0;
            return Math.min(fromStep, toStep) <= currentStep;
        });
    }, [graphData, positioned, currentStep]);

    if (!graphData?.nodes?.length) return null;

    const allCx = Object.values(positioned).map((n) => n.cx);
    const allCy = Object.values(positioned).map((n) => n.cy);
    const svgW = Math.max(400, Math.max(...allCx) + 100);
    const svgH = Math.max(200, Math.max(...allCy) + 80);

    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.68rem', color: '#78909c', marginBottom: 4, letterSpacing: '0.06em' }}>
                ATTACK PATH GRAPH
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #1a3a4a', borderRadius: 8, background: 'rgba(0,0,0,0.25)', padding: 4 }}>
                <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                    <defs>
                        <marker id="replay-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#29b6f644" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {visibleEdges.map((e, i) => {
                        const from = positioned[e.from];
                        const to = positioned[e.to];
                        if (!from || !to) return null;
                        const isSequence = e.label === 'sequence';
                        return (
                            <line
                                key={`e-${i}`}
                                x1={from.cx}
                                y1={from.cy}
                                x2={to.cx}
                                y2={to.cy}
                                stroke={isSequence ? '#29b6f633' : '#ffffff15'}
                                strokeWidth={isSequence ? 1.5 : 0.8}
                                strokeDasharray={isSequence ? 'none' : '3,3'}
                                markerEnd="url(#replay-arrow)"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {Object.values(positioned).map((n) => {
                        const isReached = (n.step || 0) <= currentStep;
                        const isActive = n.step === currentStep;
                        const color = TYPE_COLOR[n.type] || '#78909c';
                        const radius = n.type === 'ip' || n.type === 'asset' || n.type === 'indicator' ? 10 : 14;
                        return (
                            <g key={n.id}>
                                <circle
                                    cx={n.cx}
                                    cy={n.cy}
                                    r={radius}
                                    fill={isReached ? `${color}40` : '#1a3a4a20'}
                                    stroke={isActive ? '#ffeb3b' : isReached ? color : '#1a3a4a44'}
                                    strokeWidth={isActive ? 2.5 : 1}
                                    style={{ transition: 'all 0.3s' }}
                                />
                                {isActive && (
                                    <circle
                                        cx={n.cx}
                                        cy={n.cy}
                                        r={radius + 4}
                                        fill="none"
                                        stroke="#ffeb3b55"
                                        strokeWidth={1.2}
                                    />
                                )}
                                <text
                                    x={n.cx}
                                    y={n.cy + radius + 12}
                                    textAnchor="middle"
                                    fill={isReached ? '#c8e2f0' : '#546e7a44'}
                                    fontSize="8"
                                    fontFamily="JetBrains Mono, monospace"
                                >
                                    {(n.label || '').slice(0, 18)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
