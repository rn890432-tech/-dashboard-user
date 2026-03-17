import React from 'react';
import { View, Text } from 'react-native';

export default function IngredientList({ ingredients }) {
  return (
    <View className="mb-2">
      <Text className="font-semibold">Ingredients:</Text>
      {ingredients.map((ing, idx) => (
        <Text key={idx}>{ing}</Text>
      ))}
    </View>
  );
}
