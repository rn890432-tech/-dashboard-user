import React, { useEffect, useState } from 'react';
import GroceryList from '../components/chef/GroceryList';
import WeeklyMealPlanner from '../components/personalchef/WeeklyMealPlanner';
import PersonalizedRecipeList from '../components/personalchef/PersonalizedRecipeList';
import AIInsightsPanel from '../components/personalchef/AIInsightsPanel';

export default function PersonalChefDashboard({ userId }) {
  const [todayMeals, setTodayMeals] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [nutritionProgress, setNutritionProgress] = useState({});
  const [groceryList, setGroceryList] = useState({});

  useEffect(() => {
    // Fetch weekly meal plan
    fetch('/api/ai/weekly-meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
      .then(res => res.json())
      .then(plan => {
        setMealPlan(plan);
        setTodayMeals(plan[0]?.meals || []);
        // Fetch grocery list
        fetch('/api/ai/grocery-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealPlan: plan })
        })
          .then(res => res.json())
          .then(list => setGroceryList(list));
      });
    // Fetch nutrition progress (placeholder)
    setNutritionProgress({ calories: 1800, protein: 90, carbs: 200, fat: 60 });
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">AI Personal Chef Dashboard</h1>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Today’s Recommended Meals</h2>
        <PersonalizedRecipeList recipes={todayMeals} />
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Weekly Meal Plan</h2>
        <WeeklyMealPlanner plan={mealPlan} />
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Nutrition Progress</h2>
        <div className="bg-gray-100 p-4 rounded">
          <div>Calories: {nutritionProgress.calories}</div>
          <div>Protein: {nutritionProgress.protein}g</div>
          <div>Carbs: {nutritionProgress.carbs}g</div>
          <div>Fat: {nutritionProgress.fat}g</div>
        </div>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Grocery List</h2>
        <GroceryList groceryData={groceryList} />
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI Insights</h2>
        <AIInsightsPanel userId={userId} />
      </section>
    </div>
  );
}
