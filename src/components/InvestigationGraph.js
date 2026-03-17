// InvestigationGraph — SVG-based node-link graph powered by /investigation-graph API
import React, { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'http://localhost:8000';

const TYPE_COLOR = {
    ip: '#ff5252',
    domain: '#ff9800',
    hash: '#90a4ae',
    mitre: '#ab47bc',
    alert: '#ff1744',
    telemetry: '#26c6da',
    asset: '#ffd54f',
    user: '#29b6f6',
    device: '#66bb6a',
    malware: '#ce93d8',
    threat: '#ff1744',
    email: '#78909c',
    defense_action: '#ef9a9a',
};

const W = 680;
const H = 440;
const NODE_R = 20;

function radialLayout(nodes) {
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(cx, cy) * 0.72;
    return nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2;
        return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
}

export default function InvestigationGraph() {
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [meta, setMeta] = useState({ types: [], severities: [], hours: 24 });
    const [filters, setFilters] = useState({ threatType: 'all', severity: 'all', hours: '24' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replayPhase, setReplayPhase] = useState('');
    const [replayIndicator, setReplayIndicator] = useState('');
    const timerRef = useRef(null);

    const fetchGraph = useCallback(() => {
        const params = new URLSearchParams();
        params.set('hours', filters.hours);
        if (filters.threatType !== 'all') params.set('threat_type', filters.threatType);
        if (filters.severity !== 'all') params.set('severity', filters.severity);

        fetch(`${API_BASE}/investigation-graph?${params.toString()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                setGraph(data);
                setMeta(data.meta || { types: [], severities: [], hours: Number(filters.hours) });
                setLoading(false);
                setError(null);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [filters]);

    const fetchNodeDetails = useCallback((node) => {
        setDetailLoading(true);
        setDetail(null);
        fetch(`${API_BASE}/investigation-graph/node/${encodeURIComponent(node.id)}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                setDetail(data);
                setDetailLoading(false);
            })
            .catch(() => {
                setDetailLoading(false);
                setDetail(null);
            });
    }, []);

    useEffect(() => {
        fetchGraph();
        timerRef.current = setInterval(fetchGraph, 10000);
        return () => clearInterval(timerRef.current);
    }, [fetchGraph]);

    useEffect(() => {
        const handler = (e) => {
            setReplayPhase(e?.detail?.phase || '');
            setReplayIndicator(e?.detail?.indicator || '');
        };
        window.addEventListener('replayPhaseChange', handler);
        return () => window.removeEventListener('replayPhaseChange', handler);
    }, []);

    const positioned = radialLayout(graph.nodes);
    const nodeMap = Object.fromEntries(positioned.map((n) => [n.id, n]));

    return (
        <div
            style={{
                background: '#0a0d10',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 16,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#d0e8ff',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <span
                    style={{ color: '#00bfff', fontWeight: 700, letterSpacing: 2, fontSize: '0.95rem' }}
                >
                    INVESTIGATION GRAPH
                </span>
                <button
                    onClick={fetchGraph}
                    style={{
                        background: 'none',
                        border: '1px solid #1a5a7a',
                        color: '#00bfff',
                        borderRadius: 6,
                        padding: '3px 12px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontFamily: 'inherit',
                    }}
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Filtering toolbar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <select
                    value={filters.threatType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, threatType: e.target.value }))}
                    style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '5px 8px', fontSize: '0.72rem' }}
                >
                    <option value="all">All threat types</option>
                    {meta.types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select
                    value={filters.severity}
                    onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                    style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '5px 8px', fontSize: '0.72rem' }}
                >
                    <option value="all">All severities</option>
                    {meta.severities.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <select
                    value={filters.hours}
                    onChange={(e) => setFilters((prev) => ({ ...prev, hours: e.target.value }))}
                    style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '5px 8px', fontSize: '0.72rem' }}
                >
                    <option value="1">Last 1 hour</option>
                    <option value="6">Last 6 hours</option>
                    <option value="24">Last 24 hours</option>
                    <option value="72">Last 72 hours</option>
                    <option value="168">Last 7 days</option>
                </select>
            </div>

            {/* States */}
            {loading && (
                <div style={{ color: '#555', fontSize: '0.85rem', textAlign: 'center', padding: 40 }}>
                    Loading graph…
                </div>
            )}
            {error && (
                <div style={{ color: '#ff5722', fontSize: '0.8rem', padding: 8 }}>
                    Graph unavailable — {error}. Start the API server and ingest threats to populate.
                </div>
            )}
            {!loading && !error && graph.nodes.length === 0 && (
                <div
                    style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.83rem' }}
                >
                    No nodes yet. POST to /threats to populate the graph.
                </div>
            )}

            {/* SVG canvas */}
            {!loading && !error && graph.nodes.length > 0 && (
                <svg
                    width="100%"
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ background: '#060a0d', borderRadius: 8, display: 'block' }}
                >
                    <defs>
                        <marker
                            id="ig-arrow"
                            markerWidth="8"
                            markerHeight="6"
                            refX="8"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="#ff9800" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {graph.edges.map((e, i) => {
                        const src = nodeMap[e.source];
                        const dst = nodeMap[e.target];
                        if (!src || !dst) return null;
                        // shorten line so arrow tip doesn't overlap circle
                        const dx = dst.x - src.x;
                        const dy = dst.y - src.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const x2 = dst.x - (dx / len) * (NODE_R + 10);
                        const y2 = dst.y - (dy / len) * (NODE_R + 10);
                        return (
                            <line
                                key={i}
                                x1={src.x}
                                y1={src.y}
                                x2={x2}
                                y2={y2}
                                stroke="#ff9800"
                                strokeWidth={1.5}
                                strokeOpacity={0.45}
                                markerEnd="url(#ig-arrow)"
                            />
                        );
                    })}

                    {/* Nodes */}
                    {positioned.map((n) => {
                        const color = TYPE_COLOR[n.type] || '#888';
                        const isSelected = selected?.id === n.id;
                        const phaseText = String(replayPhase || '').toLowerCase();
                        const indicatorHit = replayIndicator
                            ? String(n.label || '').toLowerCase().includes(String(replayIndicator).toLowerCase())
                            : false;
                        const phaseHit =
                            (phaseText.includes('initial') && ['domain', 'email', 'threat'].includes(n.type)) ||
                            (phaseText.includes('lateral') && ['device', 'asset', 'ip', 'telemetry'].includes(n.type)) ||
                            (phaseText.includes('exfiltration') && ['ip', 'asset', 'threat', 'alert'].includes(n.type));
                        const replayHighlighted = Boolean(indicatorHit || phaseHit);
                        return (
                            <g
                                key={n.id}
                                onClick={() => {
                                    const next = isSelected ? null : n;
                                    setSelected(next);
                                    if (next) fetchNodeDetails(next);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <circle
                                    cx={n.x}
                                    cy={n.y}
                                    r={isSelected ? NODE_R + 4 : NODE_R}
                                    fill={color}
                                    fillOpacity={replayHighlighted ? 0.28 : 0.18}
                                    stroke={replayHighlighted ? '#ffeb3b' : color}
                                    strokeWidth={isSelected ? 3 : replayHighlighted ? 2.6 : 1.5}
                                />
                                <text
                                    x={n.x}
                                    y={n.y + 4}
                                    textAnchor="middle"
                                    fill={color}
                                    fontSize={9}
                                    fontFamily="JetBrains Mono, monospace"
                                    fontWeight={700}
                                >
                                    {(n.label || n.id).slice(0, 15)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            )}

            {/* Selected node detail */}
            {selected && (
                <div
                    style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        background: '#0c1a24',
                        border: `1px solid ${TYPE_COLOR[selected.type] || '#333'}55`,
                        borderRadius: 6,
                        fontSize: '0.78rem',
                    }}
                >
                    <b style={{ color: TYPE_COLOR[selected.type] || '#fff' }}>{selected.label}</b>
                    <span style={{ color: '#555', marginLeft: 10 }}>type: {selected.type}</span>
                    <span style={{ color: '#555', marginLeft: 10 }}>id: {selected.id}</span>
                </div>
            )}

            {replayPhase && (
                <div
                    style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        border: '1px solid #1a3a4a',
                        borderRadius: 6,
                        background: 'rgba(255, 235, 59, 0.06)',
                        color: '#d6c66f',
                        fontSize: '0.7rem',
                    }}
                >
                    Replay phase highlight active: <b>{replayPhase}</b>
                    {replayIndicator ? ` · indicator focus: ${replayIndicator}` : ''}
                </div>
            )}

            {/* Investigation drill-down */}
            {selected && (
                <div
                    style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        background: '#06141f',
                        border: '1px solid #1a3a4a',
                        borderRadius: 6,
                    }}
                >
                    <div style={{ color: '#29b6f6', fontWeight: 700, fontSize: '0.75rem', marginBottom: 6, letterSpacing: '0.06em' }}>
                        INVESTIGATION DRILL-DOWN
                    </div>

                    {detailLoading && <div style={{ color: '#78909c', fontSize: '0.74rem' }}>Loading node detail…</div>}

                    {!detailLoading && !detail && (
                        <div style={{ color: '#78909c', fontSize: '0.74rem' }}>No detail available for this node.</div>
                    )}

                    {!detailLoading && detail && (
                        <>
                            <div style={{ fontSize: '0.74rem', marginBottom: 8 }}>
                                <span style={{ color: '#607d8b' }}>Node:</span>{' '}
                                <span style={{ color: '#cfe8ff' }}>{detail.node?.label || selected.label}</span>
                            </div>

                            <div style={{ marginBottom: 8 }}>
                                <div style={{ color: '#607d8b', fontSize: '0.7rem', marginBottom: 4 }}>Timeline of activity</div>
                                <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid #1a3a4a', borderRadius: 5, padding: 6 }}>
                                    {(detail.timeline || []).length === 0 && (
                                        <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No timeline entries.</div>
                                    )}
                                    {(detail.timeline || []).map((ev, idx) => (
                                        <div key={idx} style={{ marginBottom: 6, fontSize: '0.72rem' }}>
                                            <div style={{ color: '#78909c' }}>
                                                {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}
                                                <span style={{ color: '#546e7a', marginLeft: 6 }}>{ev.event_type}</span>
                                            </div>
                                            <div style={{ color: '#cfe8ff' }}>{ev.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div style={{ color: '#607d8b', fontSize: '0.7rem', marginBottom: 4 }}>Related indicators</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(detail.related_indicators || []).length === 0 && (
                                        <span style={{ color: '#546e7a', fontSize: '0.72rem' }}>No related indicators.</span>
                                    )}
                                    {(detail.related_indicators || []).map((ind) => (
                                        <span
                                            key={ind}
                                            style={{
                                                border: '1px solid #1a3a4a',
                                                borderRadius: 4,
                                                padding: '2px 7px',
                                                fontSize: '0.69rem',
                                                color: '#8ab4c7',
                                                background: 'rgba(255,255,255,0.02)',
                                            }}
                                        >
                                            {ind}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Legend */}
            <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.68rem' }}>
                {Object.entries(TYPE_COLOR).map(([type, color]) => (
                    <span key={type} style={{ color }}>
                        ■ {type}
                    </span>
                ))}
            </div>
        </div>
    );
}
