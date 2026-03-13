// ThreatIntelCorrelationEngine: Matches IPs/domains with threat feeds
import React from 'react';

const ThreatIntelCorrelationEngine = ({ matches }) => (
  <div className="threat-intel-correlation-engine">
    <h4>Threat Intelligence Correlation</h4>
    <pre>{JSON.stringify(matches, null, 2)}</pre>
  </div>
);

export default ThreatIntelCorrelationEngine;
