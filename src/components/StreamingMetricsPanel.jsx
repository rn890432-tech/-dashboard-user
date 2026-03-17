import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// ── access-control constants ──────────────────────────────────────────────────
const PRIVILEGED_ROLES = ['ADMIN', 'OWNER'];

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TOPICS = ['telemetry_events', 'rule_evaluations', 'alerts_generated', 'graph_updates'];

const TOPIC_COLOR = {
  telemetry_events:  '#38bdf8',
  rule_evaluations:  '#a78bfa',
  alerts_generated:  '#f97316',
  graph_updates:     '#22c55e',
};

const TOPIC_ICON = {
  telemetry_events:  '📡',
  rule_evaluations:  '🔍',
  alerts_generated:  '🚨',
  graph_updates:     '🕸️',
};

// ── tiny sparkline (SVG) ──────────────────────────────────────────────────────
function Sparkline({ history, color }) {
  if (!history || history.length < 2) return null;
  const w = 80, h = 28;
  const max = Math.max(...history, 0.01);
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color || '#38bdf8'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 8, padding: '14px 18px',
      border: '1px solid #334155', flex: 1, minWidth: 130, textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── worker status badge ───────────────────────────────────────────────────────
function WorkerBadge({ worker }) {
  const running = !worker.done && !worker.cancelled;
  const color = running ? '#22c55e' : worker.cancelled ? '#f59e0b' : '#ef4444';
  const label = running ? 'running' : worker.cancelled ? 'cancelled' : 'stopped';
  const shortName = worker.name.replace('worker:', '');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px',
      background: '#0f172a', borderRadius: 6, border: `1px solid ${color}22`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#cbd5e1' }}>{shortName}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── DLQ payload preview modal ────────────────────────────────────────────────
function DLQPreviewModal({ messages, dlqDepth, drainLimit, onDrainLimitChange, onConfirm, onCancel, draining }) {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.dialog}>
        {/* header */}
        <div style={modalStyles.header}>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 15 }}>☠️ Drain DLQ — Confirm</span>
          <button style={modalStyles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {/* summary */}
        <div style={modalStyles.summary}>
          <span><strong style={{ color: '#f87171' }}>{dlqDepth}</strong> message(s) in queue</span>
          <span style={{ margin: '0 10px', color: '#475569' }}>|</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            Drain limit:
            <input
              type="number" min={1} max={200} value={drainLimit}
              onChange={e => onDrainLimitChange(Math.min(200, Math.max(1, Number(e.target.value))))}
              style={modalStyles.limitInput}
            />
          </label>
        </div>

        {/* payload preview */}
        <div style={modalStyles.previewScroll}>
          {messages.length === 0 ? (
            <div style={{ color: '#64748b', padding: 16, textAlign: 'center' }}>No messages to preview.</div>
          ) : messages.map((msg, i) => (
            <div key={i} style={modalStyles.msgCard}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ color: '#7dd3fc', fontSize: 11 }}>#{i + 1}</span>
                <span style={{ color: '#a78bfa', fontSize: 11 }}>topic: {msg.topic}</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>org: {msg.org_id || msg.org}</span>
                <span style={{ color: '#ef4444', fontSize: 11 }}>attempts: {msg.attempt}</span>
                <span style={{ color: '#f59e0b', fontSize: 11 }}>reason: {msg.reason || '—'}</span>
              </div>
              <pre style={modalStyles.pre}>
                {JSON.stringify(msg.payload || msg, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        {/* action row */}
        <div style={modalStyles.actions}>
          <button style={modalStyles.cancelBtn} onClick={onCancel} disabled={draining}>Cancel</button>
          <button style={modalStyles.drainBtn} onClick={onConfirm} disabled={draining}>
            {draining ? 'Draining…' : `🗑 Confirm Drain (${Math.min(drainLimit, dlqDepth)} messages)`}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  dialog: {
    background: '#0f172a', borderRadius: 10, border: '1px solid #334155',
    width: '90%', maxWidth: 760, maxHeight: '82vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderBottom: '1px solid #1e293b',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#64748b',
    fontSize: 16, cursor: 'pointer', padding: '2px 6px',
  },
  summary: {
    padding: '10px 18px', fontSize: 13, color: '#94a3b8',
    display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b',
  },
  limitInput: {
    width: 60, background: '#1e293b', border: '1px solid #334155',
    color: '#f1f5f9', borderRadius: 4, padding: '3px 6px', fontSize: 13,
  },
  previewScroll: {
    flex: 1, overflowY: 'auto', padding: '12px 18px',
  },
  msgCard: {
    background: '#1e293b', borderRadius: 6, padding: 10,
    border: '1px solid #334155', marginBottom: 8,
  },
  pre: {
    background: '#0f172a', borderRadius: 4, padding: 8,
    fontSize: 11, color: '#64748b', overflowX: 'auto', margin: 0, maxHeight: 120,
    fontFamily: 'JetBrains Mono, monospace',
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    padding: '12px 18px', borderTop: '1px solid #1e293b',
  },
  cancelBtn: {
    background: '#334155', color: '#cbd5e1', border: 'none',
    borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13,
  },
  drainBtn: {
    background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444',
    borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
};

// ── access-denied block ───────────────────────────────────────────────────────
function AccessDenied({ feature }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 8, padding: '32px 24px', textAlign: 'center',
      border: '1px solid #334155', color: '#64748b',
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
      <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{feature} — Restricted</div>
      <div style={{ fontSize: 12 }}>Requires <strong>ADMIN</strong> or <strong>OWNER</strong> role.</div>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────
export default function StreamingMetricsPanel({ embedded = false }) {
  const { getHeaders, hasRole, user } = useAuth();
  const isPrivileged = hasRole('ADMIN'); // ADMIN and OWNER both pass (hierarchy: OWNER > ADMIN)

  const [metrics, setMetrics]         = useState(null);
  const [health, setHealth]           = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingHealth, setLoadingHealth]   = useState(false);
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState('overview');

  // DLQ state
  const [dlqPreview, setDlqPreview]       = useState(null);   // non-destructive peek result
  const [dlqDrained, setDlqDrained]       = useState(null);   // post-drain result
  const [inspecting, setInspecting]       = useState(false);
  const [draining, setDraining]           = useState(false);
  const [drainLimit, setDrainLimit]       = useState(50);
  const [showDrainModal, setShowDrainModal] = useState(false);

  // EPS sparkline history
  const epsHistory = useRef({});
  const [, forceRender] = useState(0);
  const timerRef = useRef(null);

  // ── fetch metrics (all roles) ───────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`${API}/api/system/metrics`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      const topics = data.topics || {};
      for (const [topic, tdata] of Object.entries(topics)) {
        if (!epsHistory.current[topic]) epsHistory.current[topic] = [];
        const hist = epsHistory.current[topic];
        hist.push(parseFloat(tdata.eps) || 0);
        if (hist.length > 60) hist.shift();
      }
      forceRender(n => n + 1);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingMetrics(false);
    }
  }, [getHeaders]);

  // ── fetch health (ADMIN/OWNER only — graceful degrade for others) ───────
  const fetchHealth = useCallback(async () => {
    if (!isPrivileged) return;
    setLoadingHealth(true);
    try {
      const res = await fetch(`${API}/api/system/stream/health`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth(await res.json());
    } catch (e) {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, [getHeaders, isPrivileged]);

  // ── inspect DLQ — non-destructive peek (ADMIN/OWNER only) ──────────────
  const inspectDLQ = useCallback(async (limit = 50) => {
    if (!isPrivileged) return;
    setInspecting(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/api/system/stream/dlq/inspect?limit=${Math.min(limit, 200)}`,
        { headers: getHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDlqPreview(await res.json());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setInspecting(false);
    }
  }, [getHeaders, isPrivileged]);

  // ── drain DLQ — destructive (ADMIN/OWNER only, always after preview) ───
  const drainDLQ = useCallback(async () => {
    if (!isPrivileged) return;
    setDraining(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/api/system/stream/dlq/drain?limit=${drainLimit}`,
        { method: 'POST', headers: getHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setDlqDrained(result);
      setDlqPreview(null);      // clear preview after drain
      setShowDrainModal(false);
      await fetchMetrics();     // refresh depth counters
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setDraining(false);
    }
  }, [getHeaders, isPrivileged, drainLimit, fetchMetrics]);

  // ── open drain modal: inspect first, then show modal ──────────────────
  const openDrainModal = useCallback(async () => {
    await inspectDLQ(drainLimit);
    setShowDrainModal(true);
  }, [inspectDLQ, drainLimit]);

  useEffect(() => {
    fetchMetrics();
    fetchHealth();
    timerRef.current = setInterval(() => {
      fetchMetrics();
      fetchHealth();
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [fetchMetrics, fetchHealth]);

  const m         = metrics || {};
  const topicData = m.topics || {};
  const last60    = m.last_60s || {};

  const pageStyle = embedded
    ? { background: 'transparent', padding: 12, fontFamily: 'monospace, system-ui', color: '#f1f5f9' }
    : styles.page;

  return (
    <div style={pageStyle}>
      {/* DLQ drain confirmation modal */}
      {showDrainModal && (
        <DLQPreviewModal
          messages={(dlqPreview && dlqPreview.messages) || []}
          dlqDepth={(dlqPreview && dlqPreview.dlq_depth) || m.dlq_depth || 0}
          drainLimit={drainLimit}
          onDrainLimitChange={setDrainLimit}
          onConfirm={drainDLQ}
          onCancel={() => setShowDrainModal(false)}
          draining={draining}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#f1f5f9' }}>
            Real-Time Streaming Pipeline
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Live event throughput · worker health · queue depths · DLQ monitoring
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Role badge */}
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 700,
            background: isPrivileged ? '#1e3a5f' : '#1e293b',
            color: isPrivileged ? '#38bdf8' : '#64748b',
            border: `1px solid ${isPrivileged ? '#38bdf844' : '#33415544'}`,
          }}>
            {user.role}
          </span>
          {m.uptime_seconds !== undefined && (
            <span style={{ fontSize: 12, color: '#475569' }}>
              uptime {Math.floor(m.uptime_seconds / 60)}m {Math.round(m.uptime_seconds % 60)}s
            </span>
          )}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: loadingMetrics ? '#f59e0b' : '#22c55e',
            boxShadow: `0 0 6px ${loadingMetrics ? '#f59e0b' : '#22c55e'}`,
          }} />
          <button style={styles.btnSecondary} onClick={() => { fetchMetrics(); fetchHealth(); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
          <button style={{ float: 'right', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
            onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'topics',   label: '📬 Topics' },
          { key: 'workers',  label: '⚙️ Workers' },
          { key: 'dlq',      label: '☠️ Dead-Letter Queue' },
        ].map(t => (
          <button
            key={t.key}
            style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabBtnActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          {/* Top stat cards */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard
              label="Total EPS"
              value={m.total_eps !== undefined ? m.total_eps.toFixed(2) : '—'}
              color="#38bdf8"
              sub="events / second"
            />
            <StatCard
              label="Avg Rule Eval"
              value={m.avg_rule_eval_latency_ms !== undefined ? `${m.avg_rule_eval_latency_ms.toFixed(2)} ms` : '—'}
              color="#a78bfa"
              sub="evaluation latency"
            />
            <StatCard
              label="p99 Rule Eval"
              value={m.p99_rule_eval_latency_ms !== undefined ? `${m.p99_rule_eval_latency_ms.toFixed(2)} ms` : '—'}
              color="#f97316"
              sub="p99 latency"
            />
            <StatCard
              label="DLQ Depth"
              value={m.dlq_depth !== undefined ? m.dlq_depth : '—'}
              color={m.dlq_depth > 0 ? '#ef4444' : '#22c55e'}
              sub="failed messages"
            />
          </div>

          {/* Last 60 s activity */}
          <div style={styles.sectionTitle}>Last 60 Seconds</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard
              label="Events Ingested"
              value={last60.events_ingested !== undefined ? last60.events_ingested.toLocaleString() : '—'}
              color="#38bdf8"
            />
            <StatCard
              label="Rules Fired"
              value={last60.rules_fired !== undefined ? last60.rules_fired.toLocaleString() : '—'}
              color="#a78bfa"
            />
            <StatCard
              label="Alerts Generated"
              value={last60.alerts_generated !== undefined ? last60.alerts_generated.toLocaleString() : '—'}
              color="#f97316"
            />
          </div>

          {/* Topic EPS sparkline row */}
          <div style={styles.sectionTitle}>Topic EPS (rolling 60 s window)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {TOPICS.map(topic => {
              const td = topicData[topic] || {};
              const color = TOPIC_COLOR[topic];
              return (
                <div key={topic} style={{
                  background: '#1e293b', borderRadius: 8, padding: 12,
                  border: `1px solid ${color}33`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {TOPIC_ICON[topic]} {topic.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                      {(td.eps || 0).toFixed(2)} eps
                    </span>
                  </div>
                  <Sparkline history={epsHistory.current[topic] || []} color={color} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 4 }}>
                    <span>depth: <span style={{ color: '#94a3b8' }}>{td.queue_depth || 0}</span></span>
                    <span>dropped: <span style={{ color: td.dropped > 0 ? '#ef4444' : '#475569' }}>{td.dropped || 0}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Topics Tab ───────────────────────────────────────────────── */}
      {tab === 'topics' && (
        <>
          <div style={styles.sectionTitle}>Per-Topic Statistics</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  {['Topic', 'EPS', 'Published', 'Consumed', 'Dropped', 'DLQ', 'Queue Depth'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOPICS.map((topic, i) => {
                  const td = topicData[topic] || {};
                  const color = TOPIC_COLOR[topic];
                  return (
                    <tr key={topic} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                      <td style={{ ...styles.td, color }}>
                        {TOPIC_ICON[topic]} {topic}
                      </td>
                      <td style={{ ...styles.td, color, fontWeight: 700 }}>{(td.eps || 0).toFixed(3)}</td>
                      <td style={styles.td}>{(td.published || 0).toLocaleString()}</td>
                      <td style={styles.td}>{(td.consumed || 0).toLocaleString()}</td>
                      <td style={{ ...styles.td, color: td.dropped > 0 ? '#ef4444' : '#64748b' }}>
                        {td.dropped || 0}
                      </td>
                      <td style={{ ...styles.td, color: td.dlq_count > 0 ? '#f97316' : '#64748b' }}>
                        {td.dlq_count || 0}
                      </td>
                      <td style={{ ...styles.td, color: td.queue_depth > 100 ? '#f59e0b' : '#94a3b8' }}>
                        {td.queue_depth || 0}
                        {td.queue_depth > 100 && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#475569' }}>
            Max queue size per topic: 10,000 · Back-pressure: drop oldest on full
          </div>
        </>
      )}

      {/* ── Workers Tab ──────────────────────────────────────────────── */}
      {tab === 'workers' && (
        <>
          {!isPrivileged ? (
            <AccessDenied feature="Worker Status" />
          ) : (
            <>
              <div style={styles.sectionTitle}>Worker Status</div>
              {loadingHealth && !health ? (
                <div style={styles.empty}>Loading worker status…</div>
              ) : !health ? (
                <div style={styles.empty}>No worker data available (pipeline may not have started).</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {(health.workers || []).length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: 13 }}>No workers detected (app may have just started).</div>
                    ) : (
                      (health.workers || []).map((w, i) => <WorkerBadge key={i} worker={w} />)
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <StatCard
                      label="Pipeline Status"
                      value={health.status === 'healthy' ? '✓ Healthy' : '⚠ ' + health.status}
                      color={health.status === 'healthy' ? '#22c55e' : '#f59e0b'}
                    />
                    <StatCard
                      label="Broker Uptime"
                      value={`${Math.floor((health.uptime_seconds || 0) / 60)}m`}
                      color="#38bdf8"
                      sub={`${Math.round((health.uptime_seconds || 0) % 60)}s`}
                    />
                    <StatCard label="Total EPS" value={(health.total_eps || 0).toFixed(2)} color="#a78bfa" />
                    <StatCard
                      label="DLQ Depth"
                      value={health.dlq_depth || 0}
                      color={health.dlq_depth > 0 ? '#ef4444' : '#22c55e'}
                    />
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div style={styles.sectionTitle}>Worker Responsibilities</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {[
                        { name: 'rule_evaluation',  color: TOPIC_COLOR.telemetry_events,  desc: 'Consumes telemetry_events · evaluates detection rules · publishes to alerts_generated + graph_updates · records latency metrics' },
                        { name: 'alert_generation',  color: TOPIC_COLOR.alerts_generated,  desc: 'Consumes alerts_generated · routes HIGH/CRITICAL to AI triage · auto-creates SOC cases for CRITICAL severity' },
                        { name: 'graph_update',      color: TOPIC_COLOR.graph_updates,     desc: 'Consumes graph_updates · deduplicates within 5 s window · broadcasts via WebSocket to Investigation Graph' },
                        { name: 'ioc_correlation',   color: TOPIC_COLOR.rule_evaluations,  desc: 'Consumes telemetry_events · cross-references IOC indicators · publishes correlation findings to downstream topics' },
                      ].map(w => (
                        <div key={w.name} style={{ background: '#0f172a', borderRadius: 8, padding: 12, border: `1px solid ${w.color}33` }}>
                          <div style={{ fontWeight: 600, color: w.color, fontSize: 13, marginBottom: 6 }}>{w.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{w.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── DLQ Tab ──────────────────────────────────────────────────── */}
      {tab === 'dlq' && (
        <>
          {!isPrivileged ? (
            <AccessDenied feature="Dead-Letter Queue" />
          ) : (
            <>
              {/* Toolbar row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={styles.sectionTitle}>Dead-Letter Queue</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                    Limit:
                    <input
                      type="number" min={1} max={200} value={drainLimit}
                      onChange={e => setDrainLimit(Math.min(200, Math.max(1, Number(e.target.value))))}
                      style={{ width: 55, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: 4, padding: '3px 6px', fontSize: 12 }}
                    />
                  </label>
                  <button
                    style={{ ...styles.btnSecondary, color: '#38bdf8' }}
                    onClick={() => inspectDLQ(drainLimit)}
                    disabled={inspecting}
                  >
                    {inspecting ? 'Inspecting…' : '🔍 Inspect DLQ'}
                  </button>
                  <button
                    style={{ ...styles.btnSecondary, color: m.dlq_depth > 0 ? '#f87171' : '#64748b' }}
                    onClick={openDrainModal}
                    disabled={draining || m.dlq_depth === 0 || inspecting}
                  >
                    {draining ? 'Draining…' : `🗑 Drain DLQ (${m.dlq_depth || 0})`}
                  </button>
                </div>
              </div>

              {/* Post-drain success banner */}
              {dlqDrained && (
                <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: 6, padding: '8px 14px', marginBottom: 14, fontSize: 13, color: '#86efac', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ Drained <strong>{dlqDrained.drained}</strong> message(s) · <strong>{dlqDrained.dlq_depth_remaining}</strong> remaining</span>
                  <button style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer' }} onClick={() => setDlqDrained(null)}>✕</button>
                </div>
              )}

              {/* Empty / guide state */}
              {!dlqPreview && !dlqDrained && (
                <div style={styles.empty}>
                  {m.dlq_depth === 0
                    ? '✓ Dead-letter queue is empty — no failed messages.'
                    : `${m.dlq_depth} message(s) in DLQ. Click "Inspect DLQ" to preview — no messages will be removed.`}
                </div>
              )}

              {/* Inspect preview list */}
              {dlqPreview && (
                <>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
                    Previewing <strong style={{ color: '#38bdf8' }}>{dlqPreview.previewing}</strong> of{' '}
                    <strong style={{ color: '#f87171' }}>{dlqPreview.dlq_depth}</strong> message(s)
                    &nbsp;— <span style={{ color: '#64748b' }}>read-only · no messages removed</span>
                  </div>
                  {(dlqPreview.messages || []).map((msg, i) => (
                    <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: 12, border: '1px solid #334155', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ color: '#7dd3fc', fontSize: 11 }}>#{i + 1}</span>
                        <span style={{ color: '#a78bfa', fontSize: 11 }}>topic: {msg.topic}</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>org: {msg.org_id || msg.org || '—'}</span>
                        <span style={{ color: '#ef4444', fontSize: 11 }}>attempts: {msg.attempt}</span>
                        <span style={{ color: '#f59e0b', fontSize: 11 }}>reason: {msg.reason || '—'}</span>
                      </div>
                      <pre style={{ background: '#0f172a', borderRadius: 4, padding: 8, fontSize: 11, color: '#64748b', overflowX: 'auto', margin: 0, maxHeight: 120, fontFamily: 'JetBrains Mono, monospace' }}>
                        {JSON.stringify(msg.payload || msg, null, 2)}
                      </pre>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    background: '#0f172a', minHeight: '100vh', padding: 24,
    fontFamily: 'system-ui, sans-serif', color: '#f1f5f9',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  tabBar: {
    display: 'flex', gap: 6, marginBottom: 24,
    borderBottom: '1px solid #1e293b', paddingBottom: 4,
  },
  tabBtn: {
    background: 'transparent', border: 'none', color: '#64748b',
    fontWeight: 600, fontSize: 13, padding: '6px 14px', cursor: 'pointer',
    borderRadius: '6px 6px 0 0', borderBottom: '2px solid transparent',
  },
  tabBtnActive: {
    color: '#38bdf8', borderBottom: '2px solid #38bdf8', background: '#1e293b',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#475569',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    marginBottom: 10,
  },
  btnSecondary: {
    background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 6,
    padding: '6px 12px', cursor: 'pointer', fontSize: 12,
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
    padding: '8px 12px', marginBottom: 14, color: '#fca5a5', fontSize: 12,
  },
  empty: { color: '#64748b', textAlign: 'center', padding: '40px 0', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#1e293b', color: '#94a3b8' },
  th: { padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #334155' },
  td: { padding: '7px 12px', color: '#94a3b8' },
};
