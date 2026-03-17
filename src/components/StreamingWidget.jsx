/**
 * StreamingWidget — compact streaming-pipeline summary card for the Dashboard.
 *
 * Features
 *  • Total EPS number + 60-sample memoised sparkline
 *  • Per-topic EPS chips with hover-tooltip depth info
 *  • DLQ depth badge (visible to all; "manage →" link for ADMIN+)
 *  • Worker liveness dot (green/red) — ADMIN/OWNER only
 *  • Hover tooltip: full EPS breakdown + last-update timestamp
 *  • Loading skeleton shimmer on first fetch
 *  • Error fallback with retry button
 *  • Stale-data warning on subsequent failures
 *  • 10 s polling; cleanup on unmount
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API           = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const POLL_INTERVAL = 10_000;
const MAX_HISTORY   = 60;

const TOPIC_COLOR = {
  telemetry_events: '#38bdf8',
  rule_evaluations: '#a78bfa',
  alerts_generated: '#f97316',
  graph_updates:    '#22c55e',
};

const TOPIC_ICON = {
  telemetry_events: '📡',
  rule_evaluations: '🔍',
  alerts_generated: '🚨',
  graph_updates:    '🕸',
};

// ── inject shimmer keyframes once ─────────────────────────────────────────────
function injectShimmer() {
  if (typeof document !== 'undefined' && !document.getElementById('sw-shimmer-css')) {
    const s = document.createElement('style');
    s.id = 'sw-shimmer-css';
    s.textContent = `
      @keyframes sw-pulse { 0%,100%{opacity:.3} 50%{opacity:.65} }
      .sw-skel { animation: sw-pulse 1.4s ease-in-out infinite;
                 background:#1e293b; border-radius:4px; }
    `;
    document.head.appendChild(s);
  }
}

// ── memoised sparkline ────────────────────────────────────────────────────────
const MiniSparkline = React.memo(function MiniSparkline({
  history, color, width = 72, height = 26,
}) {
  const pts = useMemo(() => {
    if (!history || history.length < 2) return null;
    const max = Math.max(...history, 0.01);
    return history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - (v / max) * (height - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [history, width, height]);

  if (!pts) return <svg width={width} height={height} />;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
});

// ── skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ w = '100%', h = 14, mt = 0 }) {
  return (
    <div
      className="sw-skel"
      style={{ width: w, height: h, marginTop: mt, display: 'inline-block' }}
    />
  );
}

// ── topic chip ────────────────────────────────────────────────────────────────
const TopicChip = React.memo(function TopicChip({ topic, eps, color, icon, tooltip }) {
  return (
    <div
      title={tooltip}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#1e293b', borderRadius: 4, padding: '3px 7px',
        fontSize: 10, color, border: `1px solid ${color}33`, whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span style={{ color: '#64748b' }}>{topic.split('_')[0]}</span>
      <span style={{ fontWeight: 700 }}>{eps}</span>
    </div>
  );
});

// ── main widget ───────────────────────────────────────────────────────────────
export default function StreamingWidget() {
  const { getHeaders, hasRole } = useAuth();
  const isPrivileged = hasRole('ADMIN'); // ADMIN (4) + OWNER (5)

  const [metrics, setMetrics]         = useState(null);
  const [health, setHealth]           = useState(null);
  const [loading, setLoading]         = useState(true);   // true until first success
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tick, setTick]               = useState(0);      // triggers sparkline re-render

  const epsHistory = useRef([]);  // rolling MAX_HISTORY samples of total_eps
  const timerRef   = useRef(null);

  // inject CSS once
  useEffect(() => { injectShimmer(); }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/system/metrics`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`metrics HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setError(null);
      setLastUpdated(new Date());
      epsHistory.current.push(parseFloat(data.total_eps) || 0);
      if (epsHistory.current.length > MAX_HISTORY) epsHistory.current.shift();
      setTick(t => t + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchHealth = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      const res = await fetch(`${API}/api/system/stream/health`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      setHealth(await res.json());
    } catch {
      setHealth(null);
    }
  }, [getHeaders, isPrivileged]);

  useEffect(() => {
    fetchMetrics();
    fetchHealth();
    timerRef.current = setInterval(() => {
      fetchMetrics();
      fetchHealth();
    }, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchMetrics, fetchHealth]);

  // ── derived ──────────────────────────────────────────────────────────────
  const m          = metrics || {};
  const topics     = m.topics || {};
  const dlqDepth   = m.dlq_depth ?? 0;
  const totalEPS   = m.total_eps != null ? Number(m.total_eps).toFixed(2) : null;
  const pipelineOk = health
    ? health.status === 'healthy'
    : m.total_eps != null;

  // ── loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={widgetShell}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <SkeletonRow w={130} h={13} />
          <SkeletonRow w={50} h={13} />
        </div>
        <SkeletonRow w="100%" h={28} mt={4} />
        <SkeletonRow w="70%" h={13} mt={8} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[68, 62, 70, 58].map(w => <SkeletonRow key={w} w={w} h={22} />)}
        </div>
        <SkeletonRow w="55%" h={13} mt={10} />
      </div>
    );
  }

  // ── error fallback (nothing loaded yet) ──────────────────────────────────
  if (error && !metrics) {
    return (
      <div style={{ ...widgetShell, borderColor: '#7f1d1d' }}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>⚠</div>
          <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>Streaming unavailable</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{error}</div>
          <button
            style={{
              marginTop: 10, background: '#1e293b', border: '1px solid #334155',
              color: '#94a3b8', borderRadius: 4, padding: '4px 10px',
              fontSize: 11, cursor: 'pointer',
            }}
            onClick={() => { setLoading(true); fetchMetrics(); fetchHealth(); }}
          >
            ↻ Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ ...widgetShell, borderColor: error ? '#78350f' : '#1e3a5f' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* ── hover tooltip ────────────────────────────────────────────────── */}
      {showTooltip && (
        <div style={tooltipStyle}>
          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 7, fontSize: 11 }}>
            Pipeline · EPS Breakdown
          </div>
          {Object.entries(TOPIC_COLOR).map(([t, color]) => {
            const td = topics[t] || {};
            return (
              <div
                key={t}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, lineHeight: '1.8' }}
              >
                <span style={{ color }}>{TOPIC_ICON[t]} {t.replace(/_/g, ' ')}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontFamily: 'monospace' }}>
                  {(td.eps || 0).toFixed(3)} eps
                </span>
              </div>
            );
          })}
          <div style={{
            marginTop: 8, paddingTop: 6, borderTop: '1px solid #334155',
            fontSize: 10, color: '#64748b',
          }}>
            Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            {m.avg_rule_eval_latency_ms != null && (
              <span style={{ marginLeft: 8 }}>
                · eval {Number(m.avg_rule_eval_latency_ms).toFixed(1)} ms
              </span>
            )}
          </div>
          {error && (
            <div style={{ marginTop: 4, fontSize: 10, color: '#fbbf24' }}>⚠ stale — {error}</div>
          )}
        </div>
      )}

      {/* ── header row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#38bdf8', letterSpacing: '0.04em' }}>
          ◈ Streaming Pipeline
        </span>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {/* Worker liveness dot — ADMIN / OWNER only */}
          <span
            title={
              isPrivileged
                ? health ? `Pipeline: ${health.status}` : 'Health: unavailable'
                : 'Status: ADMIN+ required'
            }
            style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
              background: isPrivileged
                ? (pipelineOk ? '#22c55e' : '#ef4444')
                : '#334155',
              boxShadow: isPrivileged
                ? `0 0 6px ${pipelineOk ? '#22c55e' : '#ef4444'}`
                : 'none',
            }}
          />
          <a href="/streaming" style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none' }}>
            Details →
          </a>
        </div>
      </div>

      {/* ── EPS value + sparkline ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          {totalEPS === null ? (
            <div style={{ fontSize: 18, color: '#334155', fontStyle: 'italic' }}>no data</div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', lineHeight: 1 }}>
              {totalEPS}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>events / sec</div>
        </div>
        {/* key={tick} ensures sparkline re-renders after each new sample */}
        <MiniSparkline history={[...epsHistory.current]} color="#38bdf8" key={tick} />
      </div>

      {/* ── per-topic EPS chips ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.entries(TOPIC_COLOR).map(([topic, color]) => {
          const td    = topics[topic] || {};
          const eps   = (td.eps || 0).toFixed(1);
          const depth = td.queue_depth != null ? `  |  depth: ${td.queue_depth}` : '';
          return (
            <TopicChip
              key={topic}
              topic={topic}
              eps={eps}
              color={color}
              icon={TOPIC_ICON[topic]}
              tooltip={`${topic}\n${eps} eps${depth}`}
            />
          );
        })}
      </div>

      {/* ── bottom row: DLQ + latency ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>DLQ:</span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color:      dlqDepth > 0 ? '#ef4444' : '#22c55e',
            background: dlqDepth > 0 ? '#450a0a' : '#052e16',
            border:     `1px solid ${dlqDepth > 0 ? '#7f1d1d' : '#14532d'}`,
            borderRadius: 4, padding: '1px 7px',
          }}>
            {dlqDepth > 0 ? `⚠ ${dlqDepth}` : '✓ 0'}
          </span>
          {/* manage link — ADMIN / OWNER when DLQ has messages */}
          {dlqDepth > 0 && isPrivileged && (
            <a href="/streaming" style={{ fontSize: 10, color: '#f87171', textDecoration: 'none' }}>
              manage →
            </a>
          )}
        </div>
        {m.avg_rule_eval_latency_ms != null && (
          <span style={{ fontSize: 11, color: '#64748b' }}>
            eval{' '}
            <span style={{ color: '#a78bfa' }}>
              {Number(m.avg_rule_eval_latency_ms).toFixed(1)} ms
            </span>
          </span>
        )}
      </div>

      {/* stale-data warning strip (visible after first load if subsequent fetches fail) */}
      {error && metrics && (
        <div style={{
          marginTop: 8, fontSize: 10, color: '#fbbf24',
          background: '#1c1007', borderRadius: 4, padding: '3px 8px',
        }}>
          ⚠ stale data — {error}
        </div>
      )}
    </div>
  );
}

// ── shared styles ─────────────────────────────────────────────────────────────
const widgetShell = {
  background: '#0f172a',
  border: '1px solid #1e3a5f',
  borderRadius: 10,
  padding: '14px 18px',
  fontFamily: 'system-ui, sans-serif',
  minWidth: 260,
  maxWidth: 390,
  color: '#f1f5f9',
  position: 'relative',
  userSelect: 'none',
};

const tooltipStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 6,
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '10px 14px',
  zIndex: 999,
  minWidth: 270,
  boxShadow: '0 8px 28px rgba(0,0,0,0.65)',
  pointerEvents: 'none',
};
