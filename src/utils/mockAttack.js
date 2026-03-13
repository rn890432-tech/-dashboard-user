const ATTACK_TYPES = ["DDoS", "SQL Injection", "Brute Force", "Malware", "Phishing", "Ransomware"];
const SEVERITY_LEVELS = [0.1, 0.4, 0.7, 1.0]; // Low to Critical
const GLOBAL_HUBS = [
  { name: "North America", lat: 37.0902, lng: -95.7129 },
  { name: "Europe", lat: 54.5260, lng: 15.2551 },
  { name: "East Asia", lat: 35.8617, lng: 104.1954 },
  { name: "South America", lat: -14.2350, lng: -51.9253 },
  { name: "Africa", lat: -8.7832, lng: 34.5085 }
];

export const generateMockAttack = () => {
  const source = GLOBAL_HUBS[Math.floor(Math.random() * GLOBAL_HUBS.length)];
  const target = GLOBAL_HUBS[Math.floor(Math.random() * GLOBAL_HUBS.length)];
  const actualTarget = target.name === source.name 
    ? GLOBAL_HUBS[(GLOBAL_HUBS.indexOf(target) + 1) % GLOBAL_HUBS.length] 
    : target;

  return {
    id: `attack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source_lat: source.lat + (Math.random() - 0.5) * 10,
    source_lng: source.lng + (Math.random() - 0.5) * 10,
    source_region: source.name,
    target_lat: actualTarget.lat + (Math.random() - 0.5) * 10,
    target_lng: actualTarget.lng + (Math.random() - 0.5) * 10,
    target_region: actualTarget.name,
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    severity: SEVERITY_LEVELS[Math.floor(Math.random() * SEVERITY_LEVELS.length)],
  };
};

export const getAIAnalystInsight = (currentAlerts) => {
  if (currentAlerts.length === 0) return "Scanning global mesh... Baseline noise detected.";

  const latest = currentAlerts[0];
  const highSeverityCount = currentAlerts.filter(a => a.severity >= 0.7).length;
  if (highSeverityCount > 5) {
    return `⚠️ CRITICAL: Cluster of ${latest.type} detected in ${latest.target_region}. Autonomous Defense AI suggests immediate Geofencing of source range.`;
  }
  if (latest.type === "DDoS") {
    return `📡 NETWORK ALERT: Inbound volumetric spike targeting ${latest.target_region}. Scaling edge capacity to compensate.`;
  }
  if (latest.type === "Ransomware") {
    return `🧬 SIGNATURE MATCH: High-probability ${latest.type} attempt detected. Isolated payload in sandbox for analysis.`;
  }
  const regionActivity = currentAlerts.reduce((acc, curr) => {
    acc[curr.target_region] = (acc[curr.target_region] || 0) + 1;
    return acc;
  }, {});
  const hotZone = Object.keys(regionActivity).reduce((a, b) => regionActivity[a] > regionActivity[b] ? a : b);
  return `🕵️ ANALYST NOTE: Increased heat concentration in ${hotZone}. Monitoring for lateral movement.`;
};
