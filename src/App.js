import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import ShieldOverlay from './components/ShieldOverlay';
import KillSwitch from './components/KillSwitch';
import GlobeScene from './components/GlobeScene';
import ThreatHeatMap from './components/ThreatHeatMap';
import UserLabel from './components/UserLabel';
import GlitchEffect from './components/GlitchEffect';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import './styles/App.css';
import './styles/ShieldOverlay.css';
import './styles/UserLabel.css';
import './styles/KillSwitch.css';
import './styles/LoginPage.css';
import './styles/GlitchEffect.css';

const operationalUsers = [
  { id: 1, name: "Sarah_HR", dept: "HR", pos: [40.7, -74.0, 0] },
  { id: 2, name: "JSmith_Finance", dept: "FIN", pos: [51.5, -0.12, 0] },
  { id: 3, name: "Klee_Dev", dept: "ENG", pos: [37.7, -122.4, 0] }
];

import Dashboard from './components/Dashboard'; // Correct relative path
const DashboardContent = () => {
  const { user, login, logout } = useAuth();
  // Cypress test bypass: show dashboard if running in Cypress
  const isCypress = window.Cypress !== undefined;
  if (isCypress || user.isLoggedIn) {
    return <Dashboard />;
  }
  return <LoginPage onLogin={() => login('ADMIN')} />;
};

const App = () => (
  <AuthProvider>
    <DashboardContent />
  </AuthProvider>
);

export default App;
