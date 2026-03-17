import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Placeholder for globe and activity data
function Globe({ activityEvents }) {
  // Render globe, animated arcs, glowing markers, tooltips
  return null; // Replace with Three.js globe implementation
}

export default function ActivityGlobe({ activityEvents }) {
  return (
    <div className="h-96 w-full bg-black rounded shadow">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <Globe activityEvents={activityEvents} />
        <OrbitControls enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
