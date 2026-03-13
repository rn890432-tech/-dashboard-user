import React, { useState, useEffect } from 'react';
import '../styles/ShieldOverlay.css';

const ShieldOverlay = () => {
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [alertText, setAlertText] = useState("");

  useEffect(() => {
    const handleThreat = (e) => {
      const { type, user } = e.detail;
      setIsShieldActive(true);
      setAlertText(`BLOCKING: ${type.toUpperCase()} attack on ${user}`);
      setTimeout(() => setIsShieldActive(false), 3000);
    };
    const handleKillswitch = () => {
      setIsShieldActive(false);
      setAlertText("");
    };
    window.addEventListener('SOC_THREAT_EVENT', handleThreat);
    window.addEventListener('SOC_KILLSWITCH', handleKillswitch);
    return () => {
      window.removeEventListener('SOC_THREAT_EVENT', handleThreat);
      window.removeEventListener('SOC_KILLSWITCH', handleKillswitch);
    };
  }, []);

  return (
    <div className={`shield-container${isShieldActive ? ' active-pulse' : ''}`}>
      {isShieldActive && <div className="warning-banner">{alertText}</div>}
    </div>
  );
};

export default ShieldOverlay;
