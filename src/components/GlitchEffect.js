import React, { useEffect } from 'react';
import '../styles/GlitchEffect.css';

const GlitchEffect = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="glitch-overlay">
      <div className="glitch-layers">
        <div className="glitch-layer"></div>
        <div className="glitch-layer"></div>
        <div className="glitch-layer"></div>
      </div>
      <div className="glitch-text">SYSTEM INITIALIZING...</div>
    </div>
  );
};

export default GlitchEffect;
