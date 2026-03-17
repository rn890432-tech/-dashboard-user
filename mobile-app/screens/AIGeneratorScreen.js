import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { generateRecipe } from '../services/api';

export default function AIGeneratorScreen() {
  const [ingredients, setIngredients] = useState('');
  const [result, setResult] = useState(null);

  const handleGenerate = () => {
    generateRecipe(ingredients)
      .then(res => setResult(res.data.recipe));
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">AI Recipe Generator</Text>
      <TextInput
        className="border rounded p-2 mb-4"
        placeholder="Enter ingredients (e.g. Chicken, rice, garlic)"
        value={ingredients}
        onChangeText={setIngredients}
      />
      <Button title="Generate Recipe" onPress={handleGenerate} />
      {result && (
        <View className="mt-4">
          <Text className="text-lg font-semibold">{result.title}</Text>
          <Text>Ingredients: {result.ingredients.join(', ')}</Text>
          <Text>Instructions: {result.instructions}</Text>
        </View>
      )}
    </View>
  );
}
