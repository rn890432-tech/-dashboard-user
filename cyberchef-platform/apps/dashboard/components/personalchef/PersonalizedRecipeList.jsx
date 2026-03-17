import React from 'react';

export default function PersonalizedRecipeList({ recipes }) {
  return (
    <div className="mb-4">
      <div className="font-bold mb-2">Personalized Recipes</div>
      <ul>
        {recipes.map((r, i) => (
          <li key={i} className="text-sm text-green-700 border-b py-1">{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
