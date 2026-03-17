import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/stream';

function Pill({ children, color = '#29b6f6' }) {
    return (
        <span
            style={{
                border: `1px solid ${color}66`,
                color,
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.67rem',
                fontFamily: 'JetBrains Mono, monospace',
            }}
        >
            {children}
        </span>
    );
}

export default function TelemetryIntelLivePanel() {
    const [alerts, setAlerts] = useState([]);
    const [analytics, setAnalytics] = useState({
        attack_volume_over_time: [],
        top_attacking_ips: [],
        most_targeted_assets: [],
        threat_intel_matches: [],
    });
    const [wsState, setWsState] = useState('disconnected');
    const timerRef = useRef(null);

    const refresh = useCallback(() => {
        Promise.all([
            fetch(`${API_BASE}/api/alerts/live?limit=20`).then((r) => r.json()),
            fetch(`${API_BASE}/api/analytics/summary`).then((r) => r.json()),
        ])
            .then(([alertData, analyticsData]) => {
                setAlerts(Array.isArray(alertData) ? alertData : []);
                setAnalytics(analyticsData || {});
            })
            .catch(() => {
                // keep stale state; websocket may still stream
            });
    }, []);

    const updateFeeds = useCallback(() => {
        fetch(`${API_BASE}/api/threat-intel/update`)
            .then(() => refresh())
            .catch(() => {
                // ignore and keep UI stable
            });
    }, [refresh]);

    useEffect(() => {
        refresh();
        timerRef.current = setInterval(refresh, 12000);
        return () => clearInterval(timerRef.current);
    }, [refresh]);

    useEffect(() => {
        let ws;
        try {
            ws = new WebSocket(WS_URL);
            ws.onopen = () => {
                setWsState('connected');
                ws.send('ping');
            };
            ws.onclose = () => setWsState('disconnected');
            ws.onerror = () => setWsState('error');
            ws.onmessage = (msg) => {
                try {
                    const parsed = JSON.parse(msg.data);
                    if (parsed.event === 'new_alert' && parsed.data) {
                        setAlerts((prev) => [parsed.data, ...prev].slice(0, 30));
                    }
                    if (parsed.event === 'new_indicator' || parsed.event === 'incident_created') {
                        refresh();
                    }
                } catch {
                    // ignore malformed stream payloads
                }
            };
        } catch {
            setWsState('error');
        }
        return () => {
            if (ws && ws.readyState <= 1) ws.close();
        };
    }, [refresh]);

    const connectionPill = useMemo(() => {
        if (wsState === 'connected') return <Pill color="#4caf50">WS LIVE</Pill>;
        if (wsState === 'error') return <Pill color="#ff5252">WS ERROR</Pill>;
        return <Pill color="#607d8b">WS OFFLINE</Pill>;
    }, [wsState]);

    return (
        <section
            style={{
                background: '#060c14',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 14,
                margin: '12px 0',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#d0e8ff',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#29b6f6', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.84rem' }}>
                        THREAT INTEL & TELEMETRY LIVE
                    </span>
                    {connectionPill}
                </div>
                <button
                    onClick={refresh}
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
                <button
                    onClick={updateFeeds}
                    style={{
                        background: 'transparent',
                        border: '1px solid #8bc34a',
                        borderRadius: 4,
                        color: '#8bc34a',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        marginLeft: 8,
                    }}
                >
                    Update TI Feeds
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, minHeight: 185 }}>
                    <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 6 }}>Live Alert Feed</div>
                    <div style={{ maxHeight: 170, overflowY: 'auto' }}>
                        {alerts.length === 0 && <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No alerts yet.</div>}
                        {alerts.map((a) => (
                            <div key={a.id} style={{ borderLeft: '3px solid #ff5252', padding: '4px 8px', marginBottom: 6, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                                <div style={{ fontSize: '0.74rem', color: '#e8f4ff' }}>{a.alert_type} · {a.severity}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8ab4c7' }}>{a.matched_indicator}</div>
                                <div style={{ fontSize: '0.66rem', color: '#546e7a' }}>{a.timestamp || 'live'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, minHeight: 185 }}>
                    <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 6 }}>Top Attacking IPs</div>
                    {(analytics.top_attacking_ips || []).map((r) => (
                        <div key={r.src_ip} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
                            <span>{r.src_ip}</span>
                            <span style={{ color: '#ff5252' }}>{r.count}</span>
                        </div>
                    ))}
                    {(analytics.top_attacking_ips || []).length === 0 && (
                        <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No telemetry yet.</div>
                    )}

                    <div style={{ color: '#78909c', fontSize: '0.72rem', margin: '10px 0 6px' }}>Most Targeted Assets</div>
                    {(analytics.most_targeted_assets || []).map((r) => (
                        <div key={r.asset} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
                            <span>{r.asset}</span>
                            <span style={{ color: '#ffc107' }}>{r.count}</span>
                        </div>
                    ))}
                    {(analytics.most_targeted_assets || []).length === 0 && (
                        <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No asset telemetry yet.</div>
                    )}
                </div>

                <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, minHeight: 185 }}>
                    <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 6 }}>Threat Intel Matches</div>
                    {(analytics.threat_intel_matches || []).map((r) => (
                        <div key={r.matched_indicator} style={{ fontSize: '0.71rem', marginBottom: 6 }}>
                            <div style={{ color: '#8ab4c7', wordBreak: 'break-all' }}>{r.matched_indicator}</div>
                            <div style={{ color: '#ff9800', fontSize: '0.68rem' }}>{r.count} matches</div>
                        </div>
                    ))}
                    {(analytics.threat_intel_matches || []).length === 0 && (
                        <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No IOC matches yet.</div>
                    )}
                </div>
            </div>
        </section>
    );
}
