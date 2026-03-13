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

const DashboardContent = () => {
  const { user, login, logout } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (user.isLoggedIn) {
      setIsTransitioning(true);
    }
  }, [user.isLoggedIn]);

  const completeTransition = () => {
    setIsTransitioning(false);
    setShowDashboard(true);
  };

  if (!user.isLoggedIn) return <LoginPage />;
  if (isTransitioning && !showDashboard) return <GlitchEffect onComplete={completeTransition} />;

  return (
    <div className={`soc-dashboard ${showDashboard ? 'fade-in' : ''}`}>
      <ShieldOverlay />
      <KillSwitch />
      <Canvas camera={{ position: [0, 0, 250], fov: 45 }}>
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
        <OrbitControls 
          enablePan={false} 
          minDistance={150} 
          maxDistance={400} 
          autoRotate={true} 
          autoRotateSpeed={0.5} 
        />
      </Canvas>
      <div className="soc-footer">
        <span>OMNI-SOC VERSION 2026.3.11</span>
        <span className="live-pulse">● LIVE TELEMETRY ACTIVE</span>
        <span>Current Role: {user.role}</span>
        <button onClick={() => login('ADMIN')}>Login as Admin</button>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <DashboardContent />
  </AuthProvider>
);

export default App;
