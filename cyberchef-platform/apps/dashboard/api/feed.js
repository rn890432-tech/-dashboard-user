import axios from 'axios';

export async function getFeedRecommendations(page = 1) {
  return axios.get(`/api/feed/recommendations?page=${page}`).then(res => res.data);
}

export async function getTrendingFeed() {
  return axios.get('/api/feed/trending').then(res => res.data);
}

export async function getPersonalizedFeed() {
  return axios.get('/api/feed/personalized').then(res => res.data);
}

export function trackEngagement(type, recipeId) {
  axios.post('/api/feed/engagement', { type, recipeId });
}
