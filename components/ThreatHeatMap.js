import React, { useEffect } from 'react';

const ThreatHeatMap = () => {
  const [heatmapData, setHeatmapData] = React.useState([]);
  useEffect(() => {
    const handleKillswitch = () => {
      setHeatmapData([]);
    };
    window.addEventListener('SOC_KILLSWITCH', handleKillswitch);
    // Poll threat feed every 5s
    const pollThreatFeed = async () => {
      try {
        const res = await fetch('/api/threat-feed');
        const data = await res.json();
        setHeatmapData(Array.isArray(data) ? data : []);
      } catch {}
    };
    pollThreatFeed();
    const interval = setInterval(pollThreatFeed, 5000);
    return () => {
      window.removeEventListener('SOC_KILLSWITCH', handleKillswitch);
      clearInterval(interval);
    };
  }, []);

  // Render heatmap as glowing spheres for each threat
  return (
    <group>
      {heatmapData.map((threat, idx) => (
        <mesh key={threat.id || idx} position={[threat.x, threat.y, threat.z]}>
          <sphereGeometry args={[4 + threat.severity * 8, 32, 32]} />
          <meshBasicMaterial 
            color={threat.severity >= 0.7 ? '#ff0033' : threat.severity >= 0.4 ? '#ffff00' : '#00ffff'} 
            transparent 
            opacity={0.5 + threat.severity * 0.5} 
            emissive={threat.severity >= 0.7 ? '#ff0033' : '#00ffff'} 
          />
        </mesh>
      ))}
    </group>
  );
};

export default ThreatHeatMap;
