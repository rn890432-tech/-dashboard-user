import React, { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'http://localhost:8000';

const KPI_STYLE = {
    base: {
        background: '#060c14',
        border: '1px solid #1a3a4a',
        borderRadius: 10,
        padding: '12px 14px',
        minWidth: 130,
        flex: '1 1 130px',
    },
    label: {
        color: '#78909c',
        fontSize: '0.68rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
    },
    value: {
        color: '#d0e8ff',
        fontSize: '1.15rem',
        fontWeight: 700,
    },
};

function Kpi({ label, value, color = '#d0e8ff' }) {
    return (
        <div style={KPI_STYLE.base}>
            <div style={KPI_STYLE.label}>{label}</div>
            <div style={{ ...KPI_STYLE.value, color }}>{value}</div>
        </div>
    );
}

export default function DashboardKpiStrip() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    const fetchStats = useCallback(() => {
        fetch(`${API_BASE}/dashboard/stats`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                setStats(data);
                setLoading(false);
                setError(null);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchStats();
        timerRef.current = setInterval(fetchStats, 8000);
        return () => clearInterval(timerRef.current);
    }, [fetchStats]);

    return (
        <section
            style={{
                margin: '14px 0 10px',
                fontFamily: 'JetBrains Mono, monospace',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: '#29b6f6', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.85rem' }}>
                    SOC LIVE METRICS
                </div>
                <button
                    onClick={fetchStats}
                    style={{
                        background: 'transparent',
                        border: '1px solid #29b6f6',
                        borderRadius: 4,
                        color: '#29b6f6',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        padding: '2px 10px',
                    }}
                >
                    ↺ Refresh
                </button>
            </div>

            {loading && (
                <div style={{ color: '#29b6f6', fontSize: '0.8rem', padding: '8px 2px' }}>
                    Loading metrics…
                </div>
            )}

            {error && (
                <div style={{ color: '#ff5252', fontSize: '0.8rem', padding: '8px 2px' }}>
                    Metrics unavailable: {error}
                </div>
            )}

            {!loading && !error && stats && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Kpi label="Total Threats" value={stats.total_threats ?? 0} />
                    <Kpi label="Open Threats" value={stats.open_threats ?? 0} color="#ff5252" />
                    <Kpi label="Critical Threats" value={stats.critical_threats ?? 0} color="#ff1744" />
                    <Kpi label="Total Incidents" value={stats.total_incidents ?? 0} />
                    <Kpi label="Open Incidents" value={stats.open_incidents ?? 0} color="#ffc107" />
                    <Kpi label="Audit Entries" value={stats.audit_entries ?? 0} color="#29b6f6" />
                </div>
            )}
        </section>
    );
}
