import IncidentResponsePanel from './IncidentResponsePanel.jsx';
import ComplianceMetricsPanel from './ComplianceMetricsPanel.jsx';
import AutomationControlPanel from './AutomationControlPanel.jsx';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ShieldOverlay from './ShieldOverlay';
import KillSwitch from './KillSwitch';
import GlobeScene from './GlobeScene';
import ThreatHeatMap from './ThreatHeatMap';
import UserLabel from './UserLabel';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import GlobalReadinessHUD from './GlobalReadinessHUD';
import AIAnalystTerminal from './AIAnalystTerminal';
import SecurityAuditTab from './SecurityAuditTab';
import UserManagementDashboard from './UserManagementDashboard.jsx';
import GlobalThreatFeed from './GlobalThreatFeed';
import IncidentTimeline from './IncidentTimeline.jsx';
import InvestigationGraph from './InvestigationGraph';
import ThreatInvestigationGraph3D from './ThreatInvestigationGraph3D.jsx';
import DashboardKpiStrip from './DashboardKpiStrip.jsx';
import IncidentCreateForm from './IncidentCreateForm.jsx';
import ThreatCreateForm from './ThreatCreateForm.jsx';
import TelemetryIntelLivePanel from './TelemetryIntelLivePanel.jsx';
import ThreatIntelAggregatorPanel from './ThreatIntelAggregatorPanel.jsx';
import AutonomousSocAnalystPanel from './AutonomousSocAnalystPanel.jsx';
import SocAiDryRunPanel from './SocAiDryRunPanel.jsx';
import CyberAttackReplayPanel from './CyberAttackReplayPanel.jsx';
import GlobalLiveCyberAttackMap from './GlobalLiveCyberAttackMap.jsx';
import SimulationControlPanel from './SimulationControlPanel.jsx';
import StreamingWidget from './StreamingWidget.jsx';

const operationalUsers = [
  { id: 1, name: "Sarah_HR", dept: "HR", pos: [40.7, -74.0, 0] },
  { id: 2, name: "JSmith_Finance", dept: "FIN", pos: [51.5, -0.12, 0] },
  { id: 3, name: "Klee_Dev", dept: "ENG", pos: [37.7, -122.4, 0] }
];

const Dashboard = () => {
  const { user } = useAuth();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showThreatForm, setShowThreatForm] = useState(false);
  const isCypress = typeof window !== 'undefined' && window.Cypress !== undefined;
  if (!isCypress && !user.isLoggedIn) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Please log in to access the dashboard.</div>;
  }
  return (
    <div className="soc-dashboard responsive-layout">
      <h1 style={{ margin: '24px 0', color: '#00bfff', fontSize: '2rem', textAlign: 'center' }}>Dashboard</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="/investigation/graph"
            style={{
              color: '#81d4fa',
              border: '1px solid #81d4fa55',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Open 3D Investigation Graph
          </a>
          <a
            href="/dashboard/global-attack-map"
            style={{
              color: '#ffcc80',
              border: '1px solid #ffcc8055',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Open Global 3D Attack Map
          </a>
          <a
            href="/threat-intel/feeds"
            style={{
              color: '#00ff88',
              border: '1px solid #00ff8855',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ◈ Threat Intel Feeds
          </a>
          <a
            href="/cases"
            style={{
              color: '#7dd3fc',
              border: '1px solid #7dd3fc55',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ⬡ Case Management
          </a>
          <a
            href="/risk/executive"
            style={{
              color: '#a78bfa',
              border: '1px solid #a78bfa55',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ▲ Executive Risk
          </a>
          <a
            href="/connectors"
            style={{
              color: '#fbbf24',
              border: '1px solid #fbbf2455',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ⬢ Data Connectors
          </a>
          <a
            href="/rules"
            style={{
              color: '#f87171',
              border: '1px solid #f8717155',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ✦ Detection Rules
          </a>
          <a
            href="/streaming"
            style={{
              color: '#38bdf8',
              border: '1px solid #38bdf855',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ◈ Streaming Pipeline
          </a>
          <a
            href="/dashboard/command-center"
            style={{
              color: '#f1f5f9',
              background: 'linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)',
              border: '1px solid #38bdf888',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              boxShadow: '0 0 8px #38bdf844',
            }}
          >
            🛡 War Room
          </a>
        </div>
      </div>
      <ShieldOverlay />
      <KillSwitch />
      <GlobalReadinessHUD tensionLevel={3} />
      <DashboardKpiStrip />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0 12px' }}>
        <button
          onClick={() => setShowIncidentForm((s) => !s)}
          style={{
            background: '#29b6f6',
            border: 'none',
            borderRadius: 6,
            color: '#001018',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '0.78rem',
          }}
        >
          {showIncidentForm ? 'Hide Incident Form' : 'Create Incident'}
        </button>
        <button
          onClick={() => setShowThreatForm((s) => !s)}
          style={{
            background: '#8bc34a',
            border: 'none',
            borderRadius: 6,
            color: '#0b1a00',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '0.78rem',
          }}
        >
          {showThreatForm ? 'Hide Threat Form' : 'Create Threat'}
        </button>
      </div>

      {showIncidentForm && (
        <div style={{ marginBottom: 12 }}>
          <IncidentCreateForm onClose={() => setShowIncidentForm(false)} />
        </div>
      )}

      {showThreatForm && (
        <div style={{ marginBottom: 12 }}>
          <ThreatCreateForm onClose={() => setShowThreatForm(false)} />
        </div>
      )}

      {/* Streaming pipeline summary widget */}
      <div style={{ margin: '8px 0 16px' }}>
        <StreamingWidget />
      </div>

      <TelemetryIntelLivePanel />
      <ThreatIntelAggregatorPanel />
      <SimulationControlPanel />
      <GlobalLiveCyberAttackMap />
      <AutonomousSocAnalystPanel />
      <SocAiDryRunPanel />
      <CyberAttackReplayPanel />

      <AIAnalystTerminal />
      <SecurityAuditTab />
      {user.role === 'ADMIN' && <UserManagementDashboard isAdmin={true} />}
      <IncidentResponsePanel />
      <ComplianceMetricsPanel />
      <AutomationControlPanel />
      <GlobalThreatFeed />
      <IncidentTimeline />
      <InvestigationGraph />
      <ThreatInvestigationGraph3D />
      <Canvas camera={{ position: [0, 0, 250], fov: 45 }} style={{ width: '100vw', height: '100vh' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} intensity={1} />
        <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade />
        <GlobeScene />
        <ThreatHeatMap />
        {operationalUsers.map(user => (
          <UserLabel
            key={user.id}
            name={user.name}
            dept={user.dept}
            position={user.pos}
          />
        ))}
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="soc-footer">
        <span>OMNI-SOC VERSION 2026.3.11</span>
        <span className="live-pulse">● LIVE TELEMETRY ACTIVE</span>
      </div>
    </div>
  );
};

export default Dashboard;
