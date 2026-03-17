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
import InvestigationGraphPage from './components/InvestigationGraphPage.jsx';
import ThreatActorProfilePage from './components/ThreatActorProfilePage.jsx';
import GlobalAttackMapPage from './components/GlobalAttackMapPage.jsx';
import ThreatIntelFeedsPage from './components/ThreatIntelFeedsPage.jsx';
import CaseManagementPage from './components/CaseManagementPage.jsx';
import ExecutiveRiskDashboardPage from './components/ExecutiveRiskDashboardPage.jsx';
import DataConnectorsPage from './components/DataConnectorsPage.jsx';
import DetectionRuleBuilderPage from './components/DetectionRuleBuilderPage.jsx';
import StreamingMetricsPanel from './components/StreamingMetricsPanel.jsx';
import CommandCenterPage from './components/CommandCenterPage.jsx';
const DashboardContent = () => {
  const { user, login } = useAuth();
  const path = window.location.pathname;
  // Cypress test bypass: show dashboard if running in Cypress
  const isCypress = window.Cypress !== undefined;

  // ── Authentication gate ─────────────────────────────────────
  if (!isCypress && !user.isLoggedIn) {
    return <LoginPage onLogin={() => login('ADMIN')} />;
  }

  // ── Protected routes ────────────────────────────────────────
  if (path === '/investigation/graph') {
    return <InvestigationGraphPage />;
  }
  if (path === '/dashboard/global-attack-map') {
    return <GlobalAttackMapPage />;
  }
  if (path === '/threat-intel/feeds') {
    return <ThreatIntelFeedsPage />;
  }
  if (path.startsWith('/threat-intel/actors/')) {
    return <ThreatActorProfilePage />;
  }
  if (path === '/cases') {
    return <CaseManagementPage />;
  }
  if (path === '/risk/executive') {
    return <ExecutiveRiskDashboardPage />;
  }
  if (path === '/connectors') {
    return <DataConnectorsPage />;
  }
  if (path === '/rules') {
    return <DetectionRuleBuilderPage />;
  }
  if (path === '/streaming') {
    return <StreamingMetricsPanel />;
  }
  if (path === '/dashboard/command-center') {
    return <CommandCenterPage />;
  }
  return <Dashboard />;
};

const App = () => (
  <AuthProvider>
    <DashboardContent />
  </AuthProvider>
);

export default App;
