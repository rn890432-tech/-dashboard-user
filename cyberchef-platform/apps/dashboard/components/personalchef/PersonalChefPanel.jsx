import React, { useState } from 'react';
import DietProfile from './DietProfile';
import PersonalizedRecipeList from './PersonalizedRecipeList';
import GroceryList from './GroceryList';
import WeeklyMealPlanner from './WeeklyMealPlanner';

export default function PersonalChefPanel({ aiService, user }) {
  const [diet, setDiet] = useState(user.diet || {});
  const [recipes, setRecipes] = useState([]);
  const [groceryList, setGroceryList] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);

  const updateDiet = async (profile) => {
    setDiet(profile);
    const recs = await aiService.generatePersonalizedRecipes(profile);
    setRecipes(recs);
    const groceries = await aiService.generateGroceryList(recs);
    setGroceryList(groceries);
    const plan = await aiService.autoPlanMeals(profile);
    setMealPlan(plan);
  };

  return (
    <div className="bg-white shadow rounded p-4 max-w-2xl mx-auto">
      <DietProfile diet={diet} onUpdate={updateDiet} />
      <PersonalizedRecipeList recipes={recipes} />
      <GroceryList items={groceryList} />
      <WeeklyMealPlanner plan={mealPlan} />
    </div>
  );
}
