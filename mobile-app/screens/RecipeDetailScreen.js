import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getRecipe, getRecipeVideo } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';

export default function RecipeDetailScreen({ route }) {
  const { id } = route.params || {};
  const [recipe, setRecipe] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    if (id) {
      getRecipe(id).then(res => setRecipe(res.data.recipe));
      getRecipeVideo(id).then(res => setVideoUrl(res.data.video.url));
    }
  }, [id]);

  if (!recipe) return <Text>Loading...</Text>;

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2">{recipe.title}</Text>
      <Text className="mb-2">Ingredients: {recipe.ingredients.join(', ')}</Text>
      <Text className="mb-2">Instructions: {recipe.instructions || 'See video.'}</Text>
      <Text className="mb-2">Nutrition: {recipe.nutrition ? JSON.stringify(recipe.nutrition) : 'N/A'}</Text>
      {videoUrl && <VideoPlayer videoUrl={videoUrl} />}
    </ScrollView>
  );
}
