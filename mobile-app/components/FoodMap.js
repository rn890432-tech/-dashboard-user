// Example Global Food Map UI (Stub)
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FoodMap() {
  const [trending, setTrending] = useState([]);
  useEffect(() => {
    api.get('/discovery/food-map').then(res => setTrending(res.data.trending));
  }, []);
  return (
    <div>
      <h2>Global Food Map</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {trending.map((t, i) => (
          <div key={i} style={{ margin: 16, border: '1px solid #ccc', padding: 12 }}>
            <h3>{t.country}</h3>
            <div>Recipe: {t.recipe}</div>
            <div>Views: {t.views}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
