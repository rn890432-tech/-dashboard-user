      // Threat arc spiral animation
      const renderArcSpiral = (arc) => {
        if (!arc.spiral) return null;
        const src = latLngToVec3(arc.src[0], arc.src[1]);
        const tgt = latLngToVec3(arc.dest[0], arc.dest[1]);
        const t = Date.now() / 1000;
        const points = [];
        for (let i = 0; i < 40; i++) {
          const s = i / 40;
          const x = src[0] + (tgt[0] - src[0]) * s + 8 * Math.sin(t + i);
          const y = src[1] + (tgt[1] - src[1]) * s + 8 * Math.cos(t + i);
          const z = src[2] + (tgt[2] - src[2]) * s;
          points.push([x, y, z]);
        }
        const positions = new Float32Array(points.flat());
        return (
          <line key={arc.id + '-spiral'}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" array={positions} count={points.length} itemSize={3} />
            </bufferGeometry>
            <lineBasicMaterial color="#ff9800" linewidth={2} />
          </line>
        );
      };
    // Threat arc lightning animation
    const renderArcLightning = (arc) => {
      if (!arc.lightning) return null;
      const src = latLngToVec3(arc.src[0], arc.src[1]);
      const tgt = latLngToVec3(arc.dest[0], arc.dest[1]);
      const t = Date.now() / 1000;
      const mid = [
        (src[0] + tgt[0]) / 2 + 10 * Math.sin(t * 2),
        (src[1] + tgt[1]) / 2 + 10 * Math.cos(t * 2),
        (src[2] + tgt[2]) / 2
      ];
      return (
        <line key={arc.id + '-lightning'}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={new Float32Array([src[0], src[1], src[2], mid[0], mid[1], mid[2], tgt[0], tgt[1], tgt[2]])} count={3} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#fff" linewidth={4} />
        </line>
      );
    };
  // Animated attack beams (Bezier curves for realism)
  const renderAttackBeams = () => {
    if (!arcs.length) return null;
    return arcs.map((arc, idx) => {
      const src = latLngToVec3(arc.src[0], arc.src[1]);
      const tgt = latLngToVec3(arc.dest[0], arc.dest[1]);
      // Control point for Bezier curve (midpoint above globe)
      const mid = [
        (src[0] + tgt[0]) / 2,
        (src[1] + tgt[1]) / 2 + 40,
        (src[2] + tgt[2]) / 2
      ];
      // Three points: src, mid, tgt
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(...src),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...tgt)
      );
      const points = curve.getPoints(50);
      const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]));
      return (
        <line key={arc.id + '-beam'}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={positions} count={points.length} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={arc.color} linewidth={3} />
        </line>
      );
    });
  };
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const GlobeScene = ({ 
  stealth = false,
  threatArcs = [],
  overlays = [],
  actorProfiles = [],
  onRegionClick,
  selectedRegion,
  highlightActors = [],
  visualEffects = {},
}) => {
  const globeRef = useRef();
  const arcsRef = useRef([]);
  const [bluePulse, setBluePulse] = React.useState(false);

  useEffect(() => {
    const handleBluePulse = () => {
      setBluePulse(true);
      setTimeout(() => setBluePulse(false), 900);
    };
    window.addEventListener('SOC_BLUE_PULSE', handleBluePulse);
    return () => window.removeEventListener('SOC_BLUE_PULSE', handleBluePulse);
  }, []);

  // Use threatArcs prop for real-time arcs
  const arcs = threatArcs.length ? threatArcs : [
    {
      id: 'handala',
      src: [51.3, 35.6], // Tehran
      dest: [-8.4, 51.8], // Cork
      color: '#ff4444',
    },
    {
      id: 'blacksanta',
      src: [37.6, 55.7], // Moscow
      dest: [-74.0, 40.7], // NYC
      color: '#ff4444',
    // Threat arc particle trails
    const renderArcParticles = (arc) => {
      if (!arc.particles) return null;
      const src = latLngToVec3(arc.src[0], arc.src[1]);
      const tgt = latLngToVec3(arc.dest[0], arc.dest[1]);
      const steps = 20;
      const points = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push([
          src[0] + (tgt[0] - src[0]) * t,
          src[1] + (tgt[1] - src[1]) * t,
          src[2] + (tgt[2] - src[2]) * t
        ]);
      }
      return points.map((p, idx) => (
        <mesh key={arc.id + '-particle-' + idx} position={p}>
          <sphereGeometry args={[1.2, 8, 8]} />
          <meshBasicMaterial color={arc.color} transparent opacity={0.7} />
        </mesh>
      ));
    };
    },
    {
      id: 'solarwinds',
      src: [116.4, 39.9], // Beijing
      dest: [-77.0, 38.9], // DC
      color: '#00ffff',
    },
  ];

  useEffect(() => {
    const handleKillswitch = () => {
      // Clear arcs or reset globe state as needed
      if (arcsRef.current) {
        arcsRef.current = [];
      }
      // Optionally trigger a visual reset
    };
    window.addEventListener('SOC_KILLSWITCH', handleKillswitch);
    return () => window.removeEventListener('SOC_KILLSWITCH', handleKillswitch);
  }, []);

  // Helper: lat/lng to 3D globe coords
  const latLngToVec3 = (lat, lng, radius = 100) => {
    const phi = (90 - lat) * (Math.PI / 180);
    // Render overlays (regions, custom zones, animated rings, radar sweep)
    const renderOverlays = () => overlays.map((overlay, idx) => {
      const pos = latLngToVec3(overlay.lat, overlay.lng, 105);
      const ringAnim = overlay.ring ? (
        <mesh position={pos}>
          <torusGeometry args={[overlay.radius + 10, 2, 16, 100]} />
          <meshBasicMaterial color="#ff9800" transparent opacity={0.5} />
        </mesh>
      ) : null;
      const radarAnim = overlay.radar ? (() => {
        const sweepAngle = ((Date.now() / 20) % 360) * Math.PI / 180;
        return (
          <mesh position={pos}>
            <ringGeometry args={[overlay.radius + 14, overlay.radius + 18, 32, 1, sweepAngle, Math.PI / 6]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.4} />
          </mesh>
        );
      })() : null;
      return (
        <>
          <mesh
            key={overlay.id || idx}
            position={pos}
            onClick={() => onRegionClick && onRegionClick(overlay.region)}
          >
            <sphereGeometry args={[overlay.radius || 8, 32, 32]} />
            <meshBasicMaterial 
              color={selectedRegion === overlay.region ? '#ff9800' : overlay.color || '#00ff00'} 
              transparent 
              opacity={selectedRegion === overlay.region ? 0.8 : 0.5} 
              emissive={selectedRegion === overlay.region ? '#ff9800' : overlay.color || '#00ff00'} 
            />
          </mesh>
          {ringAnim}
          {radarAnim}
        </>
      );
    });
            opacity={selectedRegion === overlay.region ? 0.8 : 0.5} 
            emissive={selectedRegion === overlay.region ? '#ff9800' : overlay.color || '#00ff00'} 
          />
        </mesh>
        {ringAnim}
      </>
    );
  });

  // Render actor profiles (interactive markers, orbiting and pulsing if enabled)
  const renderActors = () => actorProfiles.map((actor, idx) => {
    let pos = latLngToVec3(actor.lat, actor.lng, 110);
    // Orbit animation
    if (actor.orbit) {
      const t = Date.now() / 1000 + idx * 0.5;
      const orbitRadius = 12;
      pos = [
        pos[0] + orbitRadius * Math.cos(t),
        pos[1] + orbitRadius * Math.sin(t),
        pos[2]
      ];
    }
    // Pulse animation
    const pulseScale = actor.pulse ? (1.2 + 0.2 * Math.sin(Date.now() / 400 + idx)) : 1;
    return (
      <mesh
        key={actor.id || idx}
        position={pos}
        scale={[pulseScale, pulseScale, pulseScale]}
        onClick={() => onRegionClick && onRegionClick(actor.region)}
      >
        <sphereGeometry args={[highlightActors.includes(actor.id) ? 7 : 4, 32, 32]} />
        <meshBasicMaterial 
          color={highlightActors.includes(actor.id) ? '#ff0033' : '#00bfff'} 
          transparent 
          opacity={highlightActors.includes(actor.id) ? 0.9 : 0.6} 
          emissive={highlightActors.includes(actor.id) ? '#ff0033' : '#00bfff'} 
        />
      </mesh>
    );
  });

  // Advanced visual effects (pulse, glow, etc.)
  const renderVisualEffects = () => {
    if (visualEffects.pulse) {
      return (
        <mesh>
          <sphereGeometry args={[visualEffects.pulse.radius || 120, 32, 32]} />
          <meshBasicMaterial color={visualEffects.pulse.color || '#00bfff'} transparent opacity={visualEffects.pulse.opacity || 0.25} />
        </mesh>
      );
    }
    return null;
  };

  return (
    <group ref={globeRef}>
      {/* Globe: wireframe/static shader if stealth, normal otherwise */}
      <mesh>
        <sphereGeometry args={[100, 32, 32]} />
        {stealth ? (
          <meshBasicMaterial wireframe color="#888" />
        ) : visualEffects.globeTexture ? (
          <meshBasicMaterial map={new THREE.TextureLoader().load(visualEffects.globeTexture)} />
        ) : (
          <meshPhongMaterial color="#1e90ff" shininess={60} />
        )}
      </mesh>
      {/* Optionally render threat arcs only if not in stealth */}
      {!stealth && arcs.map(arc => renderArcLightning(arc))}
      {!stealth && arcs.map(arc => renderArcSpiral(arc))}
      {!stealth && renderAttackBeams()}
          // Region overlay animated pulse ring
          const renderPulseRing = (overlay, idx) => {
            if (!overlay.pulseRing) return null;
            const pos = latLngToVec3(overlay.lat, overlay.lng, 105);
            const t = Date.now() / 1000;
            const scale = 1.1 + 0.3 * Math.sin(t * 2 + idx);
            return (
              <mesh key={overlay.id + '-pulseRing'} position={pos} scale={[scale, scale, scale]}>
                <torusGeometry args={[overlay.radius + 14, 2, 16, 100]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.4} />
              </mesh>
            );
          };
        // Region overlay holographic grid
        const renderRegionGrid = (overlay, idx) => {
          if (!overlay.grid) return null;
          const pos = latLngToVec3(overlay.lat, overlay.lng, 105);
          return (
            <mesh key={overlay.id + '-grid'} position={pos}>
              <planeGeometry args={[overlay.radius * 3, overlay.radius * 3, 10, 10]} />
              <meshBasicMaterial color="#00ff00" wireframe opacity={0.3} transparent />
            </mesh>
          );
        };
      {/* Custom region overlays */}
      {!stealth && overlays.map((overlay, idx) => renderRegionGrid(overlay, idx))}
      {!stealth && overlays.map((overlay, idx) => renderPulseRing(overlay, idx))}
      {!stealth && renderOverlays()}
          // Actor profile floating hologram
          const renderActorHologram = (actor, idx) => {
            if (!actor.hologram) return null;
            let pos = latLngToVec3(actor.lat, actor.lng, 120);
            const t = Date.now() / 1000;
            pos[2] += 8 * Math.sin(t + idx);
            return (
              <mesh key={actor.id + '-hologram'} position={pos}>
                <cylinderGeometry args={[3, 3, 12, 32]} />
                <meshBasicMaterial color="#00bfff" transparent opacity={0.3} />
              </mesh>
            );
          };
        // Actor profile 3D badge
        const renderActorBadge = (actor, idx) => {
          if (!actor.badge) return null;
          let pos = latLngToVec3(actor.lat, actor.lng, 120);
          return (
            <mesh key={actor.id + '-badge'} position={pos}>
              <boxGeometry args={[6, 6, 2]} />
              <meshBasicMaterial color="#ff00ff" opacity={0.7} transparent />
            </mesh>
          );
        };
      {/* Interactive actor profiles */}
      {!stealth && actorProfiles.map((actor, idx) => renderActorBadge(actor, idx))}
      {!stealth && actorProfiles.map((actor, idx) => renderActorHologram(actor, idx))}
      {!stealth && renderActors()}
          // Globe atmospheric glow
          const renderAtmosphere = () => {
            if (!visualEffects.atmosphere) return null;
            return (
              <mesh>
                <sphereGeometry args={[125, 32, 32]} />
                <meshBasicMaterial color="#fff" transparent opacity={0.12} />
              </mesh>
            );
          };
        // Globe aurora effect
        const renderAurora = () => {
          if (!visualEffects.aurora) return null;
          return (
            <mesh>
              <sphereGeometry args={[115, 32, 32]} />
              <meshBasicMaterial color="#00bfff" transparent opacity={0.18} />
            </mesh>
          );
        };
      {/* Advanced visual effects */}
      {bluePulse && (
        <mesh>
          <sphereGeometry args={[110, 32, 32]} />
          <meshBasicMaterial color="#00bfff" transparent opacity={0.35} />
        </mesh>
      )}
      {!stealth && renderAurora()}
      {!stealth && renderAtmosphere()}
      {!stealth && renderVisualEffects()}
    </group>
  );
};

export default GlobeScene;
