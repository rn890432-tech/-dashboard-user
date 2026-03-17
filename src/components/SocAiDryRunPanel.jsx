import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:8000';

function DecisionCard({ title, decision, accent }) {
    return (
        <div style={{ border: `1px solid ${accent}55`, borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ color: accent, fontSize: '0.72rem', fontWeight: 700, marginBottom: 5 }}>{title}</div>
            {!decision ? (
                <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No decision yet.</div>
            ) : (
                <>
                    <div style={{ fontSize: '0.76rem', color: '#d0e8ff' }}>Action: <b>{decision.action}</b></div>
                    <div style={{ fontSize: '0.72rem', color: '#8ab4c7', marginTop: 3 }}>
                        Confidence: {Number(decision.confidence ?? 0).toFixed(2)}
                    </div>
                    {decision.classification && (
                        <div style={{ fontSize: '0.7rem', color: '#607d8b', marginTop: 3 }}>
                            Classification: {decision.classification}
                        </div>
                    )}
                    {decision.recommendation && (
                        <div style={{ fontSize: '0.7rem', color: '#9fc3d7', marginTop: 6 }}>
                            {decision.recommendation}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function SocAiDryRunPanel() {
    const [findings, setFindings] = useState([]);
    const [selectedAlertId, setSelectedAlertId] = useState('');
    const [dryRunResult, setDryRunResult] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const refresh = useCallback(() => {
        Promise.all([
            fetch(`${API_BASE}/api/ai-analyst/findings?limit=50`).then((r) => r.json()),
            fetch(`${API_BASE}/api/soc-ai/dry-run/logs?limit=20`).then((r) => r.json()),
        ]).then(([f, l]) => {
            const arr = Array.isArray(f) ? f : [];
            setFindings(arr);
            if (!selectedAlertId && arr.length) setSelectedAlertId(arr[0].id);
            setLogs(Array.isArray(l) ? l : []);
        }).catch(() => {
            // keep stale state
        });
    }, [selectedAlertId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const selectedAlert = useMemo(() => findings.find((f) => f.id === selectedAlertId), [findings, selectedAlertId]);

    const runDry = useCallback(() => {
        if (!selectedAlertId) return;
        setLoading(true);
        setMessage('');
        fetch(`${API_BASE}/api/soc-ai/dry-run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alert_id: selectedAlertId }),
        })
            .then((r) => r.json())
            .then((data) => {
                setDryRunResult(data);
                setMessage('Dry run complete. Compare before applying.');
                refresh();
            })
            .catch(() => setMessage('Dry run failed.'))
            .finally(() => setLoading(false));
    }, [selectedAlertId, refresh]);

    const applyChoice = useCallback((choice) => {
        const runId = dryRunResult?.dry_run_id;
        if (!runId) return;
        setLoading(true);
        fetch(`${API_BASE}/api/soc-ai/dry-run/${runId}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice }),
        })
            .then((r) => r.json())
            .then((data) => {
                setMessage(`Applied: ${data.applied_source} / ${data.applied_action}`);
                refresh();
            })
            .catch(() => setMessage('Failed to apply decision.'))
            .finally(() => setLoading(false));
    }, [dryRunResult, refresh]);

    return (
        <section
            style={{
                background: '#060c14',
                border: '1px solid #1a3a4a',
                borderRadius: 10,
                padding: 14,
                margin: '12px 0',
                color: '#d0e8ff',
                fontFamily: 'JetBrains Mono, monospace',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ color: '#29b6f6', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.84rem' }}>
                    SOC AI DRY-RUN COMPARISON
                </span>
                <button
                    onClick={refresh}
                    style={{ background: 'transparent', border: '1px solid #29b6f6', borderRadius: 4, color: '#29b6f6', cursor: 'pointer', fontSize: '0.72rem', padding: '3px 10px' }}
                >
                    ↺ Refresh
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <select
                    value={selectedAlertId}
                    onChange={(e) => setSelectedAlertId(e.target.value)}
                    style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '5px 8px', fontSize: '0.72rem', minWidth: 360 }}
                >
                    {!findings.length && <option value="">No alerts available</option>}
                    {findings.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.id.slice(0, 8)} · {f.alert_type} · {f.matched_indicator}
                        </option>
                    ))}
                </select>
                <button
                    disabled={loading || !selectedAlertId}
                    onClick={runDry}
                    style={{ background: '#ab47bc', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: '6px 10px' }}
                >
                    {loading ? 'Running…' : 'Run Dry-Run'}
                </button>
            </div>

            {selectedAlert && (
                <div style={{ marginBottom: 10, fontSize: '0.7rem', color: '#8ab4c7' }}>
                    Selected alert: {selectedAlert.alert_type} · {selectedAlert.matched_indicator}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DecisionCard title="Rule Engine Recommendation" decision={dryRunResult?.rule_engine_decision} accent="#29b6f6" />
                <DecisionCard title="LLM Recommendation" decision={dryRunResult?.llm_decision} accent="#ab47bc" />
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => applyChoice('rule_engine')} disabled={!dryRunResult || loading} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #29b6f666', color: '#29b6f6', background: 'transparent', cursor: 'pointer' }}>
                    Apply Rule Engine Decision
                </button>
                <button onClick={() => applyChoice('llm')} disabled={!dryRunResult || loading} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ab47bc66', color: '#ab47bc', background: 'transparent', cursor: 'pointer' }}>
                    Apply LLM Decision
                </button>
                <button onClick={() => applyChoice('none')} disabled={!dryRunResult || loading} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #9e9e9e66', color: '#9e9e9e', background: 'transparent', cursor: 'pointer' }}>
                    Take No Action
                </button>
                {message && <span style={{ fontSize: '0.7rem', color: '#8bc34a', alignSelf: 'center' }}>{message}</span>}
            </div>

            <div style={{ marginTop: 12, border: '1px solid #1a3a4a', borderRadius: 8, padding: 8 }}>
                <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 6 }}>Dry-Run Audit Log (latest)</div>
                <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                    {!logs.length && <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No dry-run records yet.</div>}
                    {logs.map((l) => (
                        <div key={l.id} style={{ fontSize: '0.68rem', color: '#9fc3d7', marginBottom: 5 }}>
                            {String(l.created_at || '').replace('T', ' ')} · {l.alert_id?.slice(0, 8)} · rule={l.rule_action} ({Number(l.rule_confidence || 0).toFixed(2)}) · llm={l.llm_action} ({Number(l.llm_confidence || 0).toFixed(2)}) · choice={l.analyst_choice || 'pending'}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
