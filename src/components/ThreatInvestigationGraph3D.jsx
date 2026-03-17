import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

const API_BASE = 'http://localhost:8000';

const TYPE_COLOR = {
    ip: '#ff5252',
    domain: '#ff9800',
    user: '#29b6f6',
    malware: '#ab47bc',
    asset: '#ffd54f',
    device: '#26a69a',
    incident: '#8bc34a',
    actor: '#ce93d8',
    threat: '#ef5350',
    alert: '#00e5ff',
    event: '#78909c',
};

const TYPE_ICON = {
    ip: '🌐',
    domain: '🔗',
    user: '👤',
    malware: '🦠',
    asset: '🖥️',
    device: '📟',
    incident: '🧭',
    actor: '🕵️',
    threat: '⚠️',
    alert: '🚨',
    event: '📡',
};

function hashSeed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return Math.abs(h >>> 0);
}

function seededRand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function nodeRadius(type, weight = 1) {
    const base = {
        ip: 0.16,
        domain: 0.15,
        user: 0.16,
        malware: 0.18,
        asset: 0.17,
        device: 0.16,
        incident: 0.2,
        actor: 0.18,
        threat: 0.2,
        alert: 0.16,
        event: 0.13,
    }[type] || 0.12;
    return Math.min(0.32, base + Math.min(0.12, Number(weight || 1) * 0.01));
}

function computeForceLayout(nodes = [], edges = []) {
    const nodeById = new Map();
    const types = Array.from(new Set(nodes.map((n) => n.type || 'event'))).sort();
    const typeCenter = new Map();

    types.forEach((t, i) => {
        const a = (i / Math.max(1, types.length)) * Math.PI * 2;
        typeCenter.set(t, {
            x: Math.cos(a) * 3.2,
            y: Math.sin(a) * 1.1,
            z: Math.sin(a) * 3.2,
        });
    });

    nodes.forEach((n) => {
        const t = n.type || 'event';
        const c = typeCenter.get(t) || { x: 0, y: 0, z: 0 };
        const seed = hashSeed(String(n.id));
        nodeById.set(n.id, {
            ...n,
            x: c.x + (seededRand(seed + 1) - 0.5) * 0.8,
            y: c.y + (seededRand(seed + 2) - 0.5) * 0.8,
            z: c.z + (seededRand(seed + 3) - 0.5) * 0.8,
            vx: 0,
            vy: 0,
            vz: 0,
        });
    });

    const edgePairs = edges
        .map((e) => [nodeById.get(e.source), nodeById.get(e.target)])
        .filter((pair) => pair[0] && pair[1]);

    const iterations = 130;
    const repulsion = 0.11;
    const spring = 0.045;
    const springLen = 1.15;
    const clusterPull = 0.018;
    const damping = 0.86;

    const arr = Array.from(nodeById.values());

    for (let iter = 0; iter < iterations; iter += 1) {
        for (let i = 0; i < arr.length; i += 1) {
            for (let j = i + 1; j < arr.length; j += 1) {
                const a = arr[i];
                const b = arr[j];
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let dz = a.z - b.z;
                const distSq = Math.max(0.04, dx * dx + dy * dy + dz * dz);
                const dist = Math.sqrt(distSq);
                const force = repulsion / distSq;
                dx /= dist;
                dy /= dist;
                dz /= dist;
                a.vx += dx * force;
                a.vy += dy * force;
                a.vz += dz * force;
                b.vx -= dx * force;
                b.vy -= dy * force;
                b.vz -= dz * force;
            }
        }

        edgePairs.forEach(([s, t]) => {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dz = t.z - s.z;
            const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy + dz * dz));
            const stretch = dist - springLen;
            const fx = (dx / dist) * stretch * spring;
            const fy = (dy / dist) * stretch * spring;
            const fz = (dz / dist) * stretch * spring;
            s.vx += fx;
            s.vy += fy;
            s.vz += fz;
            t.vx -= fx;
            t.vy -= fy;
            t.vz -= fz;
        });

        arr.forEach((n) => {
            const c = typeCenter.get(n.type || 'event') || { x: 0, y: 0, z: 0 };
            n.vx += (c.x - n.x) * clusterPull;
            n.vy += (c.y - n.y) * clusterPull;
            n.vz += (c.z - n.z) * clusterPull;

            n.vx *= damping;
            n.vy *= damping;
            n.vz *= damping;
            n.x += n.vx;
            n.y += n.vy;
            n.z += n.vz;
        });
    }

    return nodeById;
}

