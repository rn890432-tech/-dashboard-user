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

export default function ThreatCreateForm({ onCreated, onClose }) {
    const [form, setForm] = useState({
        threat_name: '',
        type: 'malware',
        mitre_technique: '',
        severity: 'HIGH',
        source_ip: '',
        indicator_domain: '',
        indicator_hash: '',
        description: '',
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
                ...form,
                source_ip: form.source_ip || null,
                indicator_domain: form.indicator_domain || null,
                indicator_hash: form.indicator_hash || null,
                mitre_technique: form.mitre_technique || null,
                dest_ip: null,
            };
            const r = await fetch(`${API_BASE}/threats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            setMessage(`Threat created: ${data.id}`);
            setForm({
                threat_name: '',
                type: 'malware',
                mitre_technique: '',
                severity: 'HIGH',
                source_ip: '',
                indicator_domain: '',
                indicator_hash: '',
                description: '',
            });
            if (onCreated) onCreated(data);
        } catch (err) {
            setError(err.message || 'Failed to create threat');
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
                    CREATE THREAT
                </div>
                {onClose && (
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #1a3a4a', color: '#9ab5c5', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Threat Name</label>
                    <input required value={form.threat_name} onChange={(e) => update('threat_name', e.target.value)} style={fieldStyle} />
                </div>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Threat Type</label>
                    <select value={form.type} onChange={(e) => update('type', e.target.value)} style={fieldStyle}>
                        <option value="malware">malware</option>
                        <option value="phishing">phishing</option>
                        <option value="credential_access">credential_access</option>
                        <option value="lateral_movement">lateral_movement</option>
                        <option value="data_exfiltration">data_exfiltration</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>MITRE ATT&CK Technique</label>
                    <input value={form.mitre_technique} onChange={(e) => update('mitre_technique', e.target.value)} placeholder="T1059" style={fieldStyle} />
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
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Indicator: IP</label>
                    <input value={form.source_ip} onChange={(e) => update('source_ip', e.target.value)} placeholder="185.94.111.22" style={fieldStyle} />
                </div>
                <div>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Indicator: Domain</label>
                    <input value={form.indicator_domain} onChange={(e) => update('indicator_domain', e.target.value)} placeholder="bad-control.example" style={fieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Indicator: Hash</label>
                    <input value={form.indicator_hash} onChange={(e) => update('indicator_hash', e.target.value)} placeholder="sha256:..." style={fieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', color: '#78909c' }}>Description</label>
                    <textarea rows={3} required value={form.description} onChange={(e) => update('description', e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
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
                    {submitting ? 'Creating…' : 'Create Threat'}
                </button>
                {message && <span style={{ color: '#4caf50', fontSize: '0.72rem' }}>{message}</span>}
                {error && <span style={{ color: '#ff5252', fontSize: '0.72rem' }}>{error}</span>}
            </div>
        </form>
    );
}
