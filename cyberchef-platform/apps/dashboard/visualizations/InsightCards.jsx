import React from 'react';

export default function InsightCards({ insights }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white shadow rounded p-4">
        <div className="font-bold mb-2">Trending Ingredients</div>
        <div>{insights.trendingIngredients.join(', ')}</div>
      </div>
      <div className="bg-white shadow rounded p-4">
        <div className="font-bold mb-2">Popular Cuisines</div>
        <div>{insights.popularCuisines.join(', ')}</div>
      </div>
      <div className="bg-white shadow rounded p-4">
        <div className="font-bold mb-2">Top Creators</div>
        <div>{insights.topCreators.join(', ')}</div>
      </div>
      <div className="bg-white shadow rounded p-4">
        <div className="font-bold mb-2">AI Recipe Success Rate</div>
        <div>{insights.successRate}%</div>
      </div>
    </div>
  );
}
