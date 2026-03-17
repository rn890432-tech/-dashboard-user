import React, { useEffect, useState } from 'react';
import { getTrendingFeed } from '../../api/feed';

export default function TrendingPanel() {
  const [trending, setTrending] = useState([]);
  useEffect(() => {
    getTrendingFeed().then(data => setTrending(data.recipes || []));
  }, []);
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Top Recipes Today</div>
      <ul>
        {trending.map((r, i) => (
          <li key={i} className="text-sm text-orange-700 border-b py-1">{r.title} by @{r.creator}</li>
        ))}
      </ul>
    </div>
  );
}
