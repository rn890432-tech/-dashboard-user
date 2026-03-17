// Example creator dashboard UI (Stub)
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function CreatorDashboard({ creatorId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/creator/${creatorId}/analytics`).then(res => setData(res.data));
  }, [creatorId]);
  if (!data) return <div>Loading...</div>;
  return (
    <div>
      <h2>Creator Dashboard</h2>
      <div>Total Subscribers: {data.subscriptions}</div>
      <div>Monthly Revenue: ${data.earnings}</div>
      <div>Video Views: {data.views}</div>
      <div>Recipe Downloads: {data.recipes}</div>
    </div>
  );
}
