import React from 'react';
import AnalyticsChart from './AnalyticsChart';

export default function RecipeAnalytics() {
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{ label: 'Recipes Created', data: [20, 30, 25, 40, 35] }]
  };
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Recipe Analytics</h2>
      <AnalyticsChart data={chartData} options={{ responsive: true }} />
    </div>
  );
}
