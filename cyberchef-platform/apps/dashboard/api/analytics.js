import axios from 'axios';

export async function getUserAnalytics() {
  return axios.get('/analytics/users');
}

export async function getRecipeAnalytics() {
  return axios.get('/analytics/recipes');
}

export async function getRevenueAnalytics() {
  return axios.get('/analytics/revenue');
}

export async function getAIUsageAnalytics() {
  return axios.get('/analytics/ai-usage');
}