function EdgeLines({ edges, nodeMap }) {
    return (
        <group>
            {edges.map((e, i) => {
                const s = nodeMap.get(e.source);
                const t = nodeMap.get(e.target);
                if (!s || !t) return null;
                return (
                    <line key={`edge-${i}`}>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                args={[
                                    new Float32Array([s.x, s.y, s.z, t.x, t.y, t.z]),
                                    3,
                                ]}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial color="#2b556688" transparent opacity={0.9} />
                    </line>
                );
            })}
        </group>
    );
}

function Nodes3D({ nodeMap, selectedId, onSelect, draggedId, setDraggedId, setOverride }) {
    const nodes = Array.from(nodeMap.values());
    return (
        <group>
            {nodes.map((n) => {
                const selected = n.id === selectedId;
                const color = TYPE_COLOR[n.type] || '#90a4ae';
                const r = nodeRadius(n.type, n.weight);
                return (
                    <group
                        key={n.id}
                        position={[n.x, n.y, n.z]}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(n);
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setDraggedId(n.id);
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            setDraggedId('');
                        }}
                        onPointerMove={(e) => {
                            if (draggedId !== n.id) return;
                            e.stopPropagation();
                            const mx = e.movementX || e.nativeEvent?.movementX || 0;
                            const my = e.movementY || e.nativeEvent?.movementY || 0;
                            setOverride((prev) => {
                                const p = prev[n.id] || { x: n.x, y: n.y, z: n.z };
                                return {
                                    ...prev,
                                    [n.id]: {
                                        x: p.x + mx * 0.01,
                                        y: p.y - my * 0.01,
                                        z: p.z,
                                    },
                                };
                            });
                        }}
                    >
                        <mesh>
                            <sphereGeometry args={[r, 20, 20]} />
                            <meshStandardMaterial
                                color={selected ? '#ffffff' : color}
                                emissive={selected ? color : '#000000'}
                                emissiveIntensity={selected ? 0.9 : 0.3}
                            />
                        </mesh>
                        <Text
                            position={[0, 0, 0]}
                            color="#e8f5ff"
                            fontSize={Math.max(0.08, r * 0.55)}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {TYPE_ICON[n.type] || '•'}
                        </Text>
                        {selected && (
                            <Text
                                position={[0, r + 0.22, 0]}
                                color="#e3f2fd"
                                fontSize={0.15}
                                anchorX="center"
                                anchorY="middle"
                                maxWidth={3}
                            >
                                {n.label}
                            </Text>
                        )}
                    </group>
                );
            })}
        </group>
    );
}

