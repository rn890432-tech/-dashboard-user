import React from 'react';

export default function AIRecommendationWidget({ recommendations, anomalies }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">AI Recommendations & Predictive Analytics</div>
      <div className="mb-4">
        <div className="font-semibold">Recommended Actions:</div>
        <ul>
          {recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-blue-700 border-b py-1">{rec}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-semibold">Detected Anomalies:</div>
        <ul>
          {anomalies.map((an, i) => (
            <li key={i} className="text-sm text-red-700 border-b py-1">{an}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
