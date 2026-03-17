import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

const SEVERITY_COLORS = {
  LOW: '#ffd54f',
  MEDIUM: '#ff9800',
  HIGH: '#ff1744',
  CRITICAL: '#ab47bc',
};

const COUNTRY_BOUNDARIES = {
  'United States': [
    [49, -125], [44, -123], [41, -124], [37, -122], [33, -117], [30, -114], [28, -107], [26, -98], [27, -90], [30, -84], [33, -81], [36, -76], [41, -71], [45, -68], [48, -95], [49, -125],
  ],
  Russia: [
    [69, 32], [66, 40], [65, 55], [62, 75], [61, 95], [60, 118], [61, 140], [63, 165], [67, 179], [70, 160], [71, 130], [71, 95], [70, 65], [69, 32],
  ],
  China: [
    [53, 74], [49, 87], [45, 96], [43, 110], [40, 121], [32, 123], [24, 120], [21, 112], [22, 103], [24, 95], [29, 86], [36, 79], [44, 75], [53, 74],
  ],
  Germany: [
    [55, 6], [54, 9], [53, 14], [51, 15], [49, 13], [47, 10], [48, 7], [50, 6], [52, 7], [55, 6],
  ],
  Brazil: [
    [5, -73], [1, -67], [-4, -60], [-9, -53], [-15, -45], [-20, -43], [-27, -48], [-32, -54], [-30, -60], [-24, -66], [-16, -70], [-7, -72], [5, -73],
  ],
  'United Kingdom': [
    [58, -7], [56, -5], [54, -4], [52, -2], [51, -1], [50, -3], [51, -5], [53, -6], [56, -6], [58, -7],
  ],
  India: [
    [35, 68], [32, 73], [29, 77], [26, 81], [23, 85], [21, 88], [17, 87], [12, 80], [9, 76], [14, 74], [19, 72], [24, 70], [29, 69], [35, 68],
  ],
  Australia: [
    [-11, 113], [-16, 121], [-22, 131], [-27, 138], [-33, 146], [-38, 145], [-35, 133], [-31, 124], [-23, 116], [-16, 113], [-11, 113],
  ],
  Japan: [
    [45, 141], [41, 142], [38, 141], [35, 139], [33, 136], [31, 131], [34, 130], [37, 134], [40, 139], [43, 141], [45, 141],
  ],
};

const SEVERITY_SPEED = {
  LOW: 0.18,
  MEDIUM: 0.28,
  HIGH: 0.4,
  CRITICAL: 0.58,
};

const QUALITY_PROFILES = {
  standard: {
    globeSegments: 64,
    starsCount: 4000,
    starsFactor: 2.2,
    maxArcs3D: 90,
    maxItems: 140,
    maxSimulated: 80,
    arcCurvePoints: 24,
    dpr: [1, 2],
    boundaryStep: 1,
    pollMs: 5000,
    apiLimit: 180,
    wsDebounceMs: 220,
  },
  performance: {
    globeSegments: 32,
    starsCount: 1200,
    starsFactor: 1.4,
    maxArcs3D: 42,
    maxItems: 75,
    maxSimulated: 42,
    arcCurvePoints: 16,
    dpr: [1, 1.25],
    boundaryStep: 2,
    pollMs: 8000,
    apiLimit: 120,
    wsDebounceMs: 320,
  },
  stream: {
    globeSegments: 24,
    starsCount: 500,
    starsFactor: 1.1,
    maxArcs3D: 28,
    maxItems: 60,
    maxSimulated: 24,
    arcCurvePoints: 10,
    dpr: [1, 1],
    boundaryStep: 3,
    pollMs: 10000,
    apiLimit: 90,
    wsDebounceMs: 450,
  },
};

