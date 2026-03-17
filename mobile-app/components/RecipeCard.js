import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

export default function RecipeCard({ recipe, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} className="mb-4 bg-gray-100 rounded p-4">
      <Image source={{ uri: recipe.image || 'https://via.placeholder.com/150' }} className="h-32 w-full rounded mb-2" />
      <Text className="text-lg font-semibold mb-2">{recipe.title}</Text>
      <Text className="mb-2">Likes: {recipe.likes}</Text>
    </TouchableOpacity>
  );
}
