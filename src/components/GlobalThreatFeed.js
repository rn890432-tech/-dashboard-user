// GlobalThreatFeed — Live scrolling threat event ticker powered by /threats API
import React, { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'http://localhost:8000';

const SEVERITY_COLOR = {
    critical: '#ff1744',
    high: '#ff5722',
    medium: '#ffc107',
    low: '#4caf50',
    info: '#29b6f6',
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function SeverityBadge({ severity }) {
    const s = (severity || 'info').toLowerCase();
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 4,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: SEVERITY_COLOR[s] || '#607d8b',
                color: '#fff',
                marginRight: 8,
                flexShrink: 0,
            }}
        >
            {s}
        </span>
    );
}

export default function GlobalThreatFeed() {
    const [threats, setThreats] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newIds, setNewIds] = useState(new Set());
    const prevIdsRef = useRef(new Set());
    const timerRef = useRef(null);

    const updateThreatStatus = useCallback((threatId, nextStatus) => {
        fetch(`${API_BASE}/threats/${threatId}/status?status=${encodeURIComponent(nextStatus)}`, {
            method: 'PATCH',
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(() => {
                setThreats((prev) => prev.map((t) => (t.id === threatId ? { ...t, status: nextStatus } : t)));
            })
            .catch(() => {
                // no-op: polling will reconcile; keep UX smooth
            });
    }, []);

    const fetchThreats = useCallback(() => {
        fetch(`${API_BASE}/threats`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.threats || []);
                // Sort by severity then timestamp desc
                list.sort((a, b) => {
                    const as = (a.severity || 'info').toLowerCase();
                    const bs = (b.severity || 'info').toLowerCase();
                    const sd = (SEVERITY_ORDER[as] ?? 99) - (SEVERITY_ORDER[bs] ?? 99);
                    if (sd !== 0) return sd;
                    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
                const incoming = new Set(list.map((t) => t.id));
                const fresh = new Set([...incoming].filter((id) => !prevIdsRef.current.has(id)));
                prevIdsRef.current = incoming;
                setNewIds(fresh);
                setThreats(list);
                setLoading(false);
                setError(null);
                if (fresh.size > 0) {
                    setTimeout(() => setNewIds(new Set()), 2000);
                }
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchThreats();
        timerRef.current = setInterval(fetchThreats, 8000);
        return () => clearInterval(timerRef.current);
    }, [fetchThreats]);

    const severities = ['all', 'critical', 'high', 'medium', 'low', 'info'];
    const visible = filter === 'all'
        ? threats
        : threats.filter((t) => (t.severity || 'info').toLowerCase() === filter);

    return (
        <div
            style={{
                background: '#060c14',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 16,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#d0e8ff',
                margin: '16px 0',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.65rem', color: '#ff5252', animation: 'pulse 1.4s infinite' }}>●</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#29b6f6', letterSpacing: '0.1em' }}>
                        GLOBAL THREAT FEED
                    </span>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            background: '#0d2b3e',
                            border: '1px solid #1a3a4a',
                            borderRadius: 4,
                            padding: '2px 8px',
                            color: '#78c8e8',
                        }}
                    >
                        {visible.length} events
                    </span>
                </div>
                <button
                    onClick={fetchThreats}
                    style={{
                        background: 'transparent',
                        border: '1px solid #29b6f6',
                        borderRadius: 4,
                        color: '#29b6f6',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                    }}
                >
                    ↺ Refresh
                </button>
            </div>

            {/* Severity filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {severities.map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            background: filter === s ? (SEVERITY_COLOR[s] || '#29b6f6') : 'transparent',
                            border: `1px solid ${SEVERITY_COLOR[s] || '#29b6f6'}`,
                            borderRadius: 12,
                            color: filter === s ? '#fff' : (SEVERITY_COLOR[s] || '#29b6f6'),
                            cursor: 'pointer',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '2px 10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Feed list */}
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {loading && (
                    <div style={{ textAlign: 'center', color: '#29b6f6', padding: 24 }}>Loading threats…</div>
                )}
                {error && (
                    <div style={{ color: '#ff5252', fontSize: '0.8rem', padding: 12 }}>
                        ⚠ API error: {error}
                        <div style={{ color: '#607d8b', fontSize: '0.7rem', marginTop: 4 }}>
                            Ensure the backend is running at {API_BASE}
                        </div>
                    </div>
                )}
                {!loading && !error && visible.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#607d8b', padding: 24 }}>No threats detected.</div>
                )}
                {!loading && visible.map((t) => {
                    const isNew = newIds.has(t.id);
                    const ts = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '—';
                    const status = (t.status || 'open').toLowerCase();
                    return (
                        <div
                            key={t.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                padding: '8px 10px',
                                borderRadius: 6,
                                marginBottom: 6,
                                borderLeft: `3px solid ${SEVERITY_COLOR[(t.severity || 'info').toLowerCase()] || '#607d8b'}`,
                                background: isNew ? 'rgba(41,182,246,0.08)' : 'rgba(255,255,255,0.03)',
                                transition: 'background 0.5s',
                            }}
                        >
                            <SeverityBadge severity={t.severity} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        color: '#e8f4ff',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {t.threat_name || t.title || t.name || `Threat #${t.id}`}
                                </div>
                                {t.description && (
                                    <div
                                        style={{
                                            fontSize: '0.72rem',
                                            color: '#8ab4c7',
                                            marginTop: 2,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {t.description}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div
                                    style={{
                                        fontSize: '0.68rem',
                                        color: '#546e7a',
                                        marginBottom: 2,
                                    }}
                                >
                                    {ts}
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '1px 6px',
                                        borderRadius: 3,
                                        background:
                                            status === 'open'
                                                ? 'rgba(255,82,82,0.15)'
                                                : status === 'resolved'
                                                    ? 'rgba(76,175,80,0.15)'
                                                    : 'rgba(97,97,97,0.15)',
                                        color:
                                            status === 'open'
                                                ? '#ff5252'
                                                : status === 'resolved'
                                                    ? '#4caf50'
                                                    : '#9e9e9e',
                                        border: `1px solid ${status === 'open' ? '#ff525244' : status === 'resolved' ? '#4caf5044' : '#9e9e9e44'}`,
                                    }}
                                >
                                    {status}
                                </span>
                                <div style={{ marginTop: 5, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                    {status !== 'investigating' && (
                                        <button
                                            onClick={() => updateThreatStatus(t.id, 'investigating')}
                                            style={{
                                                fontSize: '0.6rem',
                                                padding: '1px 6px',
                                                background: 'transparent',
                                                border: '1px solid #ffc10766',
                                                borderRadius: 3,
                                                color: '#ffc107',
                                                cursor: 'pointer',
                                            }}
                                            title="Mark investigating"
                                        >
                                            investigate
                                        </button>
                                    )}
                                    {status !== 'resolved' && (
                                        <button
                                            onClick={() => updateThreatStatus(t.id, 'resolved')}
                                            style={{
                                                fontSize: '0.6rem',
                                                padding: '1px 6px',
                                                background: 'transparent',
                                                border: '1px solid #4caf5066',
                                                borderRadius: 3,
                                                color: '#4caf50',
                                                cursor: 'pointer',
                                            }}
                                            title="Mark resolved"
                                        >
                                            resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    );
}
