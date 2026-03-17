import React from 'react';
import UserGrowthChart from './UserGrowthChart';

export default function UserAnalytics() {
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{ label: 'User Growth', data: [1000, 3000, 7000, 12000] }]
  };
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">User Analytics</h2>
      <UserGrowthChart data={chartData} options={{ responsive: true }} />
    </div>
  );
}
