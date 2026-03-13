import React, { useEffect, useState } from 'react';

function randomHex(len = 16) {
  let hex = '';
  for (let i = 0; i < len; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

const PolymorphicVault = ({ certificateContent, biometricVerified }) => {
  const [fileName, setFileName] = useState(randomHex());
  const [stealthLink, setStealthLink] = useState(null);
  const [linkExpiry, setLinkExpiry] = useState(null);

  useEffect(() => {
    // Rename file every 60s
    const interval = setInterval(() => {
      setFileName(randomHex());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateStealthLink = () => {
    const url = `/vault/${fileName}`;
    setStealthLink(url);
    setLinkExpiry(Date.now() + 30000);
    setTimeout(() => {
      setStealthLink(null);
      setLinkExpiry(null);
    }, 30000);
  };

  return (
    <div className="polymorphic-vault" style={{marginTop:'24px',border:'1px dashed #888',padding:'12px',borderRadius:'8px'}}>
      <div><strong>Polymorphic Vault File Name:</strong> {fileName}</div>
      <button onClick={generateStealthLink} disabled={!biometricVerified} style={{marginTop:'8px',padding:'6px 12px',background:'#333',color:'#fff',border:'none',borderRadius:'6px'}}>Generate Stealth-Link</button>
      {stealthLink && (
        <div style={{marginTop:'8px'}}>
          <strong>One-Time Stealth-Link:</strong> <a href={stealthLink} target="_blank" rel="noopener noreferrer">{stealthLink}</a><br/>
          <span style={{color:'#ff9800'}}>Expires in {Math.max(0, Math.floor((linkExpiry - Date.now())/1000))}s</span>
        </div>
      )}
      {!biometricVerified && <div style={{marginTop:'8px',color:'#888'}}>Biometric handshake required to reveal true certificate.</div>}
    </div>
  );
};

export default PolymorphicVault;
