import React from 'react';

export default function AdminCommandCenter({ system, alerts, reported, revenue, subscriptions }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Admin Command Center</div>
      <ul>
        <li>System Performance: {system}</li>
        <li>User Moderation Alerts: {alerts}</li>
        <li>Reported Content: {reported}</li>
        <li>Revenue Statistics: {revenue}</li>
        <li>Subscription Metrics: {subscriptions}</li>
      </ul>
    </div>
  );
}
