import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { getRecommendations } from '../services/api';
import RecipeCard from '../components/RecipeCard';

export default function HomeFeedScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    getRecommendations().then(res => setRecipes(res.data.recommendations));
  }, []);

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Recipe Feed</Text>
      <FlatList
        data={recipes}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => navigation.navigate('Recipe Detail', { id: item.id })} />
        )}
      />
    </View>
  );
}
