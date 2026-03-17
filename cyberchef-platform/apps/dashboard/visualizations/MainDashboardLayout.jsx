import React, { useEffect, useState } from 'react';
import AIRecommendationWidget from './AIRecommendationWidget';
import PredictiveAnalyticsChart from './PredictiveAnalyticsChart';
import TrendingIngredientsWidget from './TrendingIngredientsWidget';
import TopCreatorsWidget from './TopCreatorsWidget';
import PredictedPopularRecipesWidget from './PredictedPopularRecipesWidget';
import IngredientPopularityChart from './IngredientPopularityChart';
import UserEngagementPredictionChart from './UserEngagementPredictionChart';
import { getAIRecommendations, getPredictiveAnalytics } from '../api/ai-recommendations';

export default function MainDashboardLayout({ socket }) {
  const [recommendations, setRecommendations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [trendingIngredients, setTrendingIngredients] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [predictedRecipes, setPredictedRecipes] = useState([]);
  const [predictionTrends, setPredictionTrends] = useState({});
  const [ingredientPopularity, setIngredientPopularity] = useState({});
  const [userEngagement, setUserEngagement] = useState({});

  // Fetch initial data
  useEffect(() => {
    getAIRecommendations().then(data => {
      setRecommendations(data.recommendations || []);
      setTrendingIngredients(data.trendingIngredients || []);
      setTopCreators(data.topCreators || []);
      setPredictedRecipes(data.predictedRecipes || []);
      setPredictionTrends(data.predictionTrends || {});
      setIngredientPopularity(data.ingredientPopularity || {});
      setUserEngagement(data.userEngagement || {});
    });
    getPredictiveAnalytics().then(data => {
      setAnomalies(data.anomalies || []);
    });
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.on('ai-update', data => {
      setRecommendations(data.recommendations || []);
      setAnomalies(data.anomalies || []);
      setTrendingIngredients(data.trendingIngredients || []);
      setTopCreators(data.topCreators || []);
      setPredictedRecipes(data.predictedRecipes || []);
      setPredictionTrends(data.predictionTrends || {});
      setIngredientPopularity(data.ingredientPopularity || {});
      setUserEngagement(data.userEngagement || {});
    });
    return () => socket.off('ai-update');
  }, [socket]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <AIRecommendationWidget recommendations={recommendations} anomalies={anomalies} />
        <PredictiveAnalyticsChart data={predictionTrends} options={{ responsive: true }} />
        <TrendingIngredientsWidget ingredients={trendingIngredients} />
        <TopCreatorsWidget creators={topCreators} />
        <PredictedPopularRecipesWidget recipes={predictedRecipes} />
        <IngredientPopularityChart data={ingredientPopularity} options={{ responsive: true }} />
        <UserEngagementPredictionChart data={userEngagement} options={{ responsive: true }} />
      </div>
    </div>
  );
}
