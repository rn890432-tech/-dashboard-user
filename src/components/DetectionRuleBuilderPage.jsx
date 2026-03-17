import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const OPERATORS = [
  { value: 'equals',     label: 'equals' },
  { value: 'contains',   label: 'contains' },
  { value: 'startswith', label: 'starts with' },
  { value: 'endswith',   label: 'ends with' },
  { value: 'regex',      label: 'regex' },
  { value: 'gt',         label: '>' },
  { value: 'lt',         label: '<' },
  { value: 'gte',        label: '>=' },
  { value: 'lte',        label: '<=' },
  { value: 'exists',     label: 'exists' },
  { value: 'not_exists', label: 'does not exist' },
];
const NO_VALUE_OPS = new Set(['exists', 'not_exists']);

const SEV_COLOR = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const emptyCondition = () => ({ field: '', op: 'equals', value: '' });
const emptyRule = () => ({
  name: '',
  description: '',
  severity: 'MEDIUM',
  enabled: true,
  logic_op: 'AND',
  conditions: [emptyCondition()],
  mitre_technique: '',
  tags: '',
});

function ConditionRow({ cond, idx, onChange, onRemove }) {
  const needsValue = !NO_VALUE_OPS.has(cond.op);
  return (
    <div style={styles.condRow}>
      <span style={styles.condIdx}>#{idx + 1}</span>
      <input
        style={{ ...styles.input, width: 150 }}
        placeholder="field name"
        value={cond.field}
        onChange={e => onChange(idx, 'field', e.target.value)}
      />
      <select
        style={{ ...styles.input, width: 130 }}
        value={cond.op}
        onChange={e => onChange(idx, 'op', e.target.value)}
      >
        {OPERATORS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {needsValue && (
        <input
          style={{ ...styles.input, flex: 1 }}
          placeholder="value"
          value={cond.value}
          onChange={e => onChange(idx, 'value', e.target.value)}
        />
      )}
      <button style={styles.btnDanger} onClick={() => onRemove(idx)} title="Remove condition">✕</button>
    </div>
  );
}

function RuleFormModal({ rule, onSave, onClose }) {
  const [form, setForm] = useState(rule ? {
    name: rule.name || '',
    description: rule.description || '',
    severity: rule.severity || 'MEDIUM',
    enabled: rule.enabled !== false,
    logic_op: rule.logic_json?.logic_op || 'AND',
    conditions: rule.logic_json?.conditions?.length
      ? rule.logic_json.conditions.map(c => ({ ...c }))
      : [emptyCondition()],
    mitre_technique: rule.mitre_technique || '',
    tags: rule.tags || '',
  } : emptyRule());
  const [errors, setErrors] = useState([]);

  function updateCond(idx, key, val) {
    setForm(f => {
      const conds = [...f.conditions];
      conds[idx] = { ...conds[idx], [key]: val };
      return { ...f, conditions: conds };
    });
  }
  function removeCond(idx) {
    setForm(f => ({ ...f, conditions: f.conditions.filter((_, i) => i !== idx) }));
  }
  function addCond() {
    setForm(f => ({ ...f, conditions: [...f.conditions, emptyCondition()] }));
  }

  async function handleSave() {
    const errs = [];
    if (!form.name.trim()) errs.push('Name is required.');
    form.conditions.forEach((c, i) => {
      if (!c.field.trim()) errs.push(`Condition #${i + 1}: field is required.`);
    });
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    await onSave(form);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{rule ? 'Edit Rule' : 'New Detection Rule'}</span>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        {errors.length > 0 && (
          <div style={styles.errorBox}>{errors.map((e, i) => <div key={i}>{e}</div>)}</div>
        )}

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Name *</label>
            <input style={styles.input} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>Severity</label>
            <select style={styles.input} value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label style={styles.label}>Description</label>
        <textarea style={{ ...styles.input, height: 60, resize: 'vertical' }}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>MITRE Technique</label>
            <input style={styles.input} placeholder="e.g. T1059.001" value={form.mitre_technique}
              onChange={e => setForm(f => ({ ...f, mitre_technique: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>Tags (comma-separated)</label>
            <input style={styles.input} placeholder="lateral-movement, exfil" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '12px 0' }}>
          <div>
            <label style={styles.label}>Condition Logic</label>
            <div style={styles.toggleGroup}>
              {['AND', 'OR'].map(op => (
                <button key={op}
                  style={{ ...styles.toggleBtn, background: form.logic_op === op ? '#3b82f6' : '#1e293b' }}
                  onClick={() => setForm(f => ({ ...f, logic_op: op }))}
                >{op}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={styles.label}>Enabled</label>
            <input type="checkbox" checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
          </div>
        </div>

        <div style={styles.condBlock}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Conditions</span>
            <button style={styles.btnSecondary} onClick={addCond}>+ Add Condition</button>
          </div>
          {form.conditions.map((c, i) => (
            <ConditionRow key={i} cond={c} idx={i}
              onChange={updateCond} onRemove={removeCond} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave}>
            {rule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TestRuleModal({ rule, getHeaders, onClose }) {
  const [eventText, setEventText] = useState('{\n  "src_ip": "192.168.1.1",\n  "action": "login",\n  "status": "failed",\n  "count": 5\n}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function run() {
    let parsed;
    try { parsed = JSON.parse(eventText); } catch (e) { setErr('Invalid JSON.'); return; }
    setErr(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/rules/${rule.id}/test`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      setResult(await res.json());
    } catch (e) {
      setErr('Request failed.');
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: 560 }}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Test Rule: {rule.name}</span>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>
        <label style={styles.label}>Sample Event JSON</label>
        <textarea
          style={{ ...styles.input, height: 160, fontFamily: 'monospace', fontSize: 12 }}
          value={eventText}
          onChange={e => setEventText(e.target.value)}
        />
        {err && <div style={styles.errorBox}>{err}</div>}
        {result && (
          <div style={{
            padding: 12, borderRadius: 6, marginBottom: 12,
            background: result.matched ? '#14532d' : '#7f1d1d',
            color: '#fff', fontSize: 13,
          }}>
            <strong>{result.matched ? '✓ MATCH' : '✗ NO MATCH'}</strong>
            {' — '}{result.conditions_evaluated} condition(s) evaluated
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={styles.btnSecondary} onClick={onClose}>Close</button>
          <button style={styles.btnPrimary} onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetectionRuleBuilderPage() {
  const { getHeaders } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState(null); // null=closed, false=new, {rule}=edit
  const [testTarget, setTestTarget] = useState(null);
  const [filterSev, setFilterSev] = useState('ALL');
  const [filterEnabled, setFilterEnabled] = useState('ALL');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('rules'); // 'rules' | 'metrics' | 'alerts'

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/rules`, { headers: getHeaders() });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load rules', e);
    } finally { setLoading(false); }
  }, [getHeaders]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    const isEdit = formTarget && formTarget.id;
    try {
      if (isEdit) {
        await fetch(`${API}/api/rules/${formTarget.id}`, {
          method: 'PATCH',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name, description: form.description, severity: form.severity,
            enabled: form.enabled, logic_op: form.logic_op, conditions: form.conditions,
            mitre_technique: form.mitre_technique, tags: form.tags,
          }),
        });
        showToast('Rule updated.');
      } else {
        await fetch(`${API}/api/rules`, {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        showToast('Rule created.');
      }
      setFormTarget(null);
      load();
    } catch (e) {
      console.error('Save failed', e);
    }
  }

  async function toggleEnabled(rule) {
    await fetch(`${API}/api/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    showToast(`Rule ${rule.enabled ? 'disabled' : 'enabled'}.`);
    load();
  }

  async function deleteRule(rule) {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    await fetch(`${API}/api/rules/${rule.id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    showToast('Rule deleted.');
    load();
  }

  const displayed = rules.filter(r => {
    if (filterSev !== 'ALL' && r.severity !== filterSev) return false;
    if (filterEnabled === 'ENABLED' && !r.enabled) return false;
    if (filterEnabled === 'DISABLED' && r.enabled) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#f1f5f9' }}>Detection Rule Builder</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Create, edit and test tenant-scoped detection rules with visual condition blocks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tab === 'rules' && (
            <button style={styles.btnPrimary} onClick={() => setFormTarget(false)}>+ New Rule</button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {[
          { key: 'rules', label: '📋 Rules' },
          { key: 'metrics', label: '📊 Metrics' },
          { key: 'alerts', label: '🚨 Rule Alerts' },
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

      {tab === 'rules' && (
        <>
          <div style={styles.toolbar}>
            <input style={{ ...styles.input, width: 220 }} placeholder="Search by name…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ ...styles.input, width: 140 }} value={filterSev}
              onChange={e => setFilterSev(e.target.value)}>
              <option value="ALL">All Severities</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...styles.input, width: 130 }} value={filterEnabled}
              onChange={e => setFilterEnabled(e.target.value)}>
              <option value="ALL">All States</option>
              <option value="ENABLED">Enabled</option>
              <option value="DISABLED">Disabled</option>
            </select>
            <button style={styles.btnSecondary} onClick={load}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={styles.empty}>Loading rules…</div>
          ) : displayed.length === 0 ? (
            <div style={styles.empty}>No rules found. Create your first rule.</div>
          ) : (
            <div style={styles.grid}>
              {displayed.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => setFormTarget(rule)}
                  onToggle={() => toggleEnabled(rule)}
                  onDelete={() => deleteRule(rule)}
                  onTest={() => setTestTarget(rule)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'metrics' && <MetricsPanel getHeaders={getHeaders} />}
      {tab === 'alerts' && <RuleTriggeredAlertsPanel getHeaders={getHeaders} />}

      {formTarget !== null && (
        <RuleFormModal
          rule={formTarget || null}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}
      {testTarget && (
        <TestRuleModal
          rule={testTarget}
          getHeaders={getHeaders}
          onClose={() => setTestTarget(null)}
        />
      )}
    </div>
  );
}

// ── Metrics Panel ─────────────────────────────────────────────────────────────

function MetricsPanel({ getHeaders }) {
  const [data, setData] = useState(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/rules/metrics?hours=${hours}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [getHeaders, hours]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000); // auto-refresh every 30 s
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const statCard = (label, value, color) => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '14px 18px', flex: 1, minWidth: 120, textAlign: 'center', border: '1px solid #334155' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>Rule Execution Metrics</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>Window:</label>
          <select
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', padding: '5px 8px', fontSize: 12 }}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
          >
            <option value={1}>1 h</option>
            <option value={6}>6 h</option>
            <option value={24}>24 h</option>
            <option value={72}>72 h</option>
            <option value={168}>7 d</option>
          </select>
          <button
            style={{ background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
            onClick={load}
            disabled={loading}
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: '#fca5a5', fontSize: 12 }}>
          {error}
        </div>
      )}

      {data ? (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {statCard('Active Rules', data.active_rules, '#38bdf8')}
            {statCard('Evaluations', data.total_evaluations.toLocaleString(), '#94a3b8')}
            {statCard('Matches', data.total_matches, '#f59e0b')}
            {statCard('Alerts Generated', data.alerts_generated, '#f97316')}
            {statCard('Avg Latency', `${data.avg_latency_ms.toFixed(2)} ms`, '#a78bfa')}
          </div>

          {/* Per-rule table */}
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            Per-rule breakdown — last {data.window_hours}h
          </div>
          {data.per_rule.length === 0 ? (
            <div style={{ color: '#64748b', padding: '24px 0', textAlign: 'center' }}>
              No rule evaluation data in the selected window.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                    {['Rule Name', 'Severity', 'Evaluations', 'Matches', 'Hit Count', 'Avg Latency (ms)', 'Max Latency (ms)', 'Last Triggered'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.per_rule.map((r, i) => (
                    <tr key={r.rule_id} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                      <td style={{ padding: '7px 12px', color: '#e2e8f0' }}>{r.rule_name || r.rule_id}</td>
                      <td style={{ padding: '7px 12px' }}>
                        <span style={{ background: SEV_COLOR[r.severity] || '#64748b', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                          {r.severity}
                        </span>
                      </td>
                      <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{(r.evaluations || 0).toLocaleString()}</td>
                      <td style={{ padding: '7px 12px', color: r.matches > 0 ? '#fbbf24' : '#94a3b8', fontWeight: r.matches > 0 ? 700 : 400 }}>{r.matches || 0}</td>
                      <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{r.hit_count || 0}</td>
                      <td style={{ padding: '7px 12px', color: '#a5b4fc' }}>{(r.avg_latency_ms || 0).toFixed(3)}</td>
                      <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{(r.max_latency_ms || 0).toFixed(3)}</td>
                      <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 11 }}>
                        {r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : !loading ? (
        <div style={{ color: '#64748b', padding: '32px 0', textAlign: 'center' }}>No data available.</div>
      ) : null}
    </div>
  );
}

// ── Rule-Triggered Alerts Panel ───────────────────────────────────────────────

const ALERT_SEV_COLOR = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
const ANALYST_STATUS_COLOR = { new: '#3b82f6', 'in-progress': '#f59e0b', resolved: '#22c55e', escalated: '#a855f7', dismissed: '#64748b' };

function RuleTriggeredAlertsPanel({ getHeaders }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterRule, setFilterRule] = useState('');
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = filterRule
        ? `${API}/api/alerts/rule-triggered?rule_id=${encodeURIComponent(filterRule)}&limit=200`
        : `${API}/api/alerts/rule-triggered?limit=200`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts(await res.json());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [getHeaders, filterRule]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 20000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>
          Rule-Triggered Alerts
          {!loading && <span style={{ color: '#64748b', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({alerts.length})</span>}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', padding: '5px 10px', fontSize: 12, width: 180 }}
            placeholder="Filter by Rule ID…"
            value={filterRule}
            onChange={e => setFilterRule(e.target.value)}
          />
          <button
            style={{ background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
            onClick={load}
            disabled={loading}
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: '#fca5a5', fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading && alerts.length === 0 ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>
          No rule-triggered alerts yet. Ingest events with <code style={{ color: '#7dd3fc' }}>POST /api/telemetry</code> to trigger rules.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                {['Timestamp', 'Severity', 'Rule Name', 'Matched Indicator', 'Status', 'Alert ID'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #334155' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                  <td style={{ padding: '7px 12px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{ background: ALERT_SEV_COLOR[a.severity] || '#64748b', color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', color: '#e2e8f0', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.rule_name || a.rule_id || '—'}
                  </td>
                  <td style={{ padding: '7px 12px', color: '#7dd3fc', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.matched_indicator || '—'}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{
                      background: ANALYST_STATUS_COLOR[a.analyst_status] || '#334155',
                      color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {a.analyst_status || 'new'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>
                    {String(a.id).slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({ rule, onEdit, onToggle, onDelete, onTest }) {
  const logic = rule.logic_json || {};
  const conditions = logic.conditions || [];
  return (
    <div style={{ ...styles.card, opacity: rule.enabled ? 1 : 0.55 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 2 }}>{rule.name}</div>
          {rule.description && (
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rule.description}
            </div>
          )}
        </div>
        <span style={{ ...styles.badge, background: SEV_COLOR[rule.severity] || '#64748b', marginLeft: 8 }}>
          {rule.severity}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        Logic: <span style={{ color: '#93c5fd' }}>{logic.logic_op || 'AND'}</span>
        {' · '}{conditions.length} condition(s)
        {rule.mitre_technique && <> · <span style={{ color: '#a78bfa' }}>{rule.mitre_technique}</span></>}
      </div>

      {conditions.slice(0, 3).map((c, i) => (
        <div key={i} style={styles.condPill}>
          <span style={{ color: '#7dd3fc' }}>{c.field}</span>
          {' '}<span style={{ color: '#fbbf24' }}>{c.op}</span>
          {!NO_VALUE_OPS.has(c.op) && <> <span style={{ color: '#86efac' }}>{String(c.value).slice(0, 30)}</span></>}
        </div>
      ))}
      {conditions.length > 3 && (
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>+{conditions.length - 3} more…</div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <button style={styles.btnSecondary} onClick={onEdit}>Edit</button>
        <button style={styles.btnSecondary} onClick={onTest}>Test</button>
        <button style={{ ...styles.btnSecondary, color: rule.enabled ? '#fbbf24' : '#22c55e' }} onClick={onToggle}>
          {rule.enabled ? 'Disable' : 'Enable'}
        </button>
        <button style={{ ...styles.btnSecondary, color: '#f87171' }} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

const styles = {
  page: { background: '#0f172a', minHeight: '100vh', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#f1f5f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  tabBar: { display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 4 },
  tabBtn: { background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, fontSize: 13, padding: '6px 14px', cursor: 'pointer', borderRadius: '6px 6px 0 0', borderBottom: '2px solid transparent' },
  tabBtnActive: { color: '#38bdf8', borderBottom: '2px solid #38bdf8', background: '#1e293b' },
  toolbar: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  card: { background: '#1e293b', borderRadius: 10, padding: 16, border: '1px solid #334155' },
  empty: { textAlign: 'center', color: '#64748b', padding: 60 },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSecondary: { background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
  btnDanger: { background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12 },
  btnClose: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 },
  badge: { borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fff' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', borderRadius: 12, padding: 24, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: 700, fontSize: 16, color: '#f1f5f9' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  condBlock: { background: '#0f172a', borderRadius: 8, padding: 12, marginTop: 12 },
  condRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  condIdx: { color: '#64748b', fontSize: 11, minWidth: 24 },
  condPill: { background: '#0f172a', borderRadius: 4, padding: '3px 8px', fontSize: 11, marginBottom: 3 },
  errorBox: { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: '#fca5a5', fontSize: 12 },
  toggleGroup: { display: 'flex', gap: 4, marginTop: 2 },
  toggleBtn: { border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  toast: { position: 'fixed', top: 20, right: 24, background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' },
};
