import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const cardStyle = {
  border: '1px solid #1f4258',
  borderRadius: 10,
  background: '#07111a',
  padding: 12,
  color: '#d7f1ff',
  marginBottom: 12,
  fontFamily: 'JetBrains Mono, monospace',
};

const buttonStyle = {
  border: '1px solid #29b6f666',
  background: '#10293b',
  color: '#a6e3ff',
  borderRadius: 6,
  padding: '7px 10px',
  cursor: 'pointer',
  fontSize: '0.72rem',
};

export default function SimulationControlPanel() {
  const { user, hasRole } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [runs, setRuns] = useState([]);
  const [billing, setBilling] = useState(null);
  const [scenario, setScenario] = useState('phishing_campaign');
  const [originCountry, setOriginCountry] = useState('Russia');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [targetSector, setTargetSector] = useState('finance');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const orgId = user.organizationId || 'org_default';
  const canOperate = hasRole('ANALYST');

  const refreshRuns = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulation/runs?organization_id=${encodeURIComponent(orgId)}`);
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
      if (!selectedRunId && Array.isArray(data) && data.length) {
        setSelectedRunId(data[0].id);
      }
    } catch {
      // noop
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/simulation/scenarios`).then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        setScenarios(d);
        if (d[0]?.key) setScenario((current) => current || d[0].key);
      }
    }).catch(() => {});

    fetch(`${API_BASE}/api/billing/organizations/${encodeURIComponent(orgId)}/overview`).then((r) => r.json()).then(setBilling).catch(() => {});
    refreshRuns();
  }, [orgId]);

  useEffect(() => {
    if (!selectedRunId) {
      setStats(null);
      return;
    }
    fetch(`${API_BASE}/api/simulation/${encodeURIComponent(selectedRunId)}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStats(d))
      .catch(() => setStats(null));
  }, [selectedRunId, runs.length]);

  const activeRun = useMemo(() => runs.find((r) => r.id === selectedRunId) || null, [runs, selectedRunId]);

  const startSimulation = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          actor_user_id: user.id || 'user_analyst',
          scenario,
          origin_country: originCountry,
          target_country: targetCountry,
          target_sector: targetSector,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Unable to start simulation');
      setSelectedRunId(data.run_id || '');
      await refreshRuns();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const sendRunCommand = async (action) => {
    if (!selectedRunId) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(selectedRunId)}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Unable to ${action}`);
      await refreshRuns();
      if (action === 'replay') setStats((prev) => prev ? { ...prev, status: 'replaying' } : prev);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const replayRun = async () => {
    if (!selectedRunId) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(selectedRunId)}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed_multiplier: 1.5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Unable to replay simulation');
      await refreshRuns();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const sendResponseAction = async (action) => {
    if (!selectedRunId) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(selectedRunId)}/response-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          actor_user_id: user.id || 'user_analyst',
          action,
          target: activeRun?.target_country || targetCountry,
          notes: `Training action ${action}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Unable to record response action');
      if (selectedRunId) {
        const statsRes = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(selectedRunId)}/stats`);
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ color: '#29b6f6', fontWeight: 700, marginBottom: 4 }}>⚔️ Cyber War Room Simulation</div>
          <div style={{ fontSize: '0.68rem', color: '#8fb3c7' }}>
            Tenant: <strong>{user.organizationName || 'Default SOC Org'}</strong> · Role: <strong>{user.role}</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#b2dfdb' }}>
          <div>Plan: <strong>{billing?.subscription?.plan_code || user.subscription?.planCode || 'enterprise'}</strong></div>
          <div>Status: <strong>{billing?.subscription?.status || user.subscription?.status || 'active'}</strong></div>
          <div>Open invoices: <strong>{billing?.open_invoice_count ?? '—'}</strong></div>
        </div>
      </div>

      {!canOperate && (
        <div style={{ color: '#ffab91', fontSize: '0.7rem' }}>
          Your tenant role cannot launch simulations. Analyst or higher required.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10, opacity: canOperate ? 1 : 0.55 }}>
        <label style={{ fontSize: '0.68rem' }}>
          Scenario
          <select disabled={!canOperate} value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ width: '100%', marginTop: 4, background: '#0d1d2a', color: '#d7f1ff', border: '1px solid #25506a', borderRadius: 6, padding: 6 }}>
            {scenarios.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.68rem' }}>
          Origin country
          <input disabled={!canOperate} value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} style={{ width: '100%', marginTop: 4, background: '#0d1d2a', color: '#d7f1ff', border: '1px solid #25506a', borderRadius: 6, padding: 6 }} />
        </label>
        <label style={{ fontSize: '0.68rem' }}>
          Target country
          <input disabled={!canOperate} value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} style={{ width: '100%', marginTop: 4, background: '#0d1d2a', color: '#d7f1ff', border: '1px solid #25506a', borderRadius: 6, padding: 6 }} />
        </label>
        <label style={{ fontSize: '0.68rem' }}>
          Sector
          <input disabled={!canOperate} value={targetSector} onChange={(e) => setTargetSector(e.target.value)} style={{ width: '100%', marginTop: 4, background: '#0d1d2a', color: '#d7f1ff', border: '1px solid #25506a', borderRadius: 6, padding: 6 }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button disabled={!canOperate || busy} onClick={startSimulation} style={buttonStyle}>Start Simulation</button>
        <button disabled={!selectedRunId || busy} onClick={() => sendRunCommand('pause')} style={buttonStyle}>Pause</button>
        <button disabled={!selectedRunId || busy} onClick={() => sendRunCommand('resume')} style={buttonStyle}>Resume</button>
        <button disabled={!selectedRunId || busy} onClick={() => sendRunCommand('stop')} style={buttonStyle}>Stop</button>
        <button disabled={!selectedRunId || busy} onClick={replayRun} style={buttonStyle}>Replay</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button disabled={!selectedRunId || busy} onClick={() => sendResponseAction('block_ip')} style={buttonStyle}>Block IP</button>
        <button disabled={!selectedRunId || busy} onClick={() => sendResponseAction('isolate_device')} style={buttonStyle}>Isolate Device</button>
        <button disabled={!selectedRunId || busy} onClick={() => sendResponseAction('disable_user_account')} style={buttonStyle}>Disable User</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(260px, 1fr)', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#81d4fa', marginBottom: 6 }}>Recent tenant simulation runs</div>
          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #173548', borderRadius: 8 }}>
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRunId(run.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid #12293a',
                  background: selectedRunId === run.id ? '#123449' : 'transparent',
                  color: '#d7f1ff',
                  padding: '9px 10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>{run.scenario_key}</div>
                <div style={{ fontSize: '0.64rem', color: '#8fb3c7' }}>{run.origin_country} → {run.target_country} · {run.status}</div>
              </button>
            ))}
            {!runs.length && <div style={{ padding: 10, fontSize: '0.68rem', color: '#7fa1b5' }}>No tenant runs yet.</div>}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: '#81d4fa', marginBottom: 6 }}>Simulation statistics</div>
          <div style={{ border: '1px solid #173548', borderRadius: 8, padding: 10, minHeight: 220 }}>
            {!stats && <div style={{ fontSize: '0.68rem', color: '#7fa1b5' }}>Select a run to inspect detection and response metrics.</div>}
            {stats && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div><div style={{ color: '#7fa1b5', fontSize: '0.62rem' }}>Status</div><strong>{stats.status}</strong></div>
                  <div><div style={{ color: '#7fa1b5', fontSize: '0.62rem' }}>Events</div><strong>{stats.events_total}</strong></div>
                  <div><div style={{ color: '#7fa1b5', fontSize: '0.62rem' }}>Time to detection</div><strong>{stats.time_to_detection_seconds ?? '—'}s</strong></div>
                  <div><div style={{ color: '#7fa1b5', fontSize: '0.62rem' }}>Response effectiveness</div><strong>{stats.response_effectiveness}</strong></div>
                </div>
                <div style={{ fontSize: '0.66rem', color: '#c7dce8' }}>Attack progression</div>
                <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.66rem', color: '#9fc3d6' }}>
                  {(stats.attack_progression || []).slice(0, 6).map((step) => (
                    <li key={`${step.sequence_no}-${step.event_type}`}>{step.sequence_no}. {step.event_type} · {step.phase} · {step.severity}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {!!error && <div style={{ marginTop: 10, color: '#ff8a80', fontSize: '0.7rem' }}>{error}</div>}
    </div>
  );
}
