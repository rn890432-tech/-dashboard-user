import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = 'http://localhost:8000';
const W = 980;
const H = 420;

const SEV_COLOR = {
  CRITICAL: '#ff1744',
  HIGH: '#ff6d00',
  MEDIUM: '#ffd54f',
  LOW: '#64dd17',
  INFO: '#29b6f6',
};

function project(lat, lon) {
  const x = ((lon + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return { x, y };
}

function buildArcPath(src, ctrl, dst) {
  const p1 = project(src.lat, src.lon);
  const pc = project(ctrl.ctrl_lat, ctrl.ctrl_lon);
  const p2 = project(dst.lat, dst.lon);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Q ${pc.x.toFixed(2)} ${pc.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

export default function GlobalLiveCyberAttackMap() {
  const [payload, setPayload] = useState({ attacks: [], severity_counts: {}, total_attacks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const wsRef = useRef(null);

  const fetchLive = () => {
    fetch(`${API_BASE}/api/cyber-map/live?limit=120`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPayload(data || { attacks: [] });
        setLoading(false);
        setError(null);
      })
      .catch((e) => {
        setError(String(e?.message || e));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLive();
    const timer = setInterval(fetchLive, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/stream');
      wsRef.current = ws;
      ws.onmessage = () => {
        fetchLive();
      };
      ws.onopen = () => {
        ws.send('subscribe');
      };
      return () => {
        try { ws.close(); } catch (e) { /* ignore */ }
      };
    } catch (e) {
      return undefined;
    }
  }, []);

  const attacks = useMemo(() => (payload.attacks || []).slice(0, 100), [payload.attacks]);

  return (
    <div
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
      <style>{`
        @keyframes pulseDot {
          0% { transform: scale(0.8); opacity: 0.55; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.55; }
        }
        @keyframes dashFlow {
          0% { stroke-dashoffset: 150; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: '#29b6f6', letterSpacing: '0.08em', fontSize: '0.92rem' }}>
          🌐 GLOBAL LIVE CYBER ATTACK MAP
        </div>
        <button
          onClick={fetchLive}
          style={{
            background: 'transparent',
            border: '1px solid #29b6f6',
            borderRadius: 4,
            color: '#29b6f6',
            cursor: 'pointer',
            fontSize: '0.7rem',
            padding: '3px 8px',
          }}
        >
          ↺ Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, fontSize: '0.67rem' }}>
        <span style={{ border: '1px solid #1a3a4a', borderRadius: 5, padding: '2px 8px', color: '#81d4fa' }}>
          Total: <strong>{payload.total_attacks || 0}</strong>
        </span>
        {Object.keys(SEV_COLOR).map((s) => (
          <span key={s} style={{ border: `1px solid ${SEV_COLOR[s]}66`, borderRadius: 5, padding: '2px 8px', color: SEV_COLOR[s] }}>
            {s}: <strong>{payload?.severity_counts?.[s] || 0}</strong>
          </span>
        ))}
      </div>

      {loading && <div style={{ color: '#29b6f6', fontSize: '0.74rem' }}>Loading world attack stream…</div>}
      {error && <div style={{ color: '#ef5350', fontSize: '0.74rem' }}>Map stream error: {error}</div>}

      {!loading && !error && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', borderRadius: 8, background: 'radial-gradient(circle at 30% 20%, #102236, #060b12 65%)' }}>
            {/* Graticule */}
            {Array.from({ length: 11 }).map((_, i) => {
              const y = (H / 10) * i;
              return <line key={`lat_${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#1f3547" strokeWidth="0.6" opacity="0.45" />;
            })}
            {Array.from({ length: 19 }).map((_, i) => {
              const x = (W / 18) * i;
              return <line key={`lon_${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#1f3547" strokeWidth="0.6" opacity="0.38" />;
            })}

            {/* Attack arcs and nodes */}
            {attacks.map((a, idx) => {
              const sev = String(a.severity || 'MEDIUM').toUpperCase();
              const color = SEV_COLOR[sev] || '#ffd54f';
              const source = a.source || {};
              const target = a.target || {};
              const arc = a.arc || { ctrl_lat: 0, ctrl_lon: 0 };
              const pSrc = project(Number(source.lat || 0), Number(source.lon || 0));
              const pDst = project(Number(target.lat || 0), Number(target.lon || 0));
              const pathD = buildArcPath(source, arc, target);
              const isSelected = selected?.id === a.id;

              return (
                <g key={a.id || idx} onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}>
                  <path
                    d={pathD}
                    stroke={color}
                    fill="none"
                    strokeWidth={isSelected ? 2.8 : 1.45}
                    strokeOpacity={isSelected ? 0.95 : 0.55}
                    strokeDasharray="5 4"
                    style={{ animation: 'dashFlow 1.5s linear infinite' }}
                  />
                  <circle cx={pSrc.x} cy={pSrc.y} r={isSelected ? 4.5 : 3} fill={color} style={{ animation: 'pulseDot 1.4s ease-in-out infinite' }} />
                  <circle cx={pDst.x} cy={pDst.y} r={isSelected ? 4 : 2.6} fill="#80cbc4" style={{ animation: 'pulseDot 1.2s ease-in-out infinite' }} />
                </g>
              );
            })}
          </svg>

          <div style={{ marginTop: 8, maxHeight: 128, overflowY: 'auto', border: '1px solid #1a3a4a', borderRadius: 6, padding: 8 }}>
            {attacks.slice(0, 12).map((a) => (
              <div
                key={`feed_${a.id}`}
                onClick={() => setSelected(a)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.66rem',
                  color: '#aac8dd',
                  marginBottom: 5,
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: SEV_COLOR[String(a.severity || 'MEDIUM').toUpperCase()] || '#ffd54f', fontWeight: 700 }}>
                  [{String(a.severity || 'MEDIUM').toUpperCase()}]
                </span>
                <span style={{ flex: 1 }}>{a.title}</span>
                <span style={{ color: '#78909c' }}>{a.source?.label} → {a.target?.label}</span>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: 8, border: '1px solid #29506b', borderRadius: 6, padding: 8, background: '#07131f' }}>
              <div style={{ fontSize: '0.7rem', color: '#81d4fa', marginBottom: 4 }}>
                Selected attack flow
              </div>
              <div style={{ fontSize: '0.67rem', color: '#cfe8ff' }}>
                <strong>{selected.title}</strong> · {selected.source?.label} → {selected.target?.label}
              </div>
              <div style={{ fontSize: '0.64rem', color: '#90a4ae', marginTop: 2 }}>
                Severity: {selected.severity} · Timestamp: {selected.timestamp || '—'}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
