import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const [role, setRole] = useState('VIEWER');

  const handleSubmit = (e) => {
    e.preventDefault();
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
          <button type="submit" className="login-btn">
            INITIALIZE SESSION
          </button>
        </form>
        <div className="security-footer">
          <span>● Z-TRUST VERIFIED</span>
          <span>SYSTEM: HARDENED</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
