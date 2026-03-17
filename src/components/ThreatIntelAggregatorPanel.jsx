import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export default function ThreatIntelAggregatorPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  const refresh = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/threat-intel/aggregator/status`)
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        setIntervalMinutes(Number(d?.interval_minutes || 30));
      })
      .catch((e) => setError(`Aggregator status error: ${e.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);

  const runNow = () => {
    setRunning(true);
    setError('');
    fetch(`${API_BASE}/api/threat-intel/aggregator/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger_mode: 'dashboard_manual' }),
    })
      .then((r) => r.json())
      .then(() => refresh())
      .catch((e) => setError(`Run failed: ${e.message}`))
      .finally(() => setRunning(false));
  };

  const applyConfig = (enabled) => {
    setError('');
    fetch(`${API_BASE}/api/threat-intel/aggregator/auto-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, interval_minutes: intervalMinutes }),
    })
      .then((r) => r.json())
      .then(() => refresh())
      .catch((e) => setError(`Config update failed: ${e.message}`));
  };

  const lastRun = useMemo(() => status?.last_run || null, [status]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d1b26, #111f2c)',
      border: '1px solid #335066',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, color: '#9ad8ff', fontSize: '0.86rem' }}>🧠 AI Threat Intel Feed Aggregator</h3>
        <button
          onClick={runNow}
          disabled={running}
          style={{
            background: running ? '#555' : '#1e3a4d',
            color: '#c9f2ff',
            border: '1px solid #3b5f78',
            borderRadius: 6,
            padding: '5px 10px',
            cursor: running ? 'not-allowed' : 'pointer',
            fontSize: '0.67rem',
          }}
        >
          {running ? 'Running…' : 'Run ingestion now'}
        </button>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        <div style={{ fontSize: '0.65rem', color: '#9fb6c9' }}>
          Auto mode: <strong style={{ color: status?.auto_ingest_enabled ? '#80cbc4' : '#ffab91' }}>{status?.auto_ingest_enabled ? 'ENABLED' : 'DISABLED'}</strong>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#9fb6c9' }}>
          Total runs: <strong style={{ color: '#d4edff' }}>{status?.total_runs ?? '-'}</strong>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#9fb6c9' }}>
          Sources enabled: <strong style={{ color: '#d4edff' }}>{(status?.sources || []).filter((s) => Number(s.is_enabled || 0) === 1).length}</strong>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#8fb1c8', fontSize: '0.65rem' }}>Interval (min)</label>
        <input
          type="number"
          min={5}
          max={240}
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Number(e.target.value || 30))}
          style={{ width: 72, background: '#0b1621', color: '#cfe7ff', border: '1px solid #31506b', borderRadius: 6, padding: '4px 6px', fontSize: '0.65rem' }}
        />
        <button onClick={() => applyConfig(true)} style={{ background: '#173f2f', color: '#d1f5e7', border: '1px solid #2f6f57', borderRadius: 6, padding: '4px 8px', fontSize: '0.64rem' }}>Enable auto</button>
        <button onClick={() => applyConfig(false)} style={{ background: '#4a2622', color: '#ffd7d2', border: '1px solid #8a4b45', borderRadius: 6, padding: '4px 8px', fontSize: '0.64rem' }}>Disable auto</button>
      </div>

      {lastRun && (
        <div style={{ marginTop: 8, fontSize: '0.63rem', color: '#99b7ca' }}>
          Last run: {lastRun.completed_at || '-'} · Ingested: {lastRun.indicators_ingested ?? 0}
        </div>
      )}

      {(loading || error) && (
        <div style={{ marginTop: 8, fontSize: '0.63rem', color: error ? '#ff8a80' : '#9ecae1' }}>
          {error || 'Loading aggregator status...'}
        </div>
      )}
    </div>
  );
}
