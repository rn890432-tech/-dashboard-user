import React, { useState } from 'react';
import '../styles/KillSwitch.css';
import { useAuth } from '../context/AuthContext';

const KillSwitch = () => {
  const [isActivating, setIsActivating] = useState(false);
  const { user } = useAuth();

  const handleOverride = () => {
    const event = new CustomEvent('SOC_KILLSWITCH', {
      detail: { timestamp: new Date().toLocaleTimeString() }
    });
    window.dispatchEvent(event);
    setIsActivating(true);
    setTimeout(() => setIsActivating(false), 2000);
    console.log('🛑 [MANUAL OVERRIDE] All automated blocks cleared.');
  };

  // Only render for ADMIN users
  if (user.role !== 'ADMIN') return null;

  return (
    <div className="killswitch-wrapper">
      <button
        className={`kill-button ${isActivating ? 'active' : ''}`}
        onDoubleClick={handleOverride}
        title="Double-click to Override All Blocks"
      >
        <div className="kill-icon">☢️</div>
        <span className="kill-text">MANUAL OVERRIDE (ADMIN ONLY)</span>
      </button>
      {isActivating && <div className="override-glitch">SYSTEM RESETTING...</div>}
    </div>
  );
};

export default KillSwitch;
