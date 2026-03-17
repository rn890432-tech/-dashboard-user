import React from 'react';
import AnalyticsChart from './AnalyticsChart';

export default function AIUsageAnalytics() {
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{ label: 'AI Recipe Generations', data: [100, 120, 150, 130, 160] }]
  };
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">AI Usage Analytics</h2>
      <AnalyticsChart data={chartData} options={{ responsive: true }} />
    </div>
  );
}
