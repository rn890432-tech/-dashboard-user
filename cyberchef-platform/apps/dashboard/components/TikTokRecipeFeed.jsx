import React, { useEffect, useState } from 'react';

export default function TikTokRecipeFeed({ aiService }) {
  const [recipes, setRecipes] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    aiService.getTikTokFeed().then(data => setRecipes(data.recipes || []));
  }, []);

  const nextRecipe = () => setCurrent((c) => (c + 1) % recipes.length);
  const prevRecipe = () => setCurrent((c) => (c - 1 + recipes.length) % recipes.length);

  if (!recipes.length) return <div className="text-center p-8">Loading feed...</div>;

  const recipe = recipes[current];

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="w-full max-w-md bg-white rounded shadow p-4 mb-4">
        <h2 className="text-2xl font-bold mb-2">{recipe.title}</h2>
        <img src={recipe.image} alt={recipe.title} className="w-full h-64 object-cover rounded mb-2" />
        <div className="mb-2">{recipe.description}</div>
        <div className="flex justify-between">
          <button className="bg-gray-200 px-4 py-2 rounded" onClick={prevRecipe}>Prev</button>
          <button className="bg-gray-200 px-4 py-2 rounded" onClick={nextRecipe}>Next</button>
        </div>
      </div>
      <div className="text-white text-sm">Swipe up/down or use buttons to discover more recipes!</div>
    </div>
  );
}
