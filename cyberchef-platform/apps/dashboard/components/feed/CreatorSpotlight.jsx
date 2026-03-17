import React, { useEffect, useState } from 'react';
import { getTrendingFeed } from '../../api/feed';

export default function CreatorSpotlight() {
  const [creators, setCreators] = useState([]);
  useEffect(() => {
    getTrendingFeed().then(data => setCreators(data.creators || []));
  }, []);
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Fastest Growing Creators</div>
      <ul>
        {creators.map((c, i) => (
          <li key={i} className="text-sm text-purple-700 border-b py-1">{c.name} ({c.growth}%)</li>
        ))}
      </ul>
    </div>
  );
}
