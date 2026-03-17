require('dotenv').config();
const express = require('express');
const aiRoutes = require('./routes/aiRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const nutritionRoutes = require('./routes/nutrition');
const userSignalRoutes = require('./routes/userSignal');
const personalizedRecipeRoutes = require('./routes/personalizedRecipe');
const weeklyMealPlanRoutes = require('./routes/weeklyMealPlan');
const groceryListRoutes = require('./routes/groceryList');
const notificationsRoutes = require('./routes/notifications');
const aiInsightsRoutes = require('./routes/aiInsights');
const mealPlannerRoutes = require('./routes/mealPlanner');

const app = express();
app.use(express.json());

app.use('/api', aiRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', nutritionRoutes);
app.use('/api/user-signal', userSignalRoutes);
app.use('/api/ai/personalized-recipe', personalizedRecipeRoutes);
app.use('/api/ai/weekly-meal-plan', weeklyMealPlanRoutes);
app.use('/api/ai/grocery-list', groceryListRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai/insights', aiInsightsRoutes);
app.use('/api/ai', mealPlannerRoutes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});
