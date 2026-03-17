import React, { useState } from 'react';

const API_BASE = 'http://localhost:8000';

const fieldStyle = {
    width: '100%',
    background: '#0b1420',
    color: '#d0e8ff',
    border: '1px solid #1a3a4a',
    borderRadius: 6,
    padding: '8px 10px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.78rem',
};

export default function IncidentCreateForm({ onCreated, onClose }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        severity: 'MEDIUM',
        status: 'open',
        affectedAssets: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setMessage('');
        try {
            const payload = {
                title: form.title,
                description: form.description,
                severity: form.severity,
                status: form.status,
                affected_assets: form.affectedAssets
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            const r = await fetch(`${API_BASE}/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            setMessage(`Incident created: ${data.id}`);
            setForm({
                title: '',
                description: '',
                severity: 'MEDIUM',
                status: 'open',
                affectedAssets: '',
            });
            if (onCreated) onCreated(data);
        } catch (err) {
            setError(err.message || 'Failed to create incident');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            style={{
                background: '#060c14',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 14,
                color: '#d0e8ff',
                fontFamily: 'JetBrains Mono, monospace',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ color: '#29b6f6', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.85rem' }}>
                    CREATE INCIDENT
                </div>
                {onClose && (
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #1a3a4a', color: '#9ab5c5', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Title</label>
                    <input required value={form.title} onChange={(e) => update('title', e.target.value)} style={fieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Description</label>
                    <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Severity</label>
                    <select value={form.severity} onChange={(e) => update('severity', e.target.value)} style={fieldStyle}>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Status</label>
                    <select value={form.status} onChange={(e) => update('status', e.target.value)} style={fieldStyle}>
                        <option value="open">open</option>
                        <option value="investigating">investigating</option>
                        <option value="contained">contained</option>
                        <option value="resolved">resolved</option>
                        <option value="closed">closed</option>
                    </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Affected Assets (comma-separated)</label>
                    <input value={form.affectedAssets} onChange={(e) => update('affectedAssets', e.target.value)} placeholder="srv-db-01, payroll-api, user-laptop-22" style={fieldStyle} />
                </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                    disabled={submitting}
                    type="submit"
                    style={{
                        background: '#29b6f6',
                        border: 'none',
                        borderRadius: 6,
                        color: '#001018',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        padding: '8px 12px',
                    }}
                >
                    {submitting ? 'Creating…' : 'Create Incident'}
                </button>
                {message && <span style={{ color: '#4caf50', fontSize: '0.72rem' }}>{message}</span>}
                {error && <span style={{ color: '#ff5252', fontSize: '0.72rem' }}>{error}</span>}
            </div>
        </form>
    );
}
