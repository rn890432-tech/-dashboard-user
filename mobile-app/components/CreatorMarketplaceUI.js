// Example UI integration for Creator Marketplace
// Add to recipe page or creator profile

import React, { useState } from 'react';
import { api } from '../services/api';

export default function CreatorMarketplaceUI({ creatorId, recipeId }) {
  const [earnings, setEarnings] = useState(null);

  const uploadRecipe = async (recipeData) => {
    await api.post('/creator/upload-recipe', { creatorId, recipeData });
    alert('Recipe uploaded!');
  };

  const subscribe = async (userId) => {
    await api.post('/creator/subscribe', { userId, creatorId });
    alert('Subscribed!');
  };

  const viewVideo = async () => {
    await api.post('/creator/video-view', { recipeId });
    alert('View tracked!');
  };

  const fetchEarnings = async () => {
    const res = await api.get(`/creator/${creatorId}/earnings`);
    setEarnings(res.data.earnings);
  };

  return (
    <div>
      <button onClick={() => uploadRecipe({ title: 'New Recipe', steps: [] })}>Upload Recipe</button>
      <button onClick={() => subscribe('user123')}>Subscribe</button>
      <button onClick={viewVideo}>View Video</button>
      <button onClick={fetchEarnings}>Show Earnings</button>
      {earnings !== null && <div>Earnings: ${earnings}</div>}
    </div>
  );
}
