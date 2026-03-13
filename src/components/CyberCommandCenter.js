import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Heatmap Shader Material
const HeatmapShaderMaterial = {
  uniforms: {
    attackData: { value: [] },
    globeTexture: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D globeTexture;
    varying vec2 vUv;
    void main() {
      vec4 globe = texture2D(globeTexture, vUv);
      // Example: Overlay heatmap color (replace with real attack density logic)
      float intensity = globe.r; // Placeholder
      vec3 color = mix(vec3(0,1,1), vec3(1,1,0), intensity); // Cyan to Yellow
      color = mix(color, vec3(1,0,0), pow(intensity,2.0)); // Neon Red for high
      gl_FragColor = vec4(color, 0.7) * globe;
    }
  `,
};

function ThreatGlobe({ attackEvents }) {
  // Demo globe texture
  const globeTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro-react/globe.jpg');
  // Helper: Convert lat/lon to 3D coords
  const latLonToVec3 = (lat, lon, radius = 100) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };
  // Attack pings
  const AttackPings = () => (
    attackEvents.map(ev => (
      <mesh key={ev.event_id} position={latLonToVec3(ev.target_lat, ev.target_lon, 105)}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color={ev.severity === 'Critical' ? 'red' : ev.severity === 'High' ? 'orange' : ev.severity === 'Medium' ? 'yellow' : 'cyan'} />
      </mesh>
    ))
  );
  // Animated attack beams
  const AttackBeams = () => (
    attackEvents.map(ev => {
      const src = latLonToVec3(ev.source_lat, ev.source_lon);
      const tgt = latLonToVec3(ev.target_lat, ev.target_lon);
      // Simple straight line (replace with bezier for realism)
      return (
        <line key={ev.event_id + '-beam'}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={new Float32Array([src.x, src.y, src.z, tgt.x, tgt.y, tgt.z])} count={2} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="white" linewidth={2} />
        </line>
      );
    })
  );
  // Globe mesh with heatmap shader
  return (
    <Canvas camera={{ position: [0, 0, 250], fov: 45 }} style={{ width: '100vw', height: '100vh' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      <mesh>
        <sphereGeometry args={[100, 64, 64]} />
        <meshBasicMaterial map={globeTexture} />
      </mesh>
      <AttackPings />
      <AttackBeams />
      {/* TODO: Add heatmap shader overlay */}
      {/* TODO: Add traffic flow lines */}
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}

function AttackStatsPanel({ stats, topSources, timeFilter, onFilterChange }) {
  return (
    <div className="heatmap-panel">
      <h2>Global Cyber Activity Heatmap</h2>
      <div className="live-counter">Attacks: {stats.total}</div>
      <table className="top-sources-table">
        <thead><tr><th>Source</th><th>Count</th></tr></thead>
        <tbody>
          {topSources.map(src => (
            <tr key={src.source_country}><td>{src.source_country}</td><td>{src.count}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="time-filters">
        {['5m','1h','24h','7d'].map(tf => (
          <button key={tf} className={timeFilter===tf?'active':''} onClick={()=>onFilterChange(tf)}>{tf}</button>
        ))}
        <input type="range" min="0" max="100" value="50" style={{width:'100%'}} /> {/* Playback scrubber */}
      </div>
    </div>
  );
}

function AIAnalystTerminal({ logs }) {
  return (
    <div className="ai-analyst-terminal" style={{background:'#111',color:'#0ff',padding:'1em',fontFamily:'monospace',height:'200px',overflow:'auto'}}>
      <h3>AI SOC Analyst</h3>
      <div className="logs">
        {logs.map((log,i)=>(<div key={i}>{log}</div>))}
      </div>
    </div>
  );
}

export default function CyberCommandCenter() {
  const [attackEvents, setAttackEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [topSources, setTopSources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [timeFilter, setTimeFilter] = useState('24h');

  // Demo mode: generate mock data
  useEffect(() => {
    const demoEvents = [];
    const countries = ['US','CN','RU','DE','FR','IN','BR','GB','JP','KR'];
    for(let i=0;i<30;i++){
      const srcLat = Math.random()*180-90;
      const srcLon = Math.random()*360-180;
      const tgtLat = Math.random()*180-90;
      const tgtLon = Math.random()*360-180;
      demoEvents.push({
        event_id: 'demo-'+i,
        timestamp: new Date(),
        source_ip: '192.0.'+i+'.1',
        source_country: countries[Math.floor(Math.random()*countries.length)],
        source_city: 'City'+i,
        source_lat: srcLat,
        source_lon: srcLon,
        target_ip: '10.0.'+i+'.2',
        target_country: countries[Math.floor(Math.random()*countries.length)],
        target_city: 'City'+i,
        target_lat: tgtLat,
        target_lon: tgtLon,
        attack_type: 'DDoS',
        severity: ['Low','Medium','High','Critical'][Math.floor(Math.random()*4)],
        vector: 'Botnet',
        industry: 'Finance',
        actor: 'APT'+i,
        feed_source: 'Sim',
      });
    }
    setAttackEvents(demoEvents);
    setStats({ total: demoEvents.length });
    // Top sources
    const srcAgg = {};
    demoEvents.forEach(ev=>{srcAgg[ev.source_country]=(srcAgg[ev.source_country]||0)+1;});
    setTopSources(Object.entries(srcAgg).map(([source_country,count])=>({source_country,count})).sort((a,b)=>b.count-a.count).slice(0,5));
    // Demo logs
    setLogs([
      '[11:14 PM] ADR Initiated: Neutralizing botnet spike in Southeast Asia',
      '[11:15 PM] Threat actor APT29 flagged in Moscow',
      '[11:16 PM] DDoS mitigated for US banking sector',
      '[11:17 PM] New attack detected: Critical severity in Tokyo',
      '[11:18 PM] Automated response deployed to EU region',
    ]);
  }, [timeFilter]);

  return (
    <div className="cyber-command-center" style={{display:'flex',flexDirection:'row',height:'100vh'}}>
      <div style={{flex:2}}>
        <ThreatGlobe attackEvents={attackEvents} />
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <AttackStatsPanel stats={stats} topSources={topSources} timeFilter={timeFilter} onFilterChange={setTimeFilter} />
        <AIAnalystTerminal logs={logs} />
      </div>
    </div>
  );
}
