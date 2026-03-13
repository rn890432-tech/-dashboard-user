import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import '../styles/UserLabel.css';

const UserLabel = ({ name, position, dept }) => {
  const [isTargeted, setIsTargeted] = useState(false);

  useEffect(() => {
    const handleThreat = (e) => {
      if (e.detail.user && e.detail.user.toLowerCase() === name.toLowerCase()) {
        setIsTargeted(true);
        setTimeout(() => setIsTargeted(false), 5000);
      }
    };
    const handleKillswitch = () => {
      setIsTargeted(false);
    };
    window.addEventListener('SOC_THREAT_EVENT', handleThreat);
    window.addEventListener('SOC_KILLSWITCH', handleKillswitch);
    return () => {
      window.removeEventListener('SOC_THREAT_EVENT', handleThreat);
      window.removeEventListener('SOC_KILLSWITCH', handleKillswitch);
    };
  }, [name]);

  return (
    <Html position={position} center distanceFactor={10}>
      <div className={`user-hud-label${isTargeted ? ' targeted-alert' : ''}`}>
        <div className="label-content">
          <span className="dept-tag">{dept}</span>
          <span className="user-name">{name}</span>
        </div>
        {isTargeted && <div className="threat-ping">⚠️ CRITICAL THREAT</div>}
      </div>
    </Html>
  );
};

export default UserLabel;
