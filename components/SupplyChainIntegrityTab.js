import React, { useState, useEffect } from 'react';
import { fetchVendorRiskMap, fetchKEVFeed } from '../utils/supplyChainUtils';

// Color codes for risk levels
const riskColors = {
  'HIGH': '#ff4d4d', // Red
  'MODERATE': '#ffd700', // Yellow
  'SECURE': '#4caf50', // Green
};

const zeroDayColors = {
  'React2Shell': '#ff4d4d',
  'Qualcomm': '#ff9800',
  '.NET Engine Crash': '#2196f3',
  'None': '#4caf50',
};

function SupplyChainIntegrityTab() {
  const [vendorMap, setVendorMap] = useState([]);
  const [blastRadius, setBlastRadius] = useState(5.28);
  const [simulateBreach, setSimulateBreach] = useState(false);
  const [kevFeed, setKevFeed] = useState([]);

  useEffect(() => {
    fetchVendorRiskMap().then(setVendorMap);
    fetchKEVFeed('2026-03').then(setKevFeed);
  }, []);

  // Simulate blast radius multiplier
  const blastRadiusValue = simulateBreach ? blastRadius * 1.5 : blastRadius;

  return (
    <div className="supply-chain-integrity-tab">
      <h2>Supply Chain Integrity</h2>
      {/* Vendor Risk Map Visualization */}
      <section>
        <h3>Vendor Risk Map</h3>
        <div className="vendor-risk-map">
          {vendorMap.map((node, idx) => (
            <div
              key={node.name}
              style={{
                border: '2px solid ' + riskColors[node.risk],
                background: zeroDayColors[node.zeroDay] || '#eee',
                padding: '8px',
                margin: '6px',
                borderRadius: '8px',
                display: 'inline-block',
                minWidth: '120px',
              }}
            >
              <strong>{node.name}</strong><br />
              Risk: <span style={{ color: riskColors[node.risk] }}>{node.risk}</span><br />
              Zero-Day: <span style={{ color: zeroDayColors[node.zeroDay] }}>{node.zeroDay}</span><br />
              Nth-party: {node.nthParty ? 'Yes' : 'No'}
            </div>
          ))}
        </div>
      </section>

      {/* Blast Radius Simulator */}
      <section>
        <h3>Blast Radius Simulator</h3>
        <label>
          <input
            type="checkbox"
            checked={simulateBreach}
            onChange={() => setSimulateBreach(!simulateBreach)}
          />
          Simulate SaaS Provider Breach
        </label>
        <div style={{ marginTop: '10px' }}>
          Blast Radius Multiplier: <strong>{blastRadiusValue.toFixed(2)}x</strong>
        </div>
        {simulateBreach && (
          <div style={{ color: '#ff4d4d', marginTop: '8px' }}>
            Autonomous Defense AI: Connection snapped, lateral movement blocked.
          </div>
        )}
      </section>

      {/* Live KEV Feed */}
      <section>
        <h3>Live KEV Feed (March 2026)</h3>
        <div className="kev-feed" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ccc', padding: '8px' }}>
          {kevFeed.length === 0 ? (
            <em>Loading...</em>
          ) : (
            kevFeed.map((kev, idx) => (
              <div key={kev.cve} style={{ marginBottom: '6px' }}>
                <strong>{kev.cve}</strong>: {kev.title}<br />
                <span style={{ color: '#ff4d4d' }}>{kev.date}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default SupplyChainIntegrityTab;
