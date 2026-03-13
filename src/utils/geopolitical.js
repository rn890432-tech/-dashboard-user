const GEOPOLITICAL_HOTSPOTS = [
  { region: "Middle East", keywords: ["Energy Grid", "Strait of Hormuz", "Supply Chain"], tension: 0.9 },
  { region: "East Asia", keywords: ["Semiconductor Trade", "Subsea Cables", "Satellite Link"], tension: 0.8 },
  { region: "Eastern Europe", keywords: ["Infrastructure", "Power Grid", "Disinfo"], tension: 0.85 }
];

export const getGeopoliticalInsight = (latestAttack) => {
  const hotspot = GEOPOLITICAL_HOTSPOTS.find(h => h.region === latestAttack.target_region);
  if (hotspot && latestAttack.severity > 0.6) {
    const motive = hotspot.keywords[Math.floor(Math.random() * hotspot.keywords.length)];
    return `🌍 GEOPOLITICAL ALERT: High-severity ${latestAttack.type} in ${hotspot.region} aligns with ${motive} volatility. Potential State-Sponsered activity suspected.`;
  }
  return null;
};

export const getGlobalTensionLevel = (alerts) => {
  // Aggregate tension based on recent attacks in hotspots
  let tension = 0;
  alerts.forEach(a => {
    const hotspot = GEOPOLITICAL_HOTSPOTS.find(h => h.region === a.target_region);
    if (hotspot && a.severity > 0.6) tension += hotspot.tension * a.severity;
  });
  return Math.min(tension / (alerts.length || 1), 1);
};
