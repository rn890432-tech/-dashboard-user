import React from 'react';

export default function PredictedPopularRecipesWidget({ recipes }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Predicted Popular Recipes</div>
      <ul>
        {recipes.map((r, i) => (
          <li key={i} className="text-sm text-orange-700 border-b py-1">{r.title} ({r.predictionScore}%)</li>
        ))}
      </ul>
    </div>
  );
}
