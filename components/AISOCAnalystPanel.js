// AISOCAnalystPanel: Enhanced AI analyst features
import React from 'react';

const AISOCAnalystPanel = ({ correlatedAlerts, investigationGraph, incidentSummary, recommendations }) => (
  <div className="ai-soc-analyst-panel">
    <h4>AI SOC Analyst</h4>
    <div>Incident Summary: {incidentSummary}</div>
    <div>Recommendations: {recommendations}</div>
    <div>Investigation Graph:</div>
    <pre>{JSON.stringify(investigationGraph, null, 2)}</pre>
    <div>Correlated Alerts:</div>
    <pre>{JSON.stringify(correlatedAlerts, null, 2)}</pre>
  </div>
);

export default AISOCAnalystPanel;
