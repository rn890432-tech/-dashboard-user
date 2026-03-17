
import React from 'react';
import RecipeVideoPlayer from '../video/RecipeVideoPlayer';

export default function RecipeCard({ recipe, onLike, onSave, onComment, onOpen }) {
  return (
    <div className="bg-white shadow rounded p-4 mb-4 flex flex-col">
      {recipe.videoURL ? (
        <RecipeVideoPlayer videoURL={recipe.videoURL} />
      ) : (
        <img src={recipe.image} alt={recipe.title} className="w-full h-64 object-cover rounded mb-2" loading="lazy" />
      )}
      <div className="font-bold text-lg mb-1">{recipe.title}</div>
      <div className="text-sm text-gray-500 mb-1">By @{recipe.creator}</div>
      <div className="text-xs text-gray-700 mb-2">Ingredients: {recipe.ingredients.slice(0,3).join(', ')}...</div>
      <div className="flex items-center mb-2">
        <span className="mr-4">❤️ {recipe.likes}</span>
        <span className="mr-4">💬 {recipe.comments}</span>
        <button className="ml-auto bg-blue-500 text-white px-3 py-1 rounded" onClick={() => onSave(recipe)}>Save</button>
      </div>
      <div className="flex gap-2">
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => onLike(recipe)}>Like</button>
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => onComment(recipe)}>Comment</button>
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => onOpen(recipe)}>Open</button>
      </div>
    </div>
  );
}
