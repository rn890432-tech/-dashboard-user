// AttackerPathTracingEngine: Visualizes attacker paths
import React from 'react';

const AttackerPathTracingEngine = ({ alert, path }) => (
  <div className="attacker-path-tracing">
    <h4>Attacker Path</h4>
    {/* Highlight source IP, hops, target asset */}
    <pre>{JSON.stringify(path, null, 2)}</pre>
  </div>
);

export default AttackerPathTracingEngine;
