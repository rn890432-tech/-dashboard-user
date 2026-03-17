import React from 'react';
import RevenueChart from './RevenueChart';

export default function RevenueAnalytics() {
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{ label: 'Revenue', data: [5000, 8000, 12000, 15000] }]
  };
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Revenue Analytics</h2>
      <RevenueChart data={chartData} options={{ responsive: true }} />
    </div>
  );
}
