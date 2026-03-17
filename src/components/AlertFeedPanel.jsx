/**
 * AlertFeedPanel — Live alert feed for the SOC Command Center.
 *
 * Features:
 *  • WebSocket subscription to /ws/stream (batched, throttled)
 *  • Fallback polling /api/alerts/live every 8 s on WS failure
 *  • Color-coded severity rows with neon glow
 *  • Hover tooltip: full payload details
 *  • Virtual scroll (DOM prune to last 200 rows)
 *  • Click row → open /cases or /investigation/graph
 */
import React, {
  useEffect, useRef, useState, useCallback, useMemo, memo,
} from 'react';
import { useAuth } from '../context/AuthContext';

const API           = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL        = (API.replace(/^http/, 'ws')) + '/ws/stream';
const POLL_MS       = 8_000;
const MAX_ALERTS    = 200;
const BATCH_FLUSH   = 300; // ms to batch incoming WS events before state update

const SEV_META = {
  CRITICAL: { color: '#ff1744', bg: '#1a0005', glow: '#ff174444', icon: '☠' },
  HIGH:     { color: '#ff6d00', bg: '#1a0800', glow: '#ff6d0033', icon: '⚡' },
  MEDIUM:   { color: '#ffd54f', bg: '#1a1400', glow: '#ffd54f22', icon: '⚠' },
  LOW:      { color: '#64dd17', bg: '#001a00', glow: '#64dd1722', icon: '◉' },
  INFO:     { color: '#29b6f6', bg: '#001a22', glow: '#29b6f622', icon: '●' },
};

function sevMeta(sev) {
  return SEV_META[(sev || '').toUpperCase()] || SEV_META.INFO;
}

function fmtTime(ts) {
  try {
    const d = new Date(ts);
    if (isNaN(d)) return ts || '—';
    return d.toISOString().slice(11, 19) + 'Z';
  } catch {
    return ts || '—';
  }
}

// ── single alert row (memoised) ───────────────────────────────────────────────
const AlertRow = memo(function AlertRow({ alert, onSelect }) {
  const m = sevMeta(alert.severity);
  return (
    <div
      role="button"
      tabIndex={0}
      title={`ID: ${alert.id}\nType: ${alert.alert_type}\nSource: ${alert.matched_indicator || '—'}`}
      onClick={() => onSelect(alert)}
      onKeyDown={e => e.key === 'Enter' && onSelect(alert)}
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 58px 76px 1fr',
        gap: 6,
        padding: '5px 8px',
        borderBottom: '1px solid #0f172a',
        background: m.bg,
        boxShadow: `inset 2px 0 0 ${m.color}`,
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ color: m.color, fontSize: 11, textAlign: 'center' }}>{m.icon}</span>
      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {fmtTime(alert.timestamp)}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700, color: m.color,
        border: `1px solid ${m.color}44`, borderRadius: 3,
        padding: '1px 4px', whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {(alert.severity || 'INFO').toUpperCase()}
      </span>
      <span style={{
        fontSize: 11, color: '#cbd5e1', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {alert.alert_type || 'Alert'}
        {alert.matched_indicator
          ? <span style={{ color: '#475569', marginLeft: 5 }}>· {String(alert.matched_indicator).slice(0, 40)}</span>
          : null}
      </span>
    </div>
  );
});

