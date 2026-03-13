/**
 * OMNI-SOC CHAOS TEST: MARCH 11, 2026
 * Triggers Handala (Iran), BlackSanta (Russia), and SolarWinds Recon (China)
 */

// Broadcast threat event to React UI
const launchThreat = (threatData) => {
  // 1. Existing logic to show arc on globe...
  // 2. Broadcast to React components
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    const event = new CustomEvent('SOC_THREAT_EVENT', {
      detail: {
        type: threatData.type, // 'destructive', 'credential', etc.
        user: threatData.userData && threatData.userData.username,
        severity: 'HIGH'
      }
    });
    window.dispatchEvent(event);
  }
};

const runChaosTest = () => {
  const users = [
    { username: "sarah_hr", hostname: "HR-LAPTOP-04", ip: "10.0.5.21", dept: "HR" },
    { username: "m_chen_fin", hostname: "FIN-STATION-01", ip: "10.0.4.10", dept: "Finance" }
  ];

  // 1. Handala Wiper Strike (Tehran -> Cork/US Hubs)
  const handalaEvent = {
    type: 'destructive',
    name: "Handala Wiper (MOIS Signature)",
    src: { lat: 35.6, lng: 51.3 },
    dest: { lat: 51.8, lng: -8.4 }, // Cork, Ireland
    userData: users[1]
  };
  io.emit('security_event', handalaEvent);
  launchThreat(handalaEvent);

  // 2. BlackSanta EDR-Killer (Moscow -> US HR Node)
  setTimeout(() => {
    const blackSantaEvent = {
      type: 'credential',
      name: "BlackSanta EDR-Killer (BYOVD)",
      src: { lat: 55.7, lng: 37.6 },
      dest: { lat: 40.7, lng: -74.0 },
      userData: users[0]
    };
    io.emit('security_event', blackSantaEvent);
    launchThreat(blackSantaEvent);
  }, 2000);

  // 3. SolarWinds KEV Recon (Beijing -> Global Scan)
  setTimeout(() => {
    const solarWindsEvent = {
      type: 'agentic',
      name: "CISA-KEV SolarWinds Probe",
      src: { lat: 39.9, lng: 116.4 },
      dest: { lat: 38.9, lng: -77.0 },
      isGhost: true,
      userData: { hostname: "WHD-PROD-SERVER" }
    };
    io.emit('security_event', solarWindsEvent);
    launchThreat(solarWindsEvent);
  }, 4000);
};

console.log("🚀 Omni-SOC Chaos Simulator Ready. Type 'chaos' for live March 11 telemetry.");
