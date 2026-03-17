import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';

export default function MealPlannerScreen() {
  const [mealPlan, setMealPlan] = useState(null);

  const handleGenerate = () => {
    fetch('https://api.cyberchef.ai/api/mobile/ai/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: {} })
    })
      .then(res => res.json())
      .then(data => setMealPlan(data.mealPlan));
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Meal Planner</Text>
      <Button title="Generate Weekly Meal Plan" onPress={handleGenerate} />
      {mealPlan && (
        <View className="mt-4">
          <Text className="text-lg font-semibold mb-2">Weekly Plan</Text>
          {mealPlan.meals.map((meal, idx) => (
            <Text key={idx}>{meal}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
