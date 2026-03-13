// Global Threat Feed Component
// Displays live global threat events
import React from 'react';

const GlobalThreatFeed = ({ events }) => (
  <div className="global-threat-feed">
    <h2>Global Threat Feed</h2>
    <ul>
      {events.map((event, idx) => (
        <li key={idx}>
          <strong>{event.type}</strong>: {event.description}
        </li>
      ))}
    </ul>
  </div>
);

export default GlobalThreatFeed;