// ── component ─────────────────────────────────────────────────────────────────
export default function AlertFeedPanel({ maxHeight = '100%', compact = false }) {
  const { getHeaders } = useAuth();
  const [alerts, setAlerts]       = useState([]);
  const [wsState, setWsState]     = useState('connecting'); // connecting | open | closed
  const [selected, setSelected]   = useState(null);
  const wsRef                     = useRef(null);
  const batchRef                  = useRef([]);
  const flushTimer                = useRef(null);
  const pollTimer                 = useRef(null);
  const listRef                   = useRef(null);
  const autoScroll                = useRef(true);

  // ── merge + deduplicate incoming alerts ──────────────────────────────
  const mergeAlerts = useCallback((incoming) => {
    setAlerts(prev => {
      const seen = new Set(prev.map(a => a.id));
      const fresh = incoming.filter(a => !seen.has(a.id));
      if (!fresh.length) return prev;
      const merged = [...fresh, ...prev].slice(0, MAX_ALERTS);
      return merged;
    });
  }, []);

  // ── flush batched WS events ───────────────────────────────────────────
  const flushBatch = useCallback(() => {
    if (!batchRef.current.length) return;
    const batch = batchRef.current.splice(0);
    const alertItems = batch
      .filter(m => m.type === 'alert' || m.alert_type || m.severity)
      .map(m => ({ ...m, id: m.id || `ws_${Date.now()}_${Math.random()}` }));
    if (alertItems.length) mergeAlerts(alertItems);
  }, [mergeAlerts]);

  // ── REST poll fallback ────────────────────────────────────────────────
  const pollAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alerts/live?limit=60`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) mergeAlerts(data);
    } catch { /* silent */ }
  }, [getHeaders, mergeAlerts]);

  // ── WebSocket setup ───────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return; // already open/connecting
    setWsState('connecting');
    const headers = getHeaders();
    const url = `${WS_URL}?org_id=${encodeURIComponent(headers['X-Org-Id'] || '')}&role=${encodeURIComponent(headers['X-User-Role'] || '')}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => setWsState('open');
    ws.onclose = () => {
      setWsState('closed');
      // Start polling on WS close
      if (!pollTimer.current) {
        pollAlerts();
        pollTimer.current = setInterval(pollAlerts, POLL_MS);
      }
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        batchRef.current.push(msg);
        if (!flushTimer.current) {
          flushTimer.current = setTimeout(() => {
            flushTimer.current = null;
            flushBatch();
          }, BATCH_FLUSH);
        }
      } catch { /* ignore malformed */ }
    };
  }, [getHeaders, flushBatch, pollAlerts]);

  useEffect(() => {
    // Initial REST load immediately
    pollAlerts();
    connectWS();
    return () => {
      wsRef.current?.close();
      clearInterval(pollTimer.current);
      clearTimeout(flushTimer.current);
    };
  }, [connectWS, pollAlerts]);

  // ── auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [alerts]);

  const critCount = useMemo(
    () => alerts.filter(a => (a.severity || '').toUpperCase() === 'CRITICAL').length,
    [alerts],
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
        <span style={{ fontWeight: 700, fontSize: compact ? 11 : 13, color: '#ff1744', letterSpacing: '0.05em' }}>
          ⚡ LIVE ALERTS
          {critCount > 0 && (
            <span style={{
              marginLeft: 6, background: '#ff1744', color: '#fff',
              borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700,
            }}>
              {critCount} CRITICAL
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 9, color: wsState === 'open' ? '#22c55e' : wsState === 'connecting' ? '#f59e0b' : '#ef4444',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {wsState === 'open' ? '● WS' : wsState === 'connecting' ? '◌ WS' : '○ POLL'}
          </span>
          <span style={{ fontSize: 10, color: '#475569' }}>{alerts.length}</span>
        </div>
      </div>

      {/* Alert list */}
      <div
        ref={listRef}
        onScroll={e => { autoScroll.current = e.target.scrollTop < 40; }}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {alerts.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: '24px 8px', fontSize: 12 }}>
            Waiting for alerts…
          </div>
        ) : (
          alerts.map(a => (
            <AlertRow key={a.id} alert={a} onSelect={setSelected} />
          ))
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div style={{
          flexShrink: 0, background: '#0f172a', borderTop: `1px solid ${sevMeta(selected.severity).color}44`,
          padding: '8px 10px', fontSize: 11,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: sevMeta(selected.severity).color, fontWeight: 700 }}>
              {selected.alert_type}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}
            >✕</button>
          </div>
          <div style={{ color: '#64748b', lineHeight: 1.5 }}>
            <span style={{ color: '#94a3b8' }}>ID: </span>{selected.id}<br />
            <span style={{ color: '#94a3b8' }}>Source: </span>{selected.matched_indicator || '—'}<br />
            <span style={{ color: '#94a3b8' }}>Status: </span>{selected.analyst_status || 'open'}<br />
            {selected.attack_classification && (
              <><span style={{ color: '#94a3b8' }}>Class: </span>{selected.attack_classification}<br /></>
            )}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            <a
              href={`/cases`}
              style={{ fontSize: 10, color: '#38bdf8', textDecoration: 'none',
                border: '1px solid #38bdf844', borderRadius: 3, padding: '2px 6px' }}
            >
              Open Case
            </a>
            <a
              href={`/investigation/graph`}
              style={{ fontSize: 10, color: '#a78bfa', textDecoration: 'none',
                border: '1px solid #a78bfa44', borderRadius: 3, padding: '2px 6px' }}
            >
              Investigate
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
