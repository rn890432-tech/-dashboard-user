import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:8000';

export default function ThreatActorProfilePage() {
    const actorId = decodeURIComponent((window.location.pathname.split('/').pop() || '').trim());
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!actorId) {
            setError('Missing actor id');
            return;
        }
        fetch(`${API_BASE}/api/threat-intel/actors/${encodeURIComponent(actorId)}`)
            .then((r) => {
                if (!r.ok) throw new Error('Threat actor not found');
                return r.json();
            })
            .then((data) => {
                setProfile(data);
                setError('');
            })
            .catch((e) => setError(e.message || 'Unable to load profile'));
    }, [actorId]);

    return (
        <div style={{ minHeight: '100vh', background: '#02060d', color: '#d0e8ff', padding: 16, fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, color: '#29b6f6' }}>Threat Actor Profile</h2>
                <a href="/" style={{ color: '#81d4fa', textDecoration: 'none', border: '1px solid #81d4fa44', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                    ← Back to Dashboard
                </a>
            </div>

            {error && <div style={{ color: '#ff8a80' }}>{error}</div>}

            {profile && (
                <div style={{ border: '1px solid #1a3a4a', borderRadius: 10, padding: 12, background: '#06111b' }}>
                    <div style={{ color: '#ffd54f', fontSize: '1rem', marginBottom: 8 }}>{profile.actor_name}</div>
                    <div style={{ color: '#9fc3d7', fontSize: '0.75rem', marginBottom: 8 }}>{profile.historical_activity || 'No historical activity notes.'}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 10 }}>
                        <Section title="Aliases" items={profile.aliases} />
                        <Section title="Associated Malware" items={profile.associated_malware} />
                        <Section title="Known Campaigns" items={profile.known_campaigns} />
                        <Section title="Target Sectors" items={profile.target_industries} />
                        <Section title="Attack Techniques" items={profile.attack_techniques} />
                        <Section title="Known Infrastructure" items={[...(profile.known_ips || []), ...(profile.known_domains || [])]} />
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, items }) {
    const list = Array.isArray(items) ? items : [];
    return (
        <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 8, minHeight: 80 }}>
            <div style={{ color: '#80deea', fontSize: '0.72rem', marginBottom: 6 }}>{title}</div>
            {list.length ? (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.68rem', color: '#c4e2f2' }}>
                    {list.map((x, idx) => (
                        <li key={`${title}-${idx}`}>{x}</li>
                    ))}
                </ul>
            ) : (
                <div style={{ color: '#607d8b', fontSize: '0.66rem' }}>No data</div>
            )}
        </div>
    );
}
