/**
 * CommandCenterPage — SOC War Room View (full-screen real-time dashboard)
 *
 * Layout (desktop):
 * ┌──────────────────────────────────────────────────────────┐
 * │  TOP BAR: org · risk score · live clock · fullscreen btn  │
 * ├──────────────┬───────────────────────┬───────────────────┤
 * │  ALERT FEED  │   3D ATTACK GLOBE     │  STREAMING METRIC │
 * │  (left 22%)  │   (center 56%)        │  (right 22%)      │
 * ├──────────────┴───────────────────────┴───────────────────┤
 * │  AI SOC ANALYST INSIGHTS                (bottom 28%)     │
 * └──────────────────────────────────────────────────────────┘
 *
 * Responsive: stacks vertically on narrow screens.
 */
import React, {
    useEffect, useRef, useState, useCallback, memo,
} from 'react';
import { useAuth } from '../context/AuthContext';
import AlertFeedPanel from './AlertFeedPanel';
import AIInsightsPanel from './AIInsightsPanel';
import StreamingMetricsPanel from './StreamingMetricsPanel';
import GlobalLiveCyberAttackMap from './GlobalLiveCyberAttackMap';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const TICK_MS = 1_000;
const RISK_POLL_MS = 30_000;

/* ── RISK SCORE GAUGE ───────────────────────────────────────────────────── */
const RiskGauge = memo(function RiskGauge({ score, trend }) {
    const clamped = Math.min(10, Math.max(0, score ?? 0));
    const pct = clamped * 10;
    const color = clamped >= 8 ? '#ff1744' : clamped >= 5 ? '#ff6d00' : '#22c55e';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em' }}>RISK</div>
            <div style={{ width: 72, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`, height: '100%', background: color, borderRadius: 3,
                    boxShadow: `0 0 6px ${color}`,
                    transition: 'width 0.8s ease',
                }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace' }}>
                {clamped.toFixed(1)}
                {trend != null && (
                    <span style={{ fontSize: 9, marginLeft: 3, color: trend > 0 ? '#ff1744' : '#22c55e' }}>
                        {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'}
                    </span>
                )}
            </div>
        </div>
    );
});

/* ── LIVE CLOCK ─────────────────────────────────────────────────────────── */
function LiveClock() {
    const [now, setNow] = useState('');
    useEffect(() => {
        const tick = () => setNow(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' Z');
        tick();
        const t = setInterval(tick, TICK_MS);
        return () => clearInterval(t);
    }, []);
    return (
        <span style={{
            fontFamily: 'monospace', fontSize: 11, color: '#38bdf8',
            letterSpacing: '0.08em',
        }}>
            {now}
        </span>
    );
}

/* ── SECTION PANEL WRAPPER ──────────────────────────────────────────────── */
const Panel = memo(function Panel({ title, accentColor = '#38bdf8', children, style }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            background: '#050b18',
            border: `1px solid ${accentColor}22`,
            boxShadow: `inset 0 0 24px ${accentColor}08`,
            borderRadius: 4,
            overflow: 'hidden',
            ...style,
        }}>
            <div style={{
                padding: '5px 10px',
                background: `linear-gradient(90deg, ${accentColor}18 0%, transparent 100%)`,
                borderBottom: `1px solid ${accentColor}22`,
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.10em', color: accentColor, textTransform: 'uppercase',
                }}>
                    {title}
                </span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    );
});

/* ── FULLSCREEN TOGGLE ──────────────────────────────────────────────────── */
function useFullscreen(ref) {
    const [isFs, setIsFs] = useState(false);
    const toggle = useCallback(() => {
        if (!document.fullscreenElement) {
            ref.current?.requestFullscreen?.().catch(() => { });
        } else {
            document.exitFullscreen?.();
        }
    }, [ref]);
    useEffect(() => {
        const h = () => setIsFs(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, []);
    return { isFs, toggle };
}

/* ── STATUS INDICATOR ───────────────────────────────────────────────────── */
function StatusDot({ live }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b' }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: live ? '#22c55e' : '#ef4444',
                boxShadow: live ? '0 0 4px #22c55e' : 'none',
                animation: live ? 'ccPulse 1.8s ease-in-out infinite' : 'none',
                display: 'inline-block',
            }} />
            {live ? 'LIVE' : 'OFFLINE'}
        </span>
    );
}

/* ── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function CommandCenterPage() {
    const { user, getHeaders } = useAuth();
    const containerRef = useRef(null);
    const { isFs, toggle: toggleFs } = useFullscreen(containerRef);

    const [riskData, setRiskData] = useState(null);
    const [wsLive, setWsLive] = useState(false);
    const [narrow, setNarrow] = useState(window.innerWidth < 900);

    // Org display name
    const displayOrg = user?.organizationName || user?.orgId || 'SOC';

    // ── Risk score polling ─────────────────────────────────────────────────
    const fetchRisk = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/risk/executive-summary`, { headers: getHeaders() });
            if (res.ok) setRiskData(await res.json());
        } catch { /* silent */ }
    }, [getHeaders]);

    useEffect(() => {
        fetchRisk();
        const t = setInterval(fetchRisk, RISK_POLL_MS);
        return () => clearInterval(t);
    }, [fetchRisk]);

    // ── WebSocket liveness probe ───────────────────────────────────────────
    useEffect(() => {
        const wsUrl = (API.replace(/^http/, 'ws')) + '/ws/stream';
        let ws;
        let reconnectTimer;
        const connect = () => {
            try {
                ws = new WebSocket(wsUrl);
                ws.onopen = () => setWsLive(true);
                ws.onclose = () => { setWsLive(false); reconnectTimer = setTimeout(connect, 5000); };
                ws.onerror = () => { setWsLive(false); };
            } catch { setWsLive(false); }
        };
        connect();
        return () => {
            clearTimeout(reconnectTimer);
            ws?.close();
        };
    }, []);

    // ── Responsive narrowness ──────────────────────────────────────────────
    useEffect(() => {
        const obs = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 900));
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const riskScore = riskData?.overall_risk_score ?? riskData?.risk_score ?? null;
    const riskTrend = riskData?.trend ?? null;

    return (
        <>
            {/* Keyframe injection */}
            <style>{`
        @keyframes ccPulse {
          0%,100% { opacity:1; box-shadow: 0 0 4px #22c55e; }
          50%      { opacity:0.4; box-shadow: 0 0 0 #22c55e; }
        }
        .cc-panel-scroll::-webkit-scrollbar { width: 4px; }
        .cc-panel-scroll::-webkit-scrollbar-track  { background: #050b18; }
        .cc-panel-scroll::-webkit-scrollbar-thumb  { background: #1e293b; border-radius: 2px; }
      `}</style>

            <div
                ref={containerRef}
                style={{
                    display: 'flex', flexDirection: 'column',
                    width: '100vw', height: '100vh',
                    background: '#020812',
                    fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                }}
            >
                {/* ── TOP BAR ─────────────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '8px 16px',
                    background: 'linear-gradient(90deg, #050b18 0%, #0a1020 100%)',
                    borderBottom: '1px solid #1e293b',
                    flexShrink: 0,
                    flexWrap: 'wrap',
                }}>
                    {/* Logo / title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>🛡</span>
                        <span style={{
                            fontWeight: 800, fontSize: 13, letterSpacing: '0.15em',
                            color: '#38bdf8', textTransform: 'uppercase',
                        }}>
                            SOC Command Center
                        </span>
                    </div>

                    {/* Org name */}
                    <div style={{
                        fontSize: 11, color: '#64748b', borderLeft: '1px solid #1e293b', paddingLeft: 12,
                    }}>
                        {displayOrg}
                    </div>

                    {/* Risk gauge */}
                    {riskScore !== null && (
                        <RiskGauge score={riskScore} trend={riskTrend} />
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* WS liveness */}
                    <StatusDot live={wsLive} />

                    {/* Live clock */}
                    <LiveClock />

                    {/* Fullscreen toggle */}
                    <button
                        onClick={toggleFs}
                        title={isFs ? 'Exit fullscreen' : 'Enter fullscreen'}
                        style={{
                            background: '#1e293b', border: '1px solid #334155',
                            color: '#94a3b8', borderRadius: 4, padding: '4px 8px',
                            cursor: 'pointer', fontSize: 11,
                        }}
                    >
                        {isFs ? '⛶ Exit' : '⛶ Fullscreen'}
                    </button>

                    {/* Nav back */}
                    <a
                        href="/"
                        style={{
                            background: '#0f172a', border: '1px solid #334155',
                            color: '#64748b', borderRadius: 4, padding: '4px 8px',
                            textDecoration: 'none', fontSize: 11,
                        }}
                    >
                        ← Dashboard
                    </a>
                </div>

                {/* ── MAIN BODY ────────────────────────────────────────────────── */}
                <div style={{
                    flex: 1, display: 'flex',
                    flexDirection: narrow ? 'column' : 'row',
                    overflow: 'hidden',
                    gap: 4, padding: 4,
                }}>
                    {/* LEFT — Alert Feed */}
                    <Panel
                        title="⚡ Live Alert Feed"
                        accentColor="#ff6d00"
                        style={{ width: narrow ? '100%' : '22%', minWidth: narrow ? 'auto' : 200, flexShrink: 0 }}
                    >
                        <AlertFeedPanel />
                    </Panel>

                    {/* CENTER — columns: Globe + right side */}
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
                    }}>
                        {/* Globe */}
                        <Panel
                            title="🌐 Global Cyber Attack Map"
                            accentColor="#38bdf8"
                            style={{ flex: narrow ? 'none' : 1, height: narrow ? 360 : 'auto', minHeight: narrow ? 320 : 0 }}
                        >
                            <div style={{ width: '100%', height: '100%' }}>
                                <GlobalLiveCyberAttackMap />
                            </div>
                        </Panel>

                        {/* AI Insights — bottom strip in center column */}
                        <Panel
                            title="🧠 AI SOC Analyst Insights"
                            accentColor="#a78bfa"
                            style={{ height: narrow ? 'auto' : '32%', minHeight: 160, flexShrink: 0 }}
                        >
                            <div style={{ height: '100%', overflow: 'hidden' }}>
                                <AIInsightsPanel compact />
                            </div>
                        </Panel>
                    </div>

                    {/* RIGHT — Streaming Metrics */}
                    <Panel
                        title="📡 Pipeline Metrics"
                        accentColor="#22c55e"
                        style={{ width: narrow ? '100%' : '22%', minWidth: narrow ? 'auto' : 200, flexShrink: 0 }}
                    >
                        {/* StreamingMetricsPanel expects to fill container; we wrap with overflow */}
                        <div style={{
                            height: '100%',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                        }} className="cc-panel-scroll">
                            <StreamingMetricsPanel embedded />
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
}
