import React from 'react';

export default function TrendingIngredientsWidget({ ingredients }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Trending Ingredients</div>
      <ul>
        {ingredients.map((ing, i) => (
          <li key={i} className="text-sm text-green-700 border-b py-1">{ing}</li>
        ))}
      </ul>
    </div>
  );
}
