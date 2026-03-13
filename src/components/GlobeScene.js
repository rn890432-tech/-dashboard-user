import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const GlobeScene = () => {
  const globeRef = useRef();
  const arcsRef = useRef([]);

  // Example threat arcs (customize as needed)
  const arcs = [
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

  // ...existing code...
};

export default GlobeScene;
