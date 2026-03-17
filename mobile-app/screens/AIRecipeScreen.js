import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';

export default function AIRecipeScreen() {
  const [ingredients, setIngredients] = useState('');
  const [result, setResult] = useState(null);

  const handleGenerate = () => {
    fetch('https://api.cyberchef.ai/api/mobile/ai/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    })
      .then(res => res.json())
      .then(data => setResult(data.recipe));
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
