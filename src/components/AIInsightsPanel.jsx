/**
 * AIInsightsPanel — AI SOC Analyst insights for the Command Center.
 *
 * Polls /api/ai-analyst/findings every 12 s.
 * Displays:
 *  • AI threat classification with confidence ring
 *  • Recommended response action
 *  • Decision source badge (rule_engine / llm_guardrailed)
 *  • Top-3 recent findings with expandable playbook steps
 *  • Summary stats: investigated / false positives / pending
 */
import React, {
  useEffect, useRef, useState, useCallback, useMemo, memo,
} from 'react';
import { useAuth } from '../context/AuthContext';

const API     = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const POLL_MS = 12_000;

const ACTION_META = {
  block_ip:              { color: '#ef4444', icon: '🚫', label: 'Block IP' },
  block_domain:          { color: '#f97316', icon: '⛔', label: 'Block Domain' },
  isolate_host:          { color: '#a855f7', icon: '🔒', label: 'Isolate Host' },
  reset_credentials:     { color: '#f59e0b', icon: '🔑', label: 'Reset Creds' },
  segment_network:       { color: '#3b82f6', icon: '🔀', label: 'Segment Net' },
  block_egress:          { color: '#ec4899', icon: '📵', label: 'Block Egress' },
  monitor_activity:      { color: '#22c55e', icon: '👁', label: 'Monitor' },
  tune_detection_policy: { color: '#38bdf8', icon: '⚙', label: 'Tune Policy' },
  take_no_action:        { color: '#64748b', icon: '–', label: 'No Action' },
};

function actionMeta(action) {
  return ACTION_META[action] || { color: '#94a3b8', icon: '?', label: action || 'Unknown' };
}

const CLASS_COLOR = {
  phishing:            '#f97316',
  malware:             '#ef4444',
  credential_access:   '#a855f7',
  reconnaissance:      '#38bdf8',
  lateral_movement:    '#f59e0b',
  data_exfiltration:   '#ec4899',
  policy_violation:    '#ffd54f',
  suspicious_activity: '#94a3b8',
};

function classColor(cls) {
  return CLASS_COLOR[cls] || '#94a3b8';
}

/**
 * ConfidenceRing — SVG donut ring showing a 0-100 percentage.
 */
const ConfidenceRing = memo(function ConfidenceRing({ pct, color, size = 44 }) {
  const r       = (size - 6) / 2;
  const circ    = 2 * Math.PI * r;
  const dashOff = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={dashOff}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="700" fill={color}
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
});

/**
 * InsightCard — one expanded AI finding card.
 */
const InsightCard = memo(function InsightCard({ finding, index }) {
  const [expanded, setExpanded] = useState(false);
  const cls      = finding.attack_classification || 'suspicious_activity';
  const conf     = Math.round((finding.analyst_confidence || 0.5) * 100);
  const action   = finding.analyst_recommendation || 'monitor_activity';
  const am       = actionMeta(action);
  const cc       = classColor(cls);
  const src      = finding.analyst_decision_source || 'rule_engine';
  const srcLabel = src === 'llm_guardrailed' ? 'LLM' : src.replace('_', ' ');
  const steps    = finding.analyst_playbook_steps;

  return (
    <div style={{
      background: '#0a0f1e',
      border: `1px solid ${cc}33`,
      borderRadius: 6,
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      {/* Row */}
      <div
        role="button" tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          cursor: 'pointer',
        }}
      >
        <ConfidenceRing pct={conf} color={cc} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cc, textTransform: 'capitalize' }}>
              {cls.replace(/_/g, ' ')}
            </span>
            <span style={{
              fontSize: 9, color: src === 'llm_guardrailed' ? '#a78bfa' : '#64748b',
              border: `1px solid ${src === 'llm_guardrailed' ? '#a78bfa44' : '#33415544'}`,
              borderRadius: 3, padding: '1px 4px', fontWeight: 600,
            }}>
              {srcLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: am.color }}>{am.icon}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{am.label}</span>
            <span style={{ fontSize: 9, color: '#334155', marginLeft: 'auto' }}>
              {String(finding.alert_type || '').slice(0, 28)}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#334155' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded playbook steps */}
      {expanded && (
        <div style={{ padding: '6px 10px 8px', borderTop: `1px solid ${cc}22` }}>
          {finding.analyst_recommendation && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>
              {finding.analyst_recommendation}
            </div>
          )}
          {Array.isArray(steps) && steps.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: 16 }}>
              {steps.map((step, i) => (
                <li key={i} style={{ fontSize: 10, color: '#64748b', marginBottom: 3, lineHeight: 1.4 }}>
                  {typeof step === 'string' ? step : (step.description || JSON.stringify(step))}
                </li>
              ))}
            </ol>
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            <a
              href="/cases"
              style={{ fontSize: 10, color: '#38bdf8', textDecoration: 'none',
                border: '1px solid #38bdf844', borderRadius: 3, padding: '2px 6px' }}
            >
              Open Case
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

