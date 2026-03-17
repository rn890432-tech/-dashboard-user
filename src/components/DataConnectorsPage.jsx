import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TYPE_ICONS = {
  siem: '📊', edr: '🛡️', firewall: '🔥', cloud_trail: '☁️',
  threat_feed: '🌐', ticketing: '🎫', email: '✉️', dns: '🌍',
};

const STATUS_COLOR = { active: '#44cc88', inactive: '#888', error: '#ff4444', pending: '#ffcc00' };

function badge(label, color) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, background: (color || '#888') + '22',
      color: color || '#888', border: `1px solid ${color || '#888'}44`,
    }}>{label.toUpperCase()}</span>
  );
}

export default function DataConnectorsPage() {
  const { user, getHeaders } = useAuth();
  const orgId = user?.orgId || 'org_default';

  const [connectors, setConnectors] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', connector_type: '', config: {} });
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [patchLoading, setPatchLoading] = useState({});

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/connectors?org_id=${encodeURIComponent(orgId)}`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      setConnectors(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, [orgId, getHeaders]);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/connectors/types`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTypes(data.types || []);
      if (!createForm.connector_type && data.types?.length) {
        setCreateForm(f => ({ ...f, connector_type: data.types[0] }));
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getHeaders]);

  useEffect(() => {
    fetchConnectors();
    fetchTypes();
  }, [fetchConnectors, fetchTypes]);

  const testConnector = async (id) => {
    setTestLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`${API}/api/connectors/${id}/test`, { method: 'POST', headers: getHeaders() });
      const data = await res.json();
      setTestResults(r => ({ ...r, [id]: data }));
      await fetchConnectors();
    } catch { /* silent */ } finally { setTestLoading(l => ({ ...l, [id]: false })); }
  };

  const toggleStatus = async (connector) => {
    const newStatus = connector.status === 'active' ? 'inactive' : 'active';
    setPatchLoading(l => ({ ...l, [connector.id]: true }));
    try {
      await fetch(`${API}/api/connectors/${connector.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchConnectors();
    } catch { /* silent */ } finally { setPatchLoading(l => ({ ...l, [connector.id]: false })); }
  };

  const deleteConnector = async (id) => {
    setDeleteLoading(l => ({ ...l, [id]: true }));
    try {
      await fetch(`${API}/api/connectors/${id}`, { method: 'DELETE', headers: getHeaders() });
      await fetchConnectors();
    } catch { /* silent */ } finally { setDeleteLoading(l => ({ ...l, [id]: false })); }
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || !createForm.connector_type) return;
    setCreateLoading(true);
    try {
      await fetch(`${API}/api/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({
          name: createForm.name.trim(),
          connector_type: createForm.connector_type,
          config: createForm.config,
          org_id: orgId,
          created_by: user?.displayName || 'analyst',
        }),
      });
      setShowCreate(false);
      setCreateForm(f => ({ ...f, name: '', config: {} }));
      await fetchConnectors();
    } catch { /* silent */ } finally { setCreateLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#c8d8e8', fontFamily: 'monospace', padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#7ec8e3', letterSpacing: 1 }}>DATA CONNECTORS</h1>
          <div style={{ fontSize: 12, color: '#4a6a7a', marginTop: 4 }}>
            Org: <span style={{ color: '#7ec8e3' }}>{orgId}</span>
            <span style={{ marginLeft: 12 }}>{connectors.length} connector{connectors.length !== 1 ? 's' : ''} configured</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchConnectors} disabled={loading}
            style={{ padding: '6px 14px', background: '#0d1e36', border: '1px solid #1e3a5a', borderRadius: 6, color: '#7ec8e3', cursor: 'pointer', fontSize: 12 }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '6px 14px', background: '#1e5a3a', border: '1px solid #44cc88', borderRadius: 6, color: '#44cc88', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            + Add Connector
          </button>
        </div>
      </div>

      {/* Connector grid */}
      {loading && connectors.length === 0 && (
        <div style={{ color: '#7ec8e3', fontSize: 13, padding: 24 }}>Loading connectors...</div>
      )}
      {!loading && connectors.length === 0 && (
        <div style={{ color: '#666', fontSize: 13, padding: 24, textAlign: 'center', border: '1px dashed #1e3a5a', borderRadius: 8 }}>
          No connectors configured. Add one to start ingesting data.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {connectors.map(conn => {
          const statusColor = STATUS_COLOR[conn.status] || '#888';
          const icon = TYPE_ICONS[conn.connector_type] || '🔌';
          const testResult = testResults[conn.id];
          return (
            <div key={conn.id} style={{ background: '#0a1526', border: `1px solid ${statusColor}33`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#c8d8e8', fontSize: 14 }}>{conn.name}</div>
                    <div style={{ fontSize: 11, color: '#6699aa', textTransform: 'uppercase', letterSpacing: 1 }}>{conn.connector_type}</div>
                  </div>
                </div>
                {badge(conn.status || 'unknown', statusColor)}
              </div>

              <div style={{ fontSize: 12, color: '#6699aa', marginBottom: 10, lineHeight: 1.8 }}>
                {conn.last_synced_at && (
                  <div>Last sync: <span style={{ color: '#8aaabb' }}>{conn.last_synced_at.slice(0, 19).replace('T', ' ')}</span></div>
                )}
                {conn.events_ingested != null && (
                  <div>Events ingested: <span style={{ color: '#44cc88', fontWeight: 700 }}>{conn.events_ingested.toLocaleString()}</span></div>
                )}
                {conn.created_at && (
                  <div>Created: <span style={{ color: '#8aaabb' }}>{conn.created_at.slice(0, 10)}</span></div>
                )}
              </div>

              {testResult && (
                <div style={{ marginBottom: 10, padding: 8, background: '#0d1e1a', borderRadius: 6, border: '1px solid #44cc8833', fontSize: 11 }}>
                  <span style={{ color: '#44cc88', fontWeight: 700 }}>✓ Test OK</span>
                  {' — '}{testResult.events_sampled} events sampled
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => testConnector(conn.id)} disabled={testLoading[conn.id]}
                  style={{ padding: '4px 12px', background: '#1a3a5a', border: '1px solid #4488ff', borderRadius: 4, color: '#4488ff', cursor: 'pointer', fontSize: 11 }}
                >{testLoading[conn.id] ? 'Testing...' : '▶ Test'}</button>
                <button
                  onClick={() => toggleStatus(conn)} disabled={patchLoading[conn.id]}
                  style={{
                    padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                    background: conn.status === 'active' ? '#2a1a1a' : '#1a2a1a',
                    border: `1px solid ${conn.status === 'active' ? '#ff444466' : '#44cc8866'}`,
                    color: conn.status === 'active' ? '#ff8888' : '#88cc88',
                  }}
                >{patchLoading[conn.id] ? '...' : conn.status === 'active' ? '⏸ Disable' : '▶ Enable'}</button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete connector "${conn.name}"?`)) deleteConnector(conn.id);
                  }}
                  disabled={deleteLoading[conn.id]}
                  style={{ padding: '4px 12px', background: '#2a1a1a', border: '1px solid #ff444444', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 11 }}
                >{deleteLoading[conn.id] ? '...' : '✕ Delete'}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create connector modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 8, padding: 28, width: 440, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px', color: '#7ec8e3', fontSize: 16 }}>Add Data Connector</h3>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#7ec8e3', marginBottom: 4 }}>Connector Name *</div>
              <input
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Corporate Firewall"
                style={{ width: '100%', background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#7ec8e3', marginBottom: 4 }}>Connector Type *</div>
              <select
                value={createForm.connector_type}
                onChange={e => setCreateForm(f => ({ ...f, connector_type: e.target.value }))}
                style={{ width: '100%', background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
              >
                {types.map(t => (
                  <option key={t} value={t}>{TYPE_ICONS[t] || ''} {t.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 11, color: '#4a6a7a', marginBottom: 20 }}>
              Credentials and advanced config can be added after creation.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '6px 16px', background: 'transparent', border: '1px solid #444', borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={submitCreate} disabled={createLoading || !createForm.name.trim()}
                style={{ padding: '6px 16px', background: '#1a3a5a', border: '1px solid #4488ff', borderRadius: 4, color: '#4488ff', cursor: 'pointer', fontSize: 13, opacity: !createForm.name.trim() ? 0.5 : 1 }}
              >{createLoading ? 'Creating...' : 'Add Connector'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
