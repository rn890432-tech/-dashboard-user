import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { generateMealPlan } from '../services/api';

export default function MealPlanScreen() {
  const [mealPlan, setMealPlan] = useState(null);

  const handleGenerate = () => {
    generateMealPlan({})
      .then(res => setMealPlan(res.data.mealPlan));
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