function dedupeRecentAttacks(primary, secondary, limit) {
  const seen = new Set();
  const merged = [];
  [...(primary || []), ...(secondary || [])].forEach((attack) => {
    const id = String(attack?.id || '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(attack);
  });
  return merged.slice(0, limit);
}

function useGlobePerformanceMetrics({ activeArcCount, qualityName, wsEventsRef, fetchDurationRef }) {
  const [metrics, setMetrics] = useState({ fps: 0, activeArcCount: 0, eventThroughput: 0, fetchMs: 0, qualityName: 'standard' });

  useEffect(() => {
    let rafId = 0;
    let lastSample = performance.now();
    let frames = 0;
    const tick = (now) => {
      frames += 1;
      if (now - lastSample >= 1000) {
        const fps = Math.round((frames * 1000) / (now - lastSample));
        setMetrics((prev) => ({ ...prev, fps, activeArcCount, qualityName }));
        frames = 0;
        lastSample = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeArcCount, qualityName]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const throughput = wsEventsRef.current;
      wsEventsRef.current = 0;
      setMetrics((prev) => ({
        ...prev,
        activeArcCount,
        eventThroughput: throughput,
        fetchMs: Math.round(fetchDurationRef.current || 0),
        qualityName,
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeArcCount, qualityName, wsEventsRef, fetchDurationRef]);

  return metrics;
}

function GlobePerformancePanel({ metrics }) {
  return (
    <div style={{ border: '1px solid #2f3d23', borderRadius: 8, padding: 10, background: '#09120d' }}>
      <div style={{ fontSize: '0.76rem', color: '#9ccc65', marginBottom: 6, fontWeight: 700 }}>Performance Metrics</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.66rem' }}>
        <span style={{ border: '1px solid #35512c', borderRadius: 999, padding: '2px 8px', color: '#b2ff59' }}>FPS: <strong>{metrics.fps}</strong></span>
        <span style={{ border: '1px solid #35512c', borderRadius: 999, padding: '2px 8px', color: '#aed581' }}>Active arcs: <strong>{metrics.activeArcCount}</strong></span>
        <span style={{ border: '1px solid #35512c', borderRadius: 999, padding: '2px 8px', color: '#c5e1a5' }}>Events/sec: <strong>{metrics.eventThroughput}</strong></span>
        <span style={{ border: '1px solid #35512c', borderRadius: 999, padding: '2px 8px', color: '#dcedc8' }}>Fetch: <strong>{metrics.fetchMs}ms</strong></span>
        <span style={{ border: '1px solid #35512c', borderRadius: 999, padding: '2px 8px', color: '#dce775' }}>Profile: <strong>{metrics.qualityName}</strong></span>
      </div>
    </div>
  );
}

function AIAttackPredictionPanel({ payload, metrics }) {
  const prediction = useMemo(() => {
    const topType = payload?.top_attack_types?.[0]?.name || 'suspicious_activity';
    const topCountry = payload?.top_attacking_countries?.[0]?.name || 'Unknown';
    const topSector = payload?.most_targeted_sectors?.[0]?.name || 'Enterprise';
    const critical = Number(payload?.severity_counts?.CRITICAL || 0);
    const rate = Number(payload?.attacks_per_minute || 0);
    const velocity = Number(metrics?.eventThroughput || 0);
    const riskScore = Math.min(99, Math.round((critical * 8) + (rate * 0.6) + (velocity * 2.5)));
    const nextPhase = topType.includes('credential') || topType.includes('brute')
      ? 'credential theft and privilege escalation'
      : topType.includes('phishing')
        ? 'payload execution and mailbox compromise'
        : topType.includes('exfil')
          ? 'sustained outbound exfiltration'
          : 'follow-on multi-vector activity';
    const recommendation = topSector === 'Finance'
      ? 'Prioritize identity hardening, SWIFT/payment telemetry, and egress guardrails.'
      : topSector === 'Government'
        ? 'Escalate attribution correlation and protect privileged remote access paths.'
        : 'Increase correlation depth and pre-stage containment actions for high-confidence indicators.';
    return { topType, topCountry, topSector, riskScore, nextPhase, recommendation };
  }, [payload, metrics]);

  return (
    <div style={{ border: '1px solid #3f2f4e', borderRadius: 8, padding: 10, background: '#120b18' }}>
      <div style={{ fontSize: '0.76rem', color: '#ce93d8', marginBottom: 6, fontWeight: 700 }}>AI Attack Prediction Engine</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.66rem', color: '#e1bee7' }}>
        <div><strong>Predicted next wave</strong><div style={{ color: '#d1c4e9' }}>{prediction.nextPhase}</div></div>
        <div><strong>Likely origin</strong><div style={{ color: '#d1c4e9' }}>{prediction.topCountry}</div></div>
        <div><strong>Likely target sector</strong><div style={{ color: '#d1c4e9' }}>{prediction.topSector}</div></div>
        <div><strong>Dominant technique</strong><div style={{ color: '#d1c4e9' }}>{prediction.topType}</div></div>
      </div>
      <div style={{ marginTop: 8, fontSize: '0.66rem', color: '#f3e5f5' }}>
        Risk score: <strong>{prediction.riskScore}/99</strong>
      </div>
      <div style={{ marginTop: 6, fontSize: '0.64rem', color: '#d1c4e9' }}>{prediction.recommendation}</div>
    </div>
  );
}

const TRAINING_SCENARIOS = {
  mixed: {
    label: 'Mixed Threat Storm',
    attacks: [
      { src_country: 'Russia', src: [61, 105], dst_country: 'United States', dst: [38, -97], attack_type: 'brute_force', severity: 'HIGH' },
      { src_country: 'China', src: [35, 103], dst_country: 'Germany', dst: [51, 10], attack_type: 'exploit_attempt', severity: 'CRITICAL' },
      { src_country: 'Brazil', src: [-14, -51], dst_country: 'United Kingdom', dst: [55, -3], attack_type: 'phishing_campaign', severity: 'MEDIUM' },
      { src_country: 'India', src: [21, 78], dst_country: 'Japan', dst: [36, 138], attack_type: 'credential_access', severity: 'HIGH' },
    ],
  },
  ransomware: {
    label: 'Ransomware Drill',
    attacks: [
      { src_country: 'Russia', src: [60, 90], dst_country: 'Germany', dst: [51, 10], attack_type: 'ransomware_delivery', severity: 'CRITICAL' },
      { src_country: 'Russia', src: [64, 120], dst_country: 'France', dst: [46, 2], attack_type: 'lateral_movement', severity: 'HIGH' },
      { src_country: 'China', src: [36, 112], dst_country: 'United Kingdom', dst: [55, -3], attack_type: 'data_exfiltration', severity: 'CRITICAL' },
    ],
  },
  phishing: {
    label: 'Phishing Wave',
    attacks: [
      { src_country: 'Brazil', src: [-14, -51], dst_country: 'United States', dst: [38, -97], attack_type: 'phishing_campaign', severity: 'MEDIUM' },
      { src_country: 'India', src: [21, 78], dst_country: 'Canada', dst: [56, -106], attack_type: 'credential_access', severity: 'HIGH' },
      { src_country: 'United Kingdom', src: [55, -3], dst_country: 'Australia', dst: [-25, 133], attack_type: 'phishing_campaign', severity: 'MEDIUM' },
    ],
  },
};

function createSimulatedAttack(seed, tpl) {
  const j = () => (Math.random() - 0.5) * 3.2;
  const srcLat = Number(tpl.src?.[0] || 0) + j();
  const srcLon = Number(tpl.src?.[1] || 0) + j();
  const dstLat = Number(tpl.dst?.[0] || 0) + j();
  const dstLon = Number(tpl.dst?.[1] || 0) + j();
  return {
    id: `sim_${seed}_${Math.random().toString(36).slice(2, 8)}`,
    src_country: tpl.src_country || 'Unknown',
    dst_country: tpl.dst_country || 'Unknown',
    attack_type: tpl.attack_type || 'suspicious_activity',
    severity: tpl.severity || 'MEDIUM',
    timestamp: new Date().toISOString(),
    source: { lat: srcLat, lon: srcLon, label: tpl.src_country || 'Unknown', ip: '' },
    target: { lat: dstLat, lon: dstLon, label: tpl.dst_country || 'Unknown', ip: '' },
    target_sector: 'Training',
    title: `SIM · ${String(tpl.attack_type || 'attack').replace(/_/g, ' ')}`,
    kind: 'simulation',
    simulation: true,
  };
}

function buildEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#0a1f33');
  ocean.addColorStop(0.5, '#0f2e4d');
  ocean.addColorStop(1, '#091828');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Procedural pseudo-continents
  const blobs = [
    [0.2, 0.35, 180, 95], [0.27, 0.62, 140, 90], [0.48, 0.35, 190, 110],
    [0.56, 0.58, 130, 80], [0.72, 0.42, 210, 120], [0.84, 0.72, 140, 90],
  ];
  blobs.forEach(([nx, ny, rx, ry], idx) => {
    const x = Number(nx) * canvas.width;
    const y = Number(ny) * canvas.height;
    const grad = ctx.createRadialGradient(x, y, Number(rx) * 0.2, x, y, Number(rx));
    grad.addColorStop(0, idx % 2 ? '#3f6f3a' : '#507f42');
    grad.addColorStop(1, 'rgba(40,80,38,0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, Number(rx), Number(ry), 0.15 * idx, 0, Math.PI * 2);
    ctx.fill();
  });

  // Clouds/noise
  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = Math.random() * 0.09;
    ctx.fillStyle = `rgba(220,235,255,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function buildNightLightsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(0,0,0,0.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lightClusters = [
    [0.23, 0.36, 0.9], // US
    [0.33, 0.33, 0.65], // Europe west
    [0.38, 0.33, 0.55], // Europe east
    [0.51, 0.40, 0.9], // India
    [0.57, 0.36, 1.0], // East China
    [0.61, 0.34, 0.85], // Japan/Korea
    [0.30, 0.66, 0.6], // Brazil
    [0.78, 0.72, 0.5], // Australia
  ];

  lightClusters.forEach(([nx, ny, intensity]) => {
    const cx = Number(nx) * canvas.width;
    const cy = Number(ny) * canvas.height;
    const spots = Math.floor(220 * Number(intensity));
    for (let i = 0; i < spots; i += 1) {
      const dx = (Math.random() - 0.5) * 140;
      const dy = (Math.random() - 0.5) * 90;
      const r = Math.random() * 2.0 + 0.8;
      const alpha = Math.random() * 0.55 + 0.2;
      ctx.fillStyle = `rgba(255, 210, 120, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function latLonToVector3(lat, lon, radius = 2.1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const AttackArc = React.memo(function AttackArc({ attack, selected, onSelect, quality }) {
  const src = attack?.source || { lat: 0, lon: 0 };
  const dst = attack?.target || { lat: 0, lon: 0 };
  const severity = String(attack?.severity || 'MEDIUM').toUpperCase();
  const color = SEVERITY_COLORS[severity] || '#ff9800';
  const speed = SEVERITY_SPEED[severity] || 0.28;
  const isCritical = severity === 'CRITICAL';
  const tracerRef = useRef();
  const srcPulseRef = useRef();
  const dstPulseRef = useRef();

  const { curve, points, srcV, dstV, actorMarkerPosition } = useMemo(() => {
    const srcVector = latLonToVector3(Number(src.lat || 0), Number(src.lon || 0), 2.08);
    const dstVector = latLonToVector3(Number(dst.lat || 0), Number(dst.lon || 0), 2.08);
    const mid = srcVector.clone().add(dstVector).multiplyScalar(0.5).normalize().multiplyScalar(2.45);
    const attackCurve = new THREE.CatmullRomCurve3([srcVector, mid, dstVector]);
    return {
      curve: attackCurve,
      points: attackCurve.getPoints(quality.arcCurvePoints),
      srcV: srcVector,
      dstV: dstVector,
      actorMarkerPosition: srcVector.clone().multiplyScalar(1.06).toArray(),
    };
  }, [src.lat, src.lon, dst.lat, dst.lon, quality.arcCurvePoints]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const t = (elapsed * speed) % 1;
    const pos = curve.getPointAt(t);
    if (tracerRef.current) {
      tracerRef.current.position.set(pos.x, pos.y, pos.z);
    }
    const basePulse = 1 + Math.sin((elapsed * 3.2) + (Number(src.lat || 0) * 0.01)) * (selected ? 0.25 : 0.12);
    if (srcPulseRef.current) srcPulseRef.current.scale.setScalar(basePulse);
    if (dstPulseRef.current) dstPulseRef.current.scale.setScalar(1 + Math.cos((elapsed * 3.2) + (Number(dst.lon || 0) * 0.01)) * (selected ? 0.22 : 0.1));
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(attack); }}>
      <Line points={points} color={color} lineWidth={selected ? 3 : 1.45} transparent opacity={selected ? 0.95 : 0.66} />
      {isCritical && quality.arcCurvePoints > 12 && (
        <Line points={points} color={color} lineWidth={selected ? 1.8 : 0.9} transparent opacity={0.18} />
      )}
      <mesh ref={tracerRef}>
        <sphereGeometry args={[selected ? 0.034 : 0.024, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={srcV.toArray()} ref={srcPulseRef}>
        <sphereGeometry args={[selected ? 0.055 : 0.042, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
      </mesh>
      <mesh position={dstV.toArray()} ref={dstPulseRef}>
        <sphereGeometry args={[selected ? 0.05 : 0.038, 10, 10]} />
        <meshStandardMaterial color="#80cbc4" emissive="#80cbc4" emissiveIntensity={0.88} />
      </mesh>
      {attack?.threat_actor?.name && quality.arcCurvePoints > 12 && selected && (
        <Text
          position={actorMarkerPosition}
          color="#ce93d8"
          fontSize={0.11}
          anchorX="center"
          anchorY="middle"
        >
          🕵️
        </Text>
      )}
    </group>
  );
});

function CountryBoundaryLines({ boundaryStep = 1 }) {
  const lines = useMemo(() => {
    return Object.entries(COUNTRY_BOUNDARIES).map(([country, points]) => {
      const reduced = points.filter((_, idx) => idx % Math.max(1, boundaryStep) === 0);
      const vectors = reduced.map(([lat, lon]) => latLonToVector3(lat, lon, 2.102));
      return { country, vectors };
    });
  }, [boundaryStep]);

  return (
    <group>
      {lines.map((line) => (
        <Line key={line.country} points={line.vectors} color="#6ea6c6" lineWidth={0.9} transparent opacity={0.78} />
      ))}
    </group>
  );
}

const RotatingGlobe = React.memo(function RotatingGlobe({ autoRotate, performanceMode = false, quality = QUALITY_PROFILES.standard }) {
  const globeRef = useRef();
  const atmosphereRef = useRef();
  const nightLightsRef = useRef();
  const earthTexture = useMemo(() => buildEarthTexture(), []);
  const nightLightsTexture = useMemo(() => buildNightLightsTexture(), []);
  useFrame(({ clock }, delta) => {
    if (autoRotate && globeRef.current) {
      globeRef.current.rotation.y += delta * 0.1;
    }
    if (nightLightsRef.current) {
      nightLightsRef.current.rotation.y += delta * 0.06;
    }
    if (atmosphereRef.current) {
      const t = clock.getElapsedTime();
      const base = performanceMode ? 0.09 : 0.12;
      const amp = performanceMode ? 0.04 : 0.08;
      atmosphereRef.current.material.opacity = base + ((Math.sin(t * 0.9) + 1) / 2) * amp;
    }
  });
  return (
    <group ref={globeRef}>
      <mesh>
        <sphereGeometry args={[2.04, quality.globeSegments, quality.globeSegments]} />
        <meshStandardMaterial
          map={earthTexture || undefined}
          color="#0d2235"
          emissive="#0a1b2b"
          emissiveIntensity={0.25}
          metalness={0.22}
          roughness={0.86}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.12, quality.globeSegments, quality.globeSegments]} />
        <meshBasicMaterial color="#3ba9f8" transparent opacity={0.08} />
      </mesh>
      <mesh ref={nightLightsRef}>
        <sphereGeometry args={[2.065, quality.globeSegments, quality.globeSegments]} />
        <meshBasicMaterial map={nightLightsTexture || undefined} color="#ffcc80" transparent opacity={performanceMode ? 0.28 : 0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.2, quality.globeSegments, quality.globeSegments]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.16} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <CountryBoundaryLines boundaryStep={quality.boundaryStep} />
    </group>
  );
});

function AttackStatsPanel({ payload }) {
  const stats = payload || {};
  const topCountries = stats.top_attacking_countries || [];
  const topSectors = stats.most_targeted_sectors || [];
  const topTypes = stats.top_attack_types || [];
  const attacks = stats.attacks || [];

  const hotspots = useMemo(() => {
    const cluster = {};
    (attacks || []).forEach((a) => {
      const lat = Number(a?.source?.lat || 0);
      const lon = Number(a?.source?.lon || 0);
      const key = `${Math.round(lat / 10) * 10},${Math.round(lon / 10) * 10}`;
      cluster[key] = (cluster[key] || 0) + 1;
    });
    return Object.entries(cluster)
      .map(([k, count]) => ({
        key: k,
        count,
        label: (() => {
          const [la, lo] = k.split(',').map(Number);
          const ns = la >= 0 ? 'N' : 'S';
          const ew = lo >= 0 ? 'E' : 'W';
          return `${Math.abs(la)}°${ns}, ${Math.abs(lo)}°${ew}`;
        })(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [attacks]);

  return (
    <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 10, background: '#060f1a' }}>
      <div style={{ fontSize: '0.76rem', color: '#80cbc4', marginBottom: 6, fontWeight: 700 }}>Live Statistics</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, fontSize: '0.66rem' }}>
        <span style={{ border: '1px solid #2f4d5e', borderRadius: 999, padding: '2px 8px', color: '#29b6f6' }}>
          Attacks/min: <strong>{stats.attacks_per_minute || 0}</strong>
        </span>
        <span style={{ border: '1px solid #2f4d5e', borderRadius: 999, padding: '2px 8px', color: '#90caf9' }}>
          Window: <strong>{stats.window_minutes || 15}m</strong>
        </span>
        <span style={{ border: '1px solid #2f4d5e', borderRadius: 999, padding: '2px 8px', color: '#a5d6a7' }}>
          Total: <strong>{stats.total_attacks || 0}</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <div>
          <div style={{ color: '#81d4fa', fontSize: '0.66rem', marginBottom: 4 }}>Top Attacking Countries</div>
          {(topCountries || []).slice(0, 5).map((item) => (
            <div key={item.name} style={{ fontSize: '0.64rem', color: '#c5d8e3' }}>{item.name}: {item.count}</div>
          ))}
        </div>
        <div>
          <div style={{ color: '#81d4fa', fontSize: '0.66rem', marginBottom: 4 }}>Most Targeted Sectors</div>
          {(topSectors || []).slice(0, 5).map((item) => (
            <div key={item.name} style={{ fontSize: '0.64rem', color: '#c5d8e3' }}>{item.name}: {item.count}</div>
          ))}
        </div>
        <div>
          <div style={{ color: '#81d4fa', fontSize: '0.66rem', marginBottom: 4 }}>Top Attack Types</div>
          {(topTypes || []).slice(0, 5).map((item) => (
            <div key={item.name} style={{ fontSize: '0.64rem', color: '#c5d8e3' }}>{item.name}: {item.count}</div>
          ))}
        </div>
        <div>
          <div style={{ color: '#81d4fa', fontSize: '0.66rem', marginBottom: 4 }}>Geographic Hotspots</div>
          {(hotspots || []).map((item) => (
            <div key={item.key} style={{ fontSize: '0.64rem', color: '#c5d8e3' }}>{item.label}: {item.count}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttackDetailsPanel({ selectedAttack, details }) {
  if (!selectedAttack) {
    return (
      <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 10, background: '#07131f', color: '#607d8b', fontSize: '0.68rem' }}>
        Click an attack arc to open incident details, related alerts, and MITRE mapping.
      </div>
    );
  }

  const incidents = details?.incident_details || [];
  const alerts = details?.related_alerts || [];
  const mitre = details?.mitre_mapping || {};

  return (
    <div style={{ border: '1px solid #29506b', borderRadius: 8, padding: 10, background: '#07131f' }}>
      <div style={{ fontSize: '0.74rem', color: '#81d4fa', marginBottom: 4, fontWeight: 700 }}>
        Investigation Integration
      </div>
      <div style={{ fontSize: '0.67rem', color: '#cfe8ff' }}>
        <strong>{selectedAttack.src_country}</strong> → <strong>{selectedAttack.dst_country}</strong>
      </div>
      <div style={{ fontSize: '0.64rem', color: '#90a4ae', marginTop: 2 }}>
        Attack: {selectedAttack.attack_type} · Severity: {selectedAttack.severity}
      </div>
      {selectedAttack?.threat_actor?.name && (
        <div style={{ fontSize: '0.64rem', color: '#ce93d8', marginTop: 2 }}>
          Threat Actor: 🕵️ {selectedAttack.threat_actor.name} ({Math.round((selectedAttack.threat_actor.confidence || 0) * 100)}%)
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: '0.64rem', color: '#aac8dd' }}>
        <div style={{ color: '#80cbc4', marginBottom: 2 }}>Incident details</div>
        {incidents.length ? incidents.slice(0, 3).map((inc) => (
          <div key={inc.id}>• {inc.title} [{inc.severity}] ({inc.status})</div>
        )) : <div>• No linked incidents.</div>}
      </div>

      <div style={{ marginTop: 8, fontSize: '0.64rem', color: '#aac8dd' }}>
        <div style={{ color: '#80cbc4', marginBottom: 2 }}>Related alerts</div>
        {alerts.length ? alerts.slice(0, 4).map((a) => (
          <div key={a.id}>• {a.type} [{a.severity}] {a.matched_indicator ? `(${a.matched_indicator})` : ''}</div>
        )) : <div>• No related alerts.</div>}
      </div>

      <div style={{ marginTop: 8, fontSize: '0.64rem', color: '#aac8dd' }}>
        <div style={{ color: '#80cbc4', marginBottom: 2 }}>MITRE ATT&CK mapping</div>
        {mitre?.technique ? (
          <>
            <div>• {mitre.technique} — {mitre.label || 'Technique'}</div>
            {(mitre.playbook_steps || []).slice(0, 3).map((s, idx) => <div key={`m_${idx}`}>  - {s}</div>)}
          </>
        ) : <div>• No MITRE mapping available.</div>}
      </div>
    </div>
  );
}

function Map2DView({ attacks, selectedId, onSelect }) {
  const W = 980;
  const H = 420;
  const project = (lat, lon) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', borderRadius: 8, background: 'radial-gradient(circle at 30% 20%, #102236, #060b12 65%)' }}>
      {Array.from({ length: 11 }).map((_, i) => {
        const y = (H / 10) * i;
        return <line key={`lat_${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#1f3547" strokeWidth="0.6" opacity="0.45" />;
      })}
      {Array.from({ length: 19 }).map((_, i) => {
        const x = (W / 18) * i;
        return <line key={`lon_${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#1f3547" strokeWidth="0.6" opacity="0.38" />;
      })}

      {attacks.map((a) => {
        const sev = String(a.severity || 'MEDIUM').toUpperCase();
        const color = SEVERITY_COLORS[sev] || '#ff9800';
        const src = a.source || { lat: 0, lon: 0 };
        const dst = a.target || { lat: 0, lon: 0 };
        const p1 = project(Number(src.lat || 0), Number(src.lon || 0));
        const p2 = project(Number(dst.lat || 0), Number(dst.lon || 0));
        const mx = (p1.x + p2.x) / 2;
        const my = Math.min(p1.y, p2.y) - Math.min(80, Math.abs(p1.x - p2.x) * 0.18 + 15);
        const selected = selectedId === a.id;

        return (
          <g key={a.id} onClick={() => onSelect(a)} style={{ cursor: 'pointer' }}>
            <path
              d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
              fill="none"
              stroke={color}
              strokeWidth={selected ? 2.8 : 1.4}
              strokeDasharray="5 4"
              opacity={selected ? 0.95 : 0.55}
            />
            <circle cx={p1.x} cy={p1.y} r={selected ? 4.4 : 3} fill={color} />
            <circle cx={p2.x} cy={p2.y} r={selected ? 4.2 : 2.8} fill="#80cbc4" />
          </g>
        );
      })}
    </svg>
  );
}

export default function GlobalAttackMapPage() {
  const { user, getHeaders } = useAuth();
  const [mode, setMode] = useState('3d');
  const [autoRotate, setAutoRotate] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [payload, setPayload] = useState({ attacks: [], total_attacks: 0 });
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainingEnabled, setTrainingEnabled] = useState(false);
  const [trainingRateMs, setTrainingRateMs] = useState(1200);
  const [trainingScenario, setTrainingScenario] = useState('mixed');
  const [simulatedAttacks, setSimulatedAttacks] = useState([]);
  const organizationId = user?.organizationId || 'org_default';
  const wsEventsRef = useRef(0);
  const fetchDurationRef = useRef(0);
  const pendingRefreshRef = useRef(null);
  const abortRef = useRef(null);

  const pressureMode = Number(payload?.attacks_per_minute || 0) >= 600 || Number(payload?.total_attacks || 0) >= 200;
  const qualityName = pressureMode ? 'stream' : (performanceMode ? 'performance' : 'standard');
  const quality = QUALITY_PROFILES[qualityName];

  const fetchLiveAttacks = useCallback(() => {
    try {
      abortRef.current?.abort?.();
    } catch (e) {
      // noop
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    fetch(`${API_BASE}/api/attacks/live?limit=${quality.apiLimit}&window_minutes=${windowMinutes}&organization_id=${encodeURIComponent(organizationId)}`, { signal: controller.signal, headers: getHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        fetchDurationRef.current = performance.now() - started;
        setPayload(data || { attacks: [] });
        setLoading(false);
        setError('');
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        fetchDurationRef.current = performance.now() - started;
        setError(String(e?.message || e));
        setLoading(false);
      });
  }, [organizationId, quality.apiLimit, windowMinutes]);

  const scheduleRefresh = useCallback(() => {
    if (pendingRefreshRef.current) return;
    pendingRefreshRef.current = window.setTimeout(() => {
      pendingRefreshRef.current = null;
      fetchLiveAttacks();
    }, quality.wsDebounceMs);
  }, [fetchLiveAttacks, quality.wsDebounceMs]);

  useEffect(() => {
    fetchLiveAttacks();
    const timer = window.setInterval(fetchLiveAttacks, quality.pollMs);
    return () => {
      window.clearInterval(timer);
      if (pendingRefreshRef.current) {
        window.clearTimeout(pendingRefreshRef.current);
        pendingRefreshRef.current = null;
      }
      try {
        abortRef.current?.abort?.();
      } catch (e) {
        // noop
      }
    };
  }, [fetchLiveAttacks, quality.pollMs]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/stream');
    ws.onopen = () => ws.send('subscribe');
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const eventName = String(msg?.event || '');
        wsEventsRef.current += 1;
        if (['new_attack', 'incident_detected', 'threat_actor_activity', 'simulation_event', 'simulation_status'].includes(eventName)) {
          scheduleRefresh();
        }
      } catch (e) {
        // ignore
      }
    };
    return () => {
      try { ws.close(); } catch (e) { /* noop */ }
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!selectedAttack?.id) {
      setSelectedDetails(null);
      return;
    }
    if (selectedAttack?.simulation) {
      setSelectedDetails({
        incident_details: [
          {
            id: 'training-sim',
            title: 'Training scenario attack (simulated)',
            severity: selectedAttack?.severity || 'MEDIUM',
            status: 'simulation',
          },
        ],
        related_alerts: [
          {
            id: selectedAttack.id,
            type: 'training_attack',
            severity: selectedAttack?.severity || 'MEDIUM',
            matched_indicator: `${selectedAttack?.attack_type || 'simulated'}:training`,
          },
        ],
        mitre_mapping: {
          technique: 'SIM-TRAINING',
          label: 'Analyst training exercise',
          playbook_steps: [
            'Validate IOC provenance and confidence before containment.',
            'Map event to ATT&CK phase and identify likely blast radius.',
            'Run tabletop response actions with SOC shift handoff.',
          ],
        },
      });
      return;
    }
    fetch(`${API_BASE}/api/attacks/live/${encodeURIComponent(selectedAttack.id)}/details`, { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSelectedDetails(d))
      .catch(() => setSelectedDetails(null));
  }, [selectedAttack]);

  useEffect(() => {
    if (!trainingEnabled) return;
    const timer = window.setInterval(() => {
      const scenario = TRAINING_SCENARIOS[trainingScenario] || TRAINING_SCENARIOS.mixed;
      const source = scenario.attacks || [];
      if (!source.length) return;
      const tpl = source[Math.floor(Math.random() * source.length)];
      const attack = createSimulatedAttack(Date.now(), tpl);
      setSimulatedAttacks((prev) => dedupeRecentAttacks([attack], prev, quality.maxSimulated));
    }, Math.max(350, Number(trainingRateMs || 1200)));
    return () => window.clearInterval(timer);
  }, [quality.maxSimulated, trainingEnabled, trainingRateMs, trainingScenario]);

  const attacks = useMemo(() => {
    const live = payload.attacks || [];
    return dedupeRecentAttacks(simulatedAttacks, live, quality.maxItems);
  }, [payload.attacks, simulatedAttacks, quality.maxItems]);

  const renderAttacks3D = useMemo(() => attacks.slice(0, quality.maxArcs3D), [attacks, quality.maxArcs3D]);

  const displayPayload = useMemo(() => {
    const base = payload || { attacks: [] };
    const combined = attacks;
    return {
      ...base,
      attacks: combined,
      total_attacks: combined.length,
      attacks_per_minute: Number(base.attacks_per_minute || 0) + (trainingEnabled ? Math.max(1, Math.round(60000 / trainingRateMs)) : 0),
    };
  }, [payload, attacks, trainingEnabled, trainingRateMs]);

  const perfMetrics = useGlobePerformanceMetrics({
    activeArcCount: mode === '3d' ? renderAttacks3D.length : attacks.length,
    qualityName,
    wsEventsRef,
    fetchDurationRef,
  });

  return (
    <div style={{ padding: 14, color: '#d0e8ff', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: '#29b6f6', fontSize: '1.05rem' }}>🌍 Global Attack Map — Live Operations</h2>
        <a
          href="/"
          style={{ color: '#90caf9', border: '1px solid #90caf955', borderRadius: 6, padding: '5px 10px', textDecoration: 'none', fontSize: '0.74rem' }}
        >
          ← Back to Dashboard
        </a>
      </div>

      <div style={{ border: '1px solid #1a3a4a', borderRadius: 8, padding: 10, background: '#060c14', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.68rem', color: '#8ab4c7' }}>View mode</label>
          <button onClick={() => setMode('2d')} style={{ border: '1px solid #29b6f666', background: mode === '2d' ? '#123449' : 'transparent', color: '#29b6f6', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: '0.66rem' }}>2D Map</button>
          <button onClick={() => setMode('3d')} style={{ border: '1px solid #29b6f666', background: mode === '3d' ? '#123449' : 'transparent', color: '#29b6f6', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: '0.66rem' }}>3D Globe</button>

          <label style={{ fontSize: '0.68rem', color: '#8ab4c7', marginLeft: 8 }}>Time window: {windowMinutes}m</label>
          <input type="range" min={5} max={60} step={5} value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))} style={{ width: 180 }} />

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 8, fontSize: '0.66rem', color: '#8ab4c7' }}>
            <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
            Auto rotate globe
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 8, fontSize: '0.66rem', color: performanceMode ? '#ffcc80' : '#8ab4c7' }}>
            <input type="checkbox" checked={performanceMode} onChange={(e) => setPerformanceMode(e.target.checked)} />
            Performance Mode
          </label>

          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#80cbc4' }}>Live events: new_attack · incident_detected · threat_actor_activity</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
          {Object.entries(SEVERITY_COLORS).map(([sev, col]) => (
            <span key={sev} style={{ border: `1px solid ${col}88`, color: col, borderRadius: 999, fontSize: '0.62rem', padding: '2px 8px' }}>
              {sev}
            </span>
          ))}
          <span style={{ border: '1px solid #ab47bc88', color: '#ce93d8', borderRadius: 999, fontSize: '0.62rem', padding: '2px 8px' }}>
            CRITICAL trails: persistent
          </span>
          {(performanceMode || qualityName === 'stream') && (
            <span style={{ border: '1px solid #ffcc8066', color: '#ffcc80', borderRadius: 999, fontSize: '0.62rem', padding: '2px 8px' }}>
              PROFILE: {qualityName} · optimized stars/arcs/segments
            </span>
          )}
        </div>
      </div>

      <AttackStatsPanel payload={displayPayload} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginTop: 10 }}>
        <GlobePerformancePanel metrics={perfMetrics} />
        <AIAttackPredictionPanel payload={displayPayload} metrics={perfMetrics} />
      </div>

      <div style={{ marginTop: 10, border: '1px solid #4a334a', borderRadius: 8, padding: 10, background: '#110a16' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ color: '#ce93d8', fontSize: '0.75rem' }}>🎯 Analyst Training Simulation</strong>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.66rem', color: '#e1bee7' }}>
            <input type="checkbox" checked={trainingEnabled} onChange={(e) => setTrainingEnabled(e.target.checked)} />
            Enable simulated attacks
          </label>
          <label style={{ fontSize: '0.66rem', color: '#b39ddb' }}>
            Scenario:
            <select
              value={trainingScenario}
              onChange={(e) => setTrainingScenario(e.target.value)}
              style={{ marginLeft: 6, background: '#1a1222', color: '#e1bee7', border: '1px solid #5e3b72', borderRadius: 4, padding: '2px 6px' }}
            >
              {Object.entries(TRAINING_SCENARIOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.66rem', color: '#b39ddb' }}>
            Rate: {trainingRateMs}ms
          </label>
          <input
            type="range"
            min={400}
            max={3000}
            step={100}
            value={trainingRateMs}
            onChange={(e) => setTrainingRateMs(Number(e.target.value))}
            style={{ width: 180 }}
          />
          <button
            onClick={() => setSimulatedAttacks([])}
            style={{ border: '1px solid #ab47bc88', background: 'transparent', color: '#ce93d8', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: '0.66rem' }}
          >
            Clear simulated stream
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '0.64rem', color: '#d1c4e9' }}>
            Active simulated arcs: <strong>{simulatedAttacks.length}</strong>
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10, border: '1px solid #1a3a4a', borderRadius: 8, background: '#030a12', overflow: 'hidden' }}>
        {loading && <div style={{ padding: 12, color: '#29b6f6', fontSize: '0.72rem' }}>Loading live attack globe…</div>}
        {!!error && <div style={{ padding: 12, color: '#ef5350', fontSize: '0.72rem' }}>{error}</div>}
        {!loading && !error && mode === '2d' && (
          <Map2DView attacks={attacks} selectedId={selectedAttack?.id} onSelect={setSelectedAttack} />
        )}
        {!loading && !error && mode === '3d' && (
          <div style={{ height: 520 }}>
            <Canvas camera={{ position: [0, 0.5, 6], fov: 50 }} dpr={quality.dpr}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={1.1} />
              <pointLight position={[-4, -2, -4]} intensity={0.5} color="#29b6f6" />
              <Stars radius={90} depth={50} count={quality.starsCount} factor={quality.starsFactor} fade />

              <RotatingGlobe autoRotate={autoRotate} performanceMode={performanceMode || qualityName === 'stream'} quality={quality} />
              {renderAttacks3D.map((attack) => (
                <AttackArc key={attack.id} attack={attack} selected={selectedAttack?.id === attack.id} onSelect={setSelectedAttack} quality={quality} />
              ))}

              <OrbitControls enablePan={false} enableZoom enableRotate minDistance={3.2} maxDistance={9.5} />
            </Canvas>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <AttackDetailsPanel selectedAttack={selectedAttack} details={selectedDetails} />
      </div>

      <div style={{ marginTop: 10, border: '1px solid #1a3a4a', borderRadius: 8, padding: 10, background: '#06101a', fontSize: '0.65rem', color: '#90a4ae' }}>
        <strong style={{ color: '#80cbc4' }}>Event pipeline preview:</strong> Threat ingestion/IOC correlation → `/api/attacks/live` → WebSocket stream (`new_attack`, `incident_detected`, `threat_actor_activity`) → 2D/3D globe rendering + investigation drill-down.
        <div style={{ marginTop: 6, color: '#ce93d8' }}>
          Training mode overlays synthetic attacks client-side (no backend mutation) so analysts can run safe drills.
        </div>
        <div style={{ marginTop: 6, color: '#9ccc65' }}>
          Optimized session mode batches WebSocket refreshes, caps rendered arcs, and de-duplicates attack records for long-running streams.
        </div>
      </div>
    </div>
  );
}
