import React from 'react';

export default function TopRecipesList({ recipes }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Top Trending Recipes</div>
      <ul>
        {recipes.map((r, i) => (
          <li key={i} className="text-sm text-gray-700 border-b py-1">{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