// ── main component ────────────────────────────────────────────────────────────
export default function AIInsightsPanel({ maxHeight = '100%', compact = false }) {
  const { getHeaders } = useAuth();
  const [findings, setFindings]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef                  = useRef(null);

  const fetch2 = useCallback(async () => {
    try {
      const [fRes, sRes] = await Promise.all([
        fetch(`${API}/api/ai-analyst/findings?limit=20`, { headers: getHeaders() }),
        fetch(`${API}/api/ai-analyst/summary`, { headers: getHeaders() }),
      ]);
      if (fRes.ok) {
        const data = await fRes.json();
        if (Array.isArray(data)) setFindings(data.slice(0, 15));
      }
      if (sRes.ok) setSummary(await sRes.json());
      setLastUpdate(new Date().toISOString().slice(11, 19) + 'Z');
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetch2();
    timerRef.current = setInterval(fetch2, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch2]);

  // Top classification breakdown
  const classBreakdown = useMemo(() => {
    if (!summary?.classifications) return [];
    return summary.classifications.slice(0, 5);
  }, [summary]);

  const topFindings = useMemo(
    () => findings.filter(f => f.analyst_status !== 'closed_false_positive').slice(0, 8),
    [findings],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: maxHeight, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: compact ? '5px 8px' : '8px 12px',
        background: '#0a0f1e', borderBottom: '1px solid #1e293b',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: compact ? 11 : 13, color: '#a78bfa', letterSpacing: '0.05em' }}>
          🧠 AI SOC ANALYST
        </span>
        <span style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace' }}>
          {lastUpdate ? `↻ ${lastUpdate}` : loading ? '…' : '—'}
        </span>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{
          display: 'flex', gap: 0, flexShrink: 0,
          borderBottom: '1px solid #1e293b',
        }}>
          {[
            { label: 'Total',      value: summary.total_alerts,            color: '#94a3b8' },
            { label: 'Reviewed',   value: summary.investigated,            color: '#22c55e' },
            { label: 'FP Closed',  value: summary.false_positive_closed,   color: '#64748b' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '6px 4px',
              borderRight: '1px solid #1e293b',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Classification breakdown mini-bars */}
      {classBreakdown.length > 0 && (
        <div style={{
          padding: '6px 10px', flexShrink: 0, borderBottom: '1px solid #1e293b',
        }}>
          {classBreakdown.map(c => {
            const max = classBreakdown[0]?.count || 1;
            const pct = Math.round((c.count / max) * 100);
            const cc = classColor(c.classification);
            return (
              <div key={c.classification} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: cc, width: 110, flexShrink: 0, textTransform: 'capitalize' }}>
                  {(c.classification || '').replace(/_/g, ' ')}
                </span>
                <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cc, borderRadius: 2,
                    transition: 'width 0.5s ease', boxShadow: `0 0 4px ${cc}` }} />
                </div>
                <span style={{ fontSize: 9, color: '#475569', width: 22, textAlign: 'right' }}>{c.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Findings list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {loading && !topFindings.length ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: '24px 8px', fontSize: 11 }}>
            Loading AI insights…
          </div>
        ) : topFindings.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: '24px 8px', fontSize: 11 }}>
            No open findings.
          </div>
        ) : (
          topFindings.map((f, i) => <InsightCard key={f.id || i} finding={f} index={i} />)
        )}
      </div>
    </div>
  );
}
