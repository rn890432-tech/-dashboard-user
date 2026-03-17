// Meal Planner: Generates weekly meal plans
module.exports = function mealPlan({ diet, cuisine }) {
  // Placeholder: In production, use AI/LLM or DB
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return days.map(day => ({
    day,
    meals: [
      { title: `Breakfast (${diet || 'Any'})`, cuisine: cuisine || 'Any' },
      { title: `Lunch (${diet || 'Any'})`, cuisine: cuisine || 'Any' },
      { title: `Dinner (${diet || 'Any'})`, cuisine: cuisine || 'Any' }
    ]
  }));
};