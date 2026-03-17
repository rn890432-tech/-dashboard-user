import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SEV_COLOR = { CRITICAL: '#ff4444', HIGH: '#ff8800', MEDIUM: '#ffcc00', LOW: '#44cc88' };
const STATUS_COLOR = {
  open: '#4488ff',
  investigating: '#ff8800',
  contained: '#aa44ff',
  resolved: '#44cc88',
  closed: '#888',
};

const badge = (label, color) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 11, fontWeight: 700, background: color + '22', color,
    border: `1px solid ${color}44`,
  }}>{label.toUpperCase()}</span>
);

export default function CaseManagementPage() {
  const { user, getHeaders } = useAuth();
  const orgId = user?.orgId || 'org_default';

  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', severity: 'MEDIUM', assigned_analyst: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`${API}/api/cases?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCases(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, [orgId, filterStatus, getHeaders]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const openCase = async (caseId) => {
    setSelected(caseId);
    setDetail(null);
    try {
      const res = await fetch(`${API}/api/cases/${caseId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail(await res.json());
    } catch { /* silent */ }
  };

  const submitNote = async () => {
    if (!noteText.trim() || !selected) return;
    setNoteLoading(true);
    try {
      await fetch(`${API}/api/cases/${selected}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ text: noteText.trim(), author: user?.displayName || 'analyst' }),
      });
      setNoteText('');
      await openCase(selected);
    } catch { /* silent */ } finally { setNoteLoading(false); }
  };

  const patchStatus = async (caseId, newStatus) => {
    setPatchLoading(true);
    try {
      await fetch(`${API}/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchCases();
      if (selected === caseId) await openCase(caseId);
    } catch { /* silent */ } finally { setPatchLoading(false); }
  };

  const submitCreate = async () => {
    if (!createForm.title.trim()) return;
    setCreateLoading(true);
    try {
      await fetch(`${API}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ ...createForm, org_id: orgId, created_by: user?.displayName || 'analyst' }),
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', severity: 'MEDIUM', assigned_analyst: '' });
      await fetchCases();
    } catch { /* silent */ } finally { setCreateLoading(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0e1a', color: '#c8d8e8', fontFamily: 'monospace', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 340, borderRight: '1px solid #1e3a5a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #1e3a5a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#7ec8e3' }}>SOC CASE MANAGEMENT</span>
            <button
              onClick={() => setShowCreate(true)}
              style={{ padding: '4px 10px', background: '#1e5a3a', border: '1px solid #44cc88', borderRadius: 4, color: '#44cc88', cursor: 'pointer', fontSize: 12 }}
            >+ New Case</button>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: '4px 6px', fontSize: 12 }}
          >
            <option value="">All Statuses</option>
            {['open', 'investigating', 'contained', 'resolved', 'closed'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ padding: 16, color: '#7ec8e3', fontSize: 12 }}>Loading cases...</div>}
          {!loading && cases.length === 0 && (
            <div style={{ padding: 16, color: '#666', fontSize: 12 }}>No cases found. Create one to get started.</div>
          )}
          {cases.map(c => (
            <div
              key={c.id}
              onClick={() => openCase(c.id)}
              style={{
                padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #111a2e',
                background: selected === c.id ? '#0d1e36' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: selected === c.id ? '#7ec8e3' : '#c8d8e8' }}>
                {c.title}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {badge(c.severity || 'MEDIUM', SEV_COLOR[c.severity] || '#888')}
                {badge(c.status || 'open', STATUS_COLOR[c.status] || '#888')}
              </div>
              {c.assigned_analyst && (
                <div style={{ fontSize: 11, color: '#6699aa', marginTop: 4 }}>→ {c.assigned_analyst}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!detail && !selected && (
          <div style={{ color: '#4488aa', marginTop: 80, textAlign: 'center', fontSize: 14 }}>
            Select a case to view details
          </div>
        )}
        {selected && !detail && (
          <div style={{ color: '#7ec8e3', fontSize: 13 }}>Loading...</div>
        )}
        {detail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 8px', color: '#7ec8e3', fontSize: 20 }}>{detail.title}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {badge(detail.severity || 'MEDIUM', SEV_COLOR[detail.severity] || '#888')}
                  {badge(detail.status || 'open', STATUS_COLOR[detail.status] || '#888')}
                  {detail.assigned_analyst && (
                    <span style={{ fontSize: 12, color: '#6699aa' }}>Assigned: {detail.assigned_analyst}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['investigating', 'contained', 'resolved'].map(s => (
                  <button
                    key={s} onClick={() => patchStatus(detail.id, s)} disabled={patchLoading || detail.status === s}
                    style={{
                      padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
                      background: detail.status === s ? '#1e3a1e' : '#111a2e',
                      border: `1px solid ${STATUS_COLOR[s] || '#444'}`,
                      color: STATUS_COLOR[s] || '#888', opacity: detail.status === s ? 0.5 : 1,
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            {detail.description && (
              <div style={{ marginBottom: 20, padding: 12, background: '#0d1526', borderRadius: 6, border: '1px solid #1e3a5a', fontSize: 13, lineHeight: 1.6 }}>
                {detail.description}
              </div>
            )}

            <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1 }}>
              Timeline
            </div>
            <div style={{ marginBottom: 20 }}>
              {(detail.timeline || []).map((ev, i) => (
                <div key={ev.id || i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 2, background: '#1e3a5a', borderRadius: 1, flexShrink: 0, position: 'relative', marginLeft: 8 }} />
                  <div style={{ flex: 1, padding: 10, background: '#0d1526', borderRadius: 6, border: '1px solid #1a2e44' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#7ec8e3', fontWeight: 700 }}>{ev.event_type?.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: '#4a6a7a' }}>{ev.created_at?.slice(0, 19)?.replace('T', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>{ev.description}</div>
                    {ev.actor && ev.actor !== 'system' && (
                      <div style={{ fontSize: 11, color: '#6699aa', marginTop: 4 }}>by {ev.actor}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#7ec8e3', textTransform: 'uppercase', letterSpacing: 1 }}>
              Add Note
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Enter investigation note..."
                style={{
                  flex: 1, minHeight: 64, background: '#0d1526', color: '#c8d8e8',
                  border: '1px solid #1e3a5a', borderRadius: 6, padding: 10, font: 'inherit', fontSize: 13, resize: 'vertical',
                }}
              />
              <button
                onClick={submitNote} disabled={noteLoading || !noteText.trim()}
                style={{
                  padding: '8px 16px', background: '#1a3a5a', border: '1px solid #4488ff', borderRadius: 6,
                  color: '#4488ff', cursor: 'pointer', fontSize: 13, alignSelf: 'flex-start',
                  opacity: !noteText.trim() ? 0.5 : 1,
                }}
              >{noteLoading ? '...' : 'Add'}</button>
            </div>
          </>
        )}
      </div>

      {/* Create case modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: '#0a1526', border: '1px solid #1e3a5a', borderRadius: 8, padding: 24, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px', color: '#7ec8e3' }}>New SOC Case</h3>
            {[
              { label: 'Title *', key: 'title', type: 'input' },
              { label: 'Description', key: 'description', type: 'textarea' },
              { label: 'Assigned Analyst', key: 'assigned_analyst', type: 'input' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#7ec8e3', marginBottom: 4 }}>{label}</div>
                {type === 'textarea' ? (
                  <textarea
                    value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: 8, font: 'inherit', fontSize: 13, minHeight: 64, boxSizing: 'border-box', resize: 'vertical' }}
                  />
                ) : (
                  <input
                    value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#7ec8e3', marginBottom: 4 }}>Severity</div>
              <select
                value={createForm.severity}
                onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value }))}
                style={{ background: '#0d1526', color: '#c8d8e8', border: '1px solid #1e3a5a', borderRadius: 4, padding: 8, fontSize: 13 }}
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '6px 16px', background: 'transparent', border: '1px solid #444', borderRadius: 4, color: '#888', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitCreate} disabled={createLoading || !createForm.title.trim()} style={{ padding: '6px 16px', background: '#1a3a5a', border: '1px solid #4488ff', borderRadius: 4, color: '#4488ff', cursor: 'pointer' }}>
                {createLoading ? 'Creating...' : 'Create Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
