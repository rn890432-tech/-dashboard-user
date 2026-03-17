import React, { useEffect, useState, useRef } from 'react';
import RecipeCard from './RecipeCard';
import { getFeedRecommendations, getPersonalizedFeed, trackEngagement } from '../../api/feed';

export default function RecipeFeed() {
  const [recipes, setRecipes] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const feedRef = useRef();

  useEffect(() => {
    setLoading(true);
    getFeedRecommendations(page).then(data => {
      setRecipes(prev => [...prev, ...(data.recipes || [])]);
      setLoading(false);
    });
  }, [page]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading) {
        setPage(p => p + 1);
      }
    };
    feedRef.current?.addEventListener('scroll', handleScroll);
    return () => feedRef.current?.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const handleLike = recipe => {
    trackEngagement('LIKE_RECIPE', recipe.id);
    // ...update UI
  };
  const handleSave = recipe => {
    trackEngagement('SAVE_RECIPE', recipe.id);
    // ...update UI
  };
  const handleComment = recipe => {
    trackEngagement('COMMENT_RECIPE', recipe.id);
    // ...open comment modal
  };
  const handleOpen = recipe => {
    trackEngagement('VIEW_RECIPE', recipe.id);
    // ...navigate to detail page
  };

  return (
    <div ref={feedRef} className="h-screen overflow-y-auto">
      {recipes.map((recipe, i) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onLike={handleLike}
          onSave={handleSave}
          onComment={handleComment}
          onOpen={handleOpen}
        />
      ))}
      {loading && <div className="text-center p-4">Loading...</div>}
    </div>
  );
}
