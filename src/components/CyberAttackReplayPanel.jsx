import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MitreKillChainBar from './MitreKillChainBar.jsx';
import ReplayAttackPathGraph from './ReplayAttackPathGraph.jsx';

const API_BASE = 'http://localhost:8000';

export default function CyberAttackReplayPanel() {
    const [scenarios, setScenarios] = useState([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState('');
    const [replay, setReplay] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [message, setMessage] = useState('');
    const [selectedEventIndex, setSelectedEventIndex] = useState(0);
    const [annotations, setAnnotations] = useState([]);
    const [annotationText, setAnnotationText] = useState('');
    const timerRef = useRef(null);

    const refreshScenarios = useCallback(() => {
        fetch(`${API_BASE}/api/replay/scenarios?limit=200`)
            .then((r) => r.json())
            .then((data) => {
                const arr = Array.isArray(data) ? data : [];
                setScenarios(arr);
                if (!selectedScenarioId && arr.length) {
                    setSelectedScenarioId(arr[0].scenario_id);
                }
            })
            .catch(() => {
                setMessage('Unable to load replay scenarios.');
            });
    }, [selectedScenarioId]);

    const loadReplay = useCallback((scenarioId) => {
        if (!scenarioId) return;
        fetch(`${API_BASE}/api/replay/${encodeURIComponent(scenarioId)}`)
            .then((r) => {
                if (!r.ok) throw new Error('Replay not found');
                return r.json();
            })
            .then((data) => {
                setReplay(data);
                setCurrentStep(0);
                setPlaying(false);
                setMessage('');
            })
            .catch(() => setMessage('Failed to load replay timeline.'));
    }, []);

    useEffect(() => {
        refreshScenarios();
    }, [refreshScenarios]);

    useEffect(() => {
        loadReplay(selectedScenarioId);
    }, [selectedScenarioId, loadReplay]);

    useEffect(() => {
        const handler = (e) => {
            const incidentId = e?.detail?.incidentId;
            if (!incidentId) return;
            setSelectedScenarioId(`incident_${incidentId}`);
        };
        window.addEventListener('openAttackReplay', handler);
        return () => window.removeEventListener('openAttackReplay', handler);
    }, []);

    useEffect(() => {
        if (!playing || !replay?.events?.length) return;
        const interval = Math.max(250, Math.floor(1200 / speed));
        timerRef.current = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev >= replay.events.length - 1) {
                    setPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, interval);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [playing, speed, replay]);

    const currentEvent = useMemo(() => {
        if (!replay?.events?.length) return null;
        return replay.events[Math.min(currentStep, replay.events.length - 1)];
    }, [replay, currentStep]);

    useEffect(() => {
        if (replay?.events?.length) {
            setSelectedEventIndex(Math.min(currentStep, replay.events.length - 1));
        }
    }, [currentStep, replay]);

    useEffect(() => {
        if (!currentEvent) return;
        window.dispatchEvent(
            new CustomEvent('replayPhaseChange', {
                detail: {
                    phase: currentEvent.phase || 'Investigation',
                    indicator: currentEvent.related_indicator || currentEvent.indicator || '',
                    eventType: currentEvent.type || '',
                },
            })
        );
    }, [currentEvent]);

    const rewind = () => {
        setPlaying(false);
        setCurrentStep(0);
    };

    const stepBack = () => setCurrentStep((s) => Math.max(0, s - 1));
    const stepForward = () => setCurrentStep((s) => Math.min((replay?.events?.length || 1) - 1, s + 1));

    const jumpToPhase = (phase) => {
        if (!replay?.events?.length) return;
        const idx = replay.events.findIndex((e) => e.phase === phase);
        if (idx >= 0) {
            setPlaying(false);
            setCurrentStep(idx);
            setSelectedEventIndex(idx);
        }
    };

    const exportTimeline = async (format) => {
        if (!selectedScenarioId || !selectedScenarioId.startsWith('incident_')) {
            setMessage('Export currently supports incident replay scenarios.');
            return;
        }
        const incidentId = selectedScenarioId.replace('incident_', '');
        const url = `${API_BASE}/api/attack-replay/${encodeURIComponent(incidentId)}/export?format=${format}`;
        try {
            if (format === 'json') {
                const data = await fetch(url).then((r) => r.json());
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `attack_replay_${incidentId}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
            } else {
                const blob = await fetch(url).then((r) => r.blob());
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `attack_replay_${incidentId}.pdf`;
                a.click();
                URL.revokeObjectURL(a.href);
            }
            setMessage(`Replay exported as ${format.toUpperCase()}.`);
        } catch {
            setMessage(`Failed to export ${format.toUpperCase()}.`);
        }
    };

    const fetchAnnotations = useCallback(() => {
        if (!selectedScenarioId) return;
        fetch(`${API_BASE}/api/replay/${encodeURIComponent(selectedScenarioId)}/annotations`)
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setAnnotations(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, [selectedScenarioId]);

    useEffect(() => {
        fetchAnnotations();
    }, [fetchAnnotations]);

    const addAnnotation = async () => {
        if (!annotationText.trim() || !selectedScenarioId) return;
        const step = currentStep + 1;
        try {
            const url = `${API_BASE}/api/replay/${encodeURIComponent(selectedScenarioId)}/annotations?step=${step}&text=${encodeURIComponent(annotationText.trim())}&author=analyst`;
            await fetch(url, { method: 'POST' });
            setAnnotationText('');
            fetchAnnotations();
        } catch {
            setMessage('Failed to add annotation.');
        }
    };

    const deleteAnnotation = async (annId) => {
        try {
            await fetch(`${API_BASE}/api/replay/annotations/${encodeURIComponent(annId)}`, { method: 'DELETE' });
            fetchAnnotations();
        } catch {
            setMessage('Failed to delete annotation.');
        }
    };

    const stepAnnotations = useMemo(() => {
        return annotations.filter((a) => a.step === currentStep + 1);
    }, [annotations, currentStep]);

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
                    CYBER ATTACK REPLAY SYSTEM
                </span>
                <button
                    onClick={refreshScenarios}
                    style={{ background: 'transparent', border: '1px solid #29b6f6', borderRadius: 4, color: '#29b6f6', cursor: 'pointer', fontSize: '0.72rem', padding: '3px 10px' }}
                >
                    ↺ Refresh
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '5px 8px', fontSize: '0.72rem', minWidth: 360 }}
                >
                    {!scenarios.length && <option value="">No scenarios</option>}
                    {scenarios.map((s) => (
                        <option key={s.scenario_id} value={s.scenario_id}>
                            {s.scenario_id} · {s.title} · {s.severity}
                        </option>
                    ))}
                </select>

                <button onClick={() => setPlaying((p) => !p)} disabled={!replay?.events?.length} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #4caf5066', background: 'transparent', color: '#4caf50', cursor: 'pointer' }}>
                    {playing ? 'Pause' : 'Play'}
                </button>
                <button onClick={rewind} disabled={!replay?.events?.length} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #29b6f666', background: 'transparent', color: '#29b6f6', cursor: 'pointer' }}>
                    Rewind
                </button>
                <button onClick={stepBack} disabled={!replay?.events?.length} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #9e9e9e66', background: 'transparent', color: '#9e9e9e', cursor: 'pointer' }}>
                    ◀ Step
                </button>
                <button onClick={stepForward} disabled={!replay?.events?.length} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #9e9e9e66', background: 'transparent', color: '#9e9e9e', cursor: 'pointer' }}>
                    Step ▶
                </button>

                <label style={{ fontSize: '0.68rem', color: '#78909c' }}>Speed</label>
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ background: '#0b1420', color: '#d0e8ff', border: '1px solid #1a3a4a', borderRadius: 5, padding: '4px 7px', fontSize: '0.68rem' }}>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                </select>

                <button onClick={() => exportTimeline('json')} disabled={!selectedScenarioId.startsWith('incident_')} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #8bc34a66', background: 'transparent', color: '#8bc34a', cursor: 'pointer' }}>
                    Export JSON
                </button>
                <button onClick={() => exportTimeline('pdf')} disabled={!selectedScenarioId.startsWith('incident_')} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ffc10766', background: 'transparent', color: '#ffc107', cursor: 'pointer' }}>
                    Export PDF
                </button>
            </div>

            {replay?.events?.length ? (
                <>
                    <div style={{ fontSize: '0.69rem', color: '#8ab4c7', marginBottom: 8 }}>
                        {replay.title} · Steps: {replay.total_steps} · Current: {currentStep + 1}/{replay.events.length}
                    </div>

                    {!!replay.bookmarks?.length && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {replay.bookmarks.map((b) => (
                                <button
                                    key={`${b.phase}-${b.step}`}
                                    onClick={() => jumpToPhase(b.phase)}
                                    style={{
                                        fontSize: '0.67rem',
                                        padding: '3px 8px',
                                        borderRadius: 999,
                                        border: '1px solid #29b6f655',
                                        background: 'rgba(41,182,246,0.06)',
                                        color: '#9fd8ff',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {b.phase} (step {b.step})
                                </button>
                            ))}
                        </div>
                    )}

                    <MitreKillChainBar scenarioId={selectedScenarioId} activePhase={currentEvent?.phase} />
                    <ReplayAttackPathGraph scenarioId={selectedScenarioId} currentStep={currentStep + 1} />

                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, replay.events.length - 1)}
                        value={currentStep}
                        onChange={(e) => {
                            setPlaying(false);
                            setCurrentStep(Number(e.target.value));
                        }}
                        style={{ width: '100%', marginBottom: 10 }}
                    />

                    <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.02)', marginBottom: 10 }}>
                        <div style={{ color: '#29b6f6', fontSize: '0.72rem', marginBottom: 4 }}>Current Frame</div>
                        {currentEvent ? (
                            <>
                                <div style={{ fontSize: '0.75rem', color: '#e8f4ff' }}>{currentEvent.step}. {currentEvent.title}</div>
                                <div style={{ fontSize: '0.7rem', color: '#8ab4c7', marginTop: 2 }}>
                                    {currentEvent.timestamp || 'N/A'} · {currentEvent.type} · {currentEvent.phase || 'Investigation'}
                                </div>
                                {currentEvent.mitre_technique && (
                                    <div style={{ fontSize: '0.69rem', color: '#ab47bc', marginTop: 2 }}>
                                        {currentEvent.mitre_technique}{currentEvent.mitre_label ? ` – ${currentEvent.mitre_label}` : ''}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.7rem', color: '#9fc3d7', marginTop: 5 }}>{currentEvent.description}</div>
                            </>
                        ) : (
                            <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>No replay frame available.</div>
                        )}
                    </div>

                    <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                        <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 5 }}>Event Detail Panel</div>
                        {replay.events[selectedEventIndex] ? (
                            <>
                                <div style={{ fontSize: '0.72rem', color: '#e8f4ff' }}>{replay.events[selectedEventIndex].title}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px,1fr))', gap: 6, marginTop: 6, fontSize: '0.68rem', color: '#8ab4c7' }}>
                                    <div>Source IP: {replay.events[selectedEventIndex].source_ip || replay.events[selectedEventIndex].src_ip || '—'}</div>
                                    <div>Target Asset: {replay.events[selectedEventIndex].target_asset || replay.events[selectedEventIndex].asset || '—'}</div>
                                    <div>Associated Alert: {replay.events[selectedEventIndex].associated_alert || '—'}</div>
                                    <div>Related Indicator: {replay.events[selectedEventIndex].related_indicator || replay.events[selectedEventIndex].indicator || '—'}</div>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>Select an event for detail.</div>
                        )}
                    </div>

                    {/* Annotations */}
                    <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                        <div style={{ color: '#78909c', fontSize: '0.72rem', marginBottom: 5 }}>
                            Analyst Annotations (Step {currentStep + 1})
                        </div>
                        {stepAnnotations.length > 0 ? (
                            stepAnnotations.map((a) => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <div style={{ fontSize: '0.68rem', color: '#c8e2f0' }}>
                                        <span style={{ color: '#66bb6a', marginRight: 6 }}>{a.author}:</span>
                                        {a.text}
                                    </div>
                                    <button
                                        onClick={() => deleteAnnotation(a.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ff525288', cursor: 'pointer', fontSize: '0.65rem', flexShrink: 0 }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div style={{ fontSize: '0.66rem', color: '#546e7a' }}>No annotations for this step.</div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <input
                                type="text"
                                value={annotationText}
                                onChange={(e) => setAnnotationText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addAnnotation(); }}
                                placeholder="Add a note…"
                                style={{
                                    flex: 1,
                                    background: '#0b1420',
                                    border: '1px solid #1a3a4a',
                                    borderRadius: 4,
                                    color: '#d0e8ff',
                                    fontSize: '0.68rem',
                                    padding: '4px 8px',
                                }}
                            />
                            <button
                                onClick={addAnnotation}
                                disabled={!annotationText.trim()}
                                style={{
                                    fontSize: '0.66rem',
                                    padding: '4px 10px',
                                    borderRadius: 4,
                                    border: '1px solid #66bb6a55',
                                    background: 'transparent',
                                    color: '#66bb6a',
                                    cursor: 'pointer',
                                }}
                            >
                                Add Note
                            </button>
                        </div>
                    </div>

                    <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, maxHeight: 220, overflowY: 'auto' }}>
                        {replay.events.map((ev, idx) => {
                            const active = idx === currentStep;
                            return (
                                <div
                                    key={`${ev.step}-${ev.timestamp}-${idx}`}
                                    onClick={() => setSelectedEventIndex(idx)}
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        marginBottom: 5,
                                        background: active ? 'rgba(41,182,246,0.14)' : (idx === selectedEventIndex ? 'rgba(171,71,188,0.12)' : 'transparent'),
                                        border: active ? '1px solid #29b6f655' : (idx === selectedEventIndex ? '1px solid #ab47bc55' : '1px solid transparent'),
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ fontSize: '0.72rem', color: active ? '#dff4ff' : '#c8e2f0' }}>
                                        {ev.step}. {ev.title}
                                    </div>
                                    <div style={{ fontSize: '0.66rem', color: '#6f8b99' }}>{ev.timestamp} · {ev.type} · {ev.phase || 'Investigation'}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div style={{ color: '#546e7a', fontSize: '0.72rem' }}>Select a scenario to replay.</div>
            )}

            {message && <div style={{ marginTop: 8, color: '#ffab91', fontSize: '0.7rem' }}>{message}</div>}
        </section>
    );
}
