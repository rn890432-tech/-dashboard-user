import IncidentResponsePanel from './IncidentResponsePanel.jsx';
import ComplianceMetricsPanel from './ComplianceMetricsPanel.jsx';
import AutomationControlPanel from './AutomationControlPanel.jsx';
import React from 'react';
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

const operationalUsers = [
  { id: 1, name: "Sarah_HR", dept: "HR", pos: [40.7, -74.0, 0] },
  { id: 2, name: "JSmith_Finance", dept: "FIN", pos: [51.5, -0.12, 0] },
  { id: 3, name: "Klee_Dev", dept: "ENG", pos: [37.7, -122.4, 0] }
];

const Dashboard = () => {
  const { user } = useAuth();
  if (!user.isLoggedIn) {
    return <div style={{textAlign:'center',marginTop:'40px'}}>Please log in to access the dashboard.</div>;
  }
  return (
    <div className="soc-dashboard responsive-layout">
      <h1 style={{margin:'24px 0',color:'#00bfff',fontSize:'2rem',textAlign:'center'}}>Dashboard</h1>
      <ShieldOverlay />
      <KillSwitch />
      <GlobalReadinessHUD tensionLevel={3} />
      <AIAnalystTerminal />
      <SecurityAuditTab />
      {user.role === 'ADMIN' && <UserManagementDashboard isAdmin={true} />}
      <IncidentResponsePanel />
      <ComplianceMetricsPanel />
      <AutomationControlPanel />
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
