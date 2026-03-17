import React from 'react';
import StatCard from './StatCard';
import AnalyticsChart from './AnalyticsChart';
import ActivityFeed from './ActivityFeed';
import TopRecipesList from './TopRecipesList';

export default function MainDashboard() {
  // Placeholder data
  const stats = [
    { title: 'Total Users', value: 12000 },
    { title: 'Total Recipes', value: 3400 },
    { title: 'Daily Active Users', value: 800 },
    { title: 'Monthly Revenue', value: '$12,000' },
    { title: 'AI Recipe Generations', value: 1500 },
  ];
  const trendingRecipes = [
    { title: 'Vegan Chili' },
    { title: 'Classic Carbonara' },
    { title: 'Avocado Toast' }
  ];
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{ label: 'User Growth', data: [1000, 3000, 7000, 12000] }]
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>
        <AnalyticsChart data={chartData} options={{ responsive: true }} />
        <TopRecipesList recipes={trendingRecipes} />
      </div>
      <div>
        <ActivityFeed />
      </div>
    </div>
  );
}
