// RealTimeTelemetryDashboard: Real-time stats and pipeline health
import React from 'react';

const RealTimeTelemetryDashboard = ({ stats }) => (
  <div className="real-time-telemetry-dashboard">
    <h4>Real-Time Telemetry</h4>
    <div>Attacks per minute: {stats.attacksPerMinute}</div>
    <div>Top attacking countries: {stats.topCountries.join(', ')}</div>
    <div>Most targeted assets: {stats.targetedAssets.join(', ')}</div>
    <div>Detection pipeline health: {stats.pipelineHealth}</div>
  </div>
);

export default RealTimeTelemetryDashboard;
