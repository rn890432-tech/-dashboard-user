import React from 'react';

export default function AIInsightsPanel({ insights }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">AI Insights</div>
      <ul>
        <li>Trending Ingredients: {insights.trendingIngredients.join(', ')}</li>
        <li>Popular Cuisines: {insights.popularCuisines.join(', ')}</li>
        <li>Top Creators: {insights.topCreators.join(', ')}</li>
        <li>Recipe Recommendations: {insights.recommendations.join(', ')}</li>
      </ul>
    </div>
  );
}
