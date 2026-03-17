import React, { useEffect, useState } from 'react';

export default function AIInsightsPanel({ userId }) {
  const [insights, setInsights] = useState({});

  useEffect(() => {
    fetch(`/api/ai/insights?userId=${userId}`)
      .then(res => res.json())
      .then(data => setInsights(data));
  }, [userId]);

  return (
    <div className="bg-white shadow rounded p-4 mb-6">
      <div className="font-bold mb-2">AI Insights</div>
      <div>
        <div className="mb-2">Most Eaten Ingredients:</div>
        <ul>
          {insights.mostEatenIngredients && Object.entries(insights.mostEatenIngredients).map(([ing, count]) => (
            <li key={ing}>{ing}: {count} times</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <div className="mb-2">Nutrition Balance Trends:</div>
        <ul>
          {insights.nutritionTrends && Object.entries(insights.nutritionTrends).map(([k, v]) => (
            <li key={k}>{k}: {v}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <div className="mb-2">Suggested Dietary Improvements:</div>
        <ul>
          {insights.suggestions && insights.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
