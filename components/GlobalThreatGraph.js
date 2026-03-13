// Global Threat Graph Component
// Visualizes global attack relationships
import React from 'react';

const GlobalThreatGraph = ({ graphData }) => (
  <div className="global-threat-graph">
    <h2>Global Threat Graph</h2>
    {/* Visualization logic goes here */}
    <pre>{JSON.stringify(graphData, null, 2)}</pre>
  </div>
);

export default GlobalThreatGraph;
