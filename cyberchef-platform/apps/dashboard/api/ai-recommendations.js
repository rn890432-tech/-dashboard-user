import axios from 'axios';

export async function getAIRecommendations() {
  // Example: GET /ai/recommendations
  const res = await axios.get('/ai/recommendations');
  return res.data;
}

export async function getPredictiveAnalytics() {
  // Example: GET /ai/predictive-analytics
  const res = await axios.get('/ai/predictive-analytics');
  return res.data;
}