export default function ThreatInvestigationGraph3D() {
    const { getHeaders } = useAuth();
    const [graph, setGraph] = useState({ nodes: [], edges: [], meta: {} });
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeDetails, setNodeDetails] = useState(null);

    const [indicatorType, setIndicatorType] = useState('all');
    const [hours, setHours] = useState(24);
    const [severity, setSeverity] = useState('all');
    const [incidentId, setIncidentId] = useState('');
    const [timelineCursor, setTimelineCursor] = useState(100);

    const [insights, setInsights] = useState(null);
    const [attribution, setAttribution] = useState(null);
    const [draggedId, setDraggedId] = useState('');
    const [nodeOverride, setNodeOverride] = useState({});

    const [snapshotName, setSnapshotName] = useState('');
    const [snapshots, setSnapshots] = useState([]);
    const [leftSnapshot, setLeftSnapshot] = useState('');
    const [rightSnapshot, setRightSnapshot] = useState('');
    const [snapshotCompare, setSnapshotCompare] = useState(null);

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const buildParams = () => {
        const params = new URLSearchParams({
            indicator_type: indicatorType,
            hours: String(hours),
            severity,
            timeline_cursor: String(timelineCursor),
            limit: '400',
        });
        if (incidentId.trim()) params.set('incident_id', incidentId.trim());
        return params;
    };

    const loadSnapshots = () => {
        fetch(`${API_BASE}/api/investigation/snapshot/list`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setSnapshots(Array.isArray(data) ? data : []))
            .catch(() => setSnapshots([]));
    };

    const refresh = () => {
        const params = buildParams();
        fetch(`${API_BASE}/api/investigation/graph-data?${params.toString()}`, { headers: getHeaders() })
            .then((r) => r.json())
            .then((data) => {
                setGraph({
                    nodes: Array.isArray(data.nodes) ? data.nodes : [],
                    edges: Array.isArray(data.edges) ? data.edges : [],
                    meta: data.meta || {},
                });
                setNodeOverride({});
                setError('');
            })
            .catch(() => setError('Unable to load 3D graph data.'));

        fetch(`${API_BASE}/api/investigation/graph-insights?${params.toString()}`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setInsights(data))
            .catch(() => setInsights(null));
    };

    const runAttribution = () => {
        const params = new URLSearchParams({ hours: String(hours) });
        if (incidentId.trim()) params.set('incident_id', incidentId.trim());
        fetch(`${API_BASE}/api/threat-actor/attribution?${params.toString()}`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setAttribution(data))
            .catch(() => setAttribution(null));
    };

    const saveSnapshot = () => {
        const params = buildParams();
        params.set('name', snapshotName.trim() || `snapshot_${Date.now()}`);
        fetch(`${API_BASE}/api/investigation/snapshot/save?${params.toString()}`, { method: 'POST', headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data) {
                    setMessage('Snapshot save failed.');
                    return;
                }
                setMessage(`Snapshot saved: ${data.name}`);
                setSnapshotName('');
                loadSnapshots();
            })
            .catch(() => setMessage('Snapshot save failed.'));
    };

    const compareSnapshots = () => {
        if (!leftSnapshot || !rightSnapshot) return;
        fetch(`${API_BASE}/api/investigation/snapshot/compare/${encodeURIComponent(leftSnapshot)}/${encodeURIComponent(rightSnapshot)}`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setSnapshotCompare(data))
            .catch(() => setSnapshotCompare(null));
    };

    useEffect(() => {
        refresh();
        runAttribution();
        loadSnapshots();
        const id = setInterval(refresh, 20000);
        return () => clearInterval(id);
        // intentionally tied to filters
    }, [indicatorType, hours, severity, incidentId, timelineCursor]);

    useEffect(() => {
        if (!selectedNode?.id) {
            setNodeDetails(null);
            return;
        }
        fetch(`${API_BASE}/investigation-graph/node/${encodeURIComponent(selectedNode.id)}`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setNodeDetails(data))
            .catch(() => setNodeDetails(null));
    }, [selectedNode]);

    const filteredNodes = useMemo(() => graph.nodes, [graph.nodes]);
    const filteredSet = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
    const filteredEdges = useMemo(
        () => graph.edges.filter((e) => filteredSet.has(e.source) && filteredSet.has(e.target)),
        [graph.edges, filteredSet],
    );

    const positionedMap = useMemo(() => {
        const base = computeForceLayout(filteredNodes, filteredEdges);
        Object.entries(nodeOverride).forEach(([nodeId, pos]) => {
            if (base.has(nodeId)) {
                const n = base.get(nodeId);
                base.set(nodeId, { ...n, ...pos });
            }
        });
        return base;
    }, [filteredNodes, filteredEdges, nodeOverride]);

    const expandNode = () => {
        if (!selectedNode?.id) return;
        fetch(`${API_BASE}/api/investigation/graph-expand/${encodeURIComponent(selectedNode.id)}?hours=${hours}`, { headers: getHeaders() })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data) return;
                const mergedNodes = [...graph.nodes];
                const seen = new Set(mergedNodes.map((n) => n.id));
                (data.nodes || []).forEach((n) => {
                    if (!seen.has(n.id)) {
                        mergedNodes.push(n);
                        seen.add(n.id);
                    }
                });
                const mergedEdges = [...graph.edges, ...(data.edges || [])];
                setGraph((prev) => ({
                    ...prev,
                    nodes: mergedNodes,
                    edges: mergedEdges,
                    meta: {
                        ...(prev.meta || {}),
                        node_count: mergedNodes.length,
                        edge_count: mergedEdges.length,
                    },
                }));
            })
            .catch(() => setError('Node expansion failed.'));
    };

    return (
        <section
            style={{
                background: '#060c14',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 14,
                margin: '12px 0',
                color: '#d0e8ff',
                fontFamily: 'JetBrains Mono, monospace',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ color: '#29b6f6', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.84rem' }}>
                    3D THREAT INVESTIGATION GRAPH (Force-Directed)
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.68rem', padding: '3px 6px' }}>
                        <option value={1}>Last 1h</option>
                        <option value={6}>Last 6h</option>
                        <option value={24}>Last 24h</option>
                        <option value={72}>Last 72h</option>
                        <option value={168}>Last 7d</option>
                    </select>
                    <select value={indicatorType} onChange={(e) => setIndicatorType(e.target.value)} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.68rem', padding: '3px 6px' }}>
                        <option value="all">All entities</option>
                        {(graph.meta.node_types || []).map((t) => (
                            <option value={t} key={t}>{t}</option>
                        ))}
                    </select>
                    <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.68rem', padding: '3px 6px' }}>
                        <option value="all">All severity</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                    </select>
                    <input value={incidentId} onChange={(e) => setIncidentId(e.target.value)} placeholder="Incident ID" style={{ width: 120, background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.68rem', padding: '3px 6px' }} />
                    <button onClick={refresh} style={{ background: 'transparent', border: '1px solid #29b6f6', borderRadius: 4, color: '#29b6f6', cursor: 'pointer', fontSize: '0.72rem', padding: '3px 10px' }}>↺ Refresh</button>
                </div>
            </div>

            <div style={{ fontSize: '0.66rem', color: '#78909c', marginBottom: 8 }}>
                Nodes: {graph.meta.node_count || filteredNodes.length} · Edges: {graph.meta.edge_count || filteredEdges.length}
            </div>

            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.62rem', color: '#6e8b99', marginBottom: 3 }}>Timeline overlay: {timelineCursor}%</div>
                <input type="range" min={1} max={100} value={timelineCursor} onChange={(e) => setTimelineCursor(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div style={{ height: 420, border: '1px solid #1a3a4a', borderRadius: 8, overflow: 'hidden', background: '#030a12' }}>
                <Canvas camera={{ position: [0, 3.0, 7.2], fov: 50 }}>
                    <ambientLight intensity={0.52} />
                    <pointLight position={[6, 8, 6]} intensity={1.2} />
                    <pointLight position={[-5, -2, -5]} intensity={0.62} color="#29b6f6" />

                    <EdgeLines edges={filteredEdges} nodeMap={positionedMap} />
                    <Nodes3D
                        nodeMap={positionedMap}
                        selectedId={selectedNode?.id || ''}
                        onSelect={(n) => setSelectedNode(n)}
                        draggedId={draggedId}
                        setDraggedId={setDraggedId}
                        setOverride={setNodeOverride}
                    />

                    <OrbitControls enablePan enableRotate enableZoom autoRotate autoRotateSpeed={0.3} />
                </Canvas>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 }}>
                {Object.entries(TYPE_COLOR).map(([k, c]) => (
                    <span key={k} style={{ fontSize: '0.62rem', color: c, border: `1px solid ${c}66`, borderRadius: 999, padding: '2px 8px' }}>
                        {TYPE_ICON[k] || '•'} {k}
                    </span>
                ))}
            </div>

            {selectedNode && (
                <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, fontSize: '0.7rem' }}>
                    <div style={{ color: '#29b6f6', marginBottom: 4 }}>Selected: {selectedNode.label} ({selectedNode.type})</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <button onClick={expandNode} style={{ background: 'transparent', border: '1px solid #66bb6a66', color: '#66bb6a', borderRadius: 4, cursor: 'pointer', fontSize: '0.66rem', padding: '3px 8px' }}>
                            Expand Node
                        </button>
                    </div>
                    {nodeDetails ? (
                        <div style={{ color: '#9fc3d7', fontSize: '0.66rem' }}>
                            <div><b>Indicator:</b> {nodeDetails.indicator_value || nodeDetails.node_id || selectedNode.id}</div>
                            <div><b>First seen:</b> {nodeDetails.first_seen || 'n/a'}</div>
                            <div><b>Last seen:</b> {nodeDetails.last_seen || 'n/a'}</div>
                            <div><b>Related alerts:</b> {(nodeDetails.related_alerts || []).length}</div>
                            <div><b>Associated incidents:</b> {(nodeDetails.associated_incidents || nodeDetails.related_incidents || []).length}</div>
                        </div>
                    ) : (
                        <div style={{ color: '#607d8b' }}>Loading related entities…</div>
                    )}
                </div>
            )}

            <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, marginTop: 8 }}>
                <div style={{ color: '#ab47bc', fontSize: '0.73rem', marginBottom: 6 }}>AI Insight Panel</div>
                {insights ? (
                    <div style={{ fontSize: '0.66rem', color: '#b7d5e6' }}>
                        <div style={{ marginBottom: 5 }}><b>Possible attack paths:</b></div>
                        <ul style={{ marginTop: 0 }}>
                            {(insights.possible_attack_paths || []).slice(0, 6).map((p, idx) => (
                                <li key={`path-${idx}`}>{p}</li>
                            ))}
                        </ul>
                        <div style={{ marginBottom: 5 }}><b>Suspicious clusters:</b></div>
                        <ul style={{ marginTop: 0 }}>
                            {(insights.suspicious_clusters || []).slice(0, 6).map((c, idx) => (
                                <li key={`cluster-${idx}`}>{c.label || c.node} ({c.type}) degree={c.degree}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div style={{ color: '#607d8b', fontSize: '0.66rem' }}>No AI insight available for current filter set.</div>
                )}
            </div>

            <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ color: '#80cbc4', fontSize: '0.73rem' }}>AI Threat Actor Attribution Engine</div>
                    <button onClick={runAttribution} style={{ background: 'transparent', border: '1px solid #80cbc477', color: '#80cbc4', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: '0.66rem' }}>
                        Run Attribution
                    </button>
                </div>
                {attribution?.top_actor ? (
                    <div style={{ fontSize: '0.66rem', color: '#b7d5e6' }}>
                        <div><b>Top candidate:</b> {attribution.top_actor.actor} (confidence {Math.round((attribution.top_actor.confidence || 0) * 100)}%)</div>
                        <div style={{ marginTop: 4, color: '#90a4ae' }}>{attribution.top_actor.description}</div>
                        <ul style={{ marginTop: 6 }}>
                            {(attribution.candidates || []).slice(0, 4).map((c) => (
                                <li key={c.actor}>{c.actor} — score {c.raw_score} / conf {Math.round((c.confidence || 0) * 100)}%</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div style={{ color: '#607d8b', fontSize: '0.66rem' }}>No attribution result yet.</div>
                )}
            </div>

            <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, marginTop: 8 }}>
                <div style={{ color: '#ffd180', fontSize: '0.73rem', marginBottom: 6 }}>Rescue Snapshot Compare (Side-by-Side)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <input
                        value={snapshotName}
                        onChange={(e) => setSnapshotName(e.target.value)}
                        placeholder="Snapshot name"
                        style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.66rem', padding: '3px 6px' }}
                    />
                    <button onClick={saveSnapshot} style={{ background: 'transparent', border: '1px solid #ffd18077', color: '#ffd180', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: '0.66rem' }}>
                        Save Snapshot
                    </button>
                    <button onClick={loadSnapshots} style={{ background: 'transparent', border: '1px solid #90caf977', color: '#90caf9', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: '0.66rem' }}>
                        Refresh List
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <select value={leftSnapshot} onChange={(e) => setLeftSnapshot(e.target.value)} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.66rem', padding: '3px 6px' }}>
                        <option value="">Left snapshot</option>
                        {snapshots.map((s) => (
                            <option key={`l-${s.id}`} value={s.id}>{s.name} ({s.created_at})</option>
                        ))}
                    </select>
                    <select value={rightSnapshot} onChange={(e) => setRightSnapshot(e.target.value)} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 4, fontSize: '0.66rem', padding: '3px 6px' }}>
                        <option value="">Right snapshot</option>
                        {snapshots.map((s) => (
                            <option key={`r-${s.id}`} value={s.id}>{s.name} ({s.created_at})</option>
                        ))}
                    </select>
                    <button onClick={compareSnapshots} disabled={!leftSnapshot || !rightSnapshot} style={{ background: 'transparent', border: '1px solid #64b5f677', color: '#64b5f6', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: '0.66rem' }}>
                        Compare Side-by-Side
                    </button>
                </div>

                {snapshotCompare && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ border: '1px solid #1a3a4a', borderRadius: 6, padding: 6 }}>
                            <div style={{ color: '#90caf9', fontSize: '0.66rem' }}><b>Left:</b> {snapshotCompare.left?.name}</div>
                            <div style={{ fontSize: '0.64rem', color: '#a6c6d6' }}>
                                Nodes: {snapshotCompare.left?.payload?.meta?.node_count || snapshotCompare.left?.payload?.nodes?.length || 0}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: '#a6c6d6' }}>
                                Edges: {snapshotCompare.left?.payload?.meta?.edge_count || snapshotCompare.left?.payload?.edges?.length || 0}
                            </div>
                        </div>
                        <div style={{ border: '1px solid #1a3a4a', borderRadius: 6, padding: 6 }}>
                            <div style={{ color: '#ffcc80', fontSize: '0.66rem' }}><b>Right:</b> {snapshotCompare.right?.name}</div>
                            <div style={{ fontSize: '0.64rem', color: '#a6c6d6' }}>
                                Nodes: {snapshotCompare.right?.payload?.meta?.node_count || snapshotCompare.right?.payload?.nodes?.length || 0}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: '#a6c6d6' }}>
                                Edges: {snapshotCompare.right?.payload?.meta?.edge_count || snapshotCompare.right?.payload?.edges?.length || 0}
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / span 2', fontSize: '0.64rem', color: '#b0bec5' }}>
                            + New nodes in right: {(snapshotCompare.diff?.new_nodes_in_right || []).length} ·
                            - Removed: {(snapshotCompare.diff?.removed_nodes_from_right || []).length} ·
                            + New edges in right: {(snapshotCompare.diff?.new_edges_in_right || []).length}
                        </div>
                    </div>
                )}
            </div>

            {message && <div style={{ color: '#90caf9', marginTop: 6, fontSize: '0.68rem' }}>{message}</div>}
            {error && <div style={{ color: '#ff8a80', marginTop: 6, fontSize: '0.7rem' }}>{error}</div>}
        </section>
    );
}
