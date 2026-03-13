import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const [role, setRole] = useState('VIEWER');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple MFA simulation: code must be '123456'
    if (role === 'ADMIN' && mfaCode !== '123456') {
      setMfaError('Invalid MFA code.');
      return;
    }
    login(role);
  };

  return (
    <div className="login-container">
      <div className="glass-form-card">
        <div className="form-header">
          <div className="auth-icon">🔐</div>
          <h1>OMNI-SOC ACCESS</h1>
          <p>Secure Identity Gateway - March 11, 2026</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>OPERATOR IDENTITY</label>
            <input type="text" placeholder="Enter UID..." defaultValue="ADMIN_STATION_01" readOnly />
          </div>
          <div className="input-group">
            <label>ACCESS CLEARANCE</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="VIEWER">VIEWER (Read-Only)</option>
              <option value="ANALYST">ANALYST (Triage Only)</option>
              <option value="ADMIN">ADMIN (Full Override Access)</option>
            </select>
          </div>
          {role === 'ADMIN' && (
            <div className="input-group">
              <label>MFA Code</label>
              <input type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="Enter MFA code" />
              {mfaError && <div style={{color:'red',fontSize:'12px'}}>{mfaError}</div>}
            </div>
          )}
          <button type="submit" className="login-btn">
            INITIALIZE SESSION
          </button>
        </form>
        <div className="security-footer">
          <span>● Z-TRUST VERIFIED</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
