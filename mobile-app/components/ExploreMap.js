// Example Map UI using react-simple-maps and react-leaflet (Stub)
import React, { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
// For heatmap, use SVG overlays or D3 (stub example below)
import { api } from '../services/api';

export default function ExploreMap() {
  const [regions, setRegions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    api.get('/explore/trending-by-region').then(res => setRegions(res.data.regions));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  // Example marker coordinates (should be mapped to real lat/lng)
  const countryCoords = {
    Italy: [12.5, 41.9],
    Japan: [139.7, 35.7],
    Mexico: [-99.1, 19.4]
  };

  // Heatmap stub: draw semi-transparent circles sized by recipePopularity
  // Responsive style
  const mapStyle = {
    width: '100%',
    maxWidth: 800,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px #ccc'
  };
  // Animated heatmap stub: use CSS transitions or D3 for real animation
  return (
    <div style={{ padding: 8 }}>
      <h2 style={{ textAlign: 'center' }}>Global Recipe Discovery Map</h2>
      <ComposableMap style={mapStyle}>
                {/* User location marker */}
                {userLocation && (
                  <Marker coordinates={[userLocation.lng, userLocation.lat]}>
                    <circle r={10} fill="#2196F3" />
                  </Marker>
                )}
              {/* Local trending recipes panel */}
              {userLocation && (
                <div style={{ border: '1px solid #2196F3', marginTop: 16, padding: 12 }}>
                  <h4>Your Location</h4>
                  <div>Lat: {userLocation.lat}, Lng: {userLocation.lng}</div>
                  {/* In production, match user location to country and show local trending recipes */}
                </div>
              )}
        <Geographies geography="https://unpkg.com/world-atlas@1.1.4/world/110m.json">
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography key={geo.rsmKey} geography={geo} />
            ))
          }
        </Geographies>
        {/* Heatmap circles */}
        {regions.map(r => (
          <Marker key={r.country + '-heatmap'} coordinates={countryCoords[r.country]}>
            <circle
              r={Math.max(10, Math.sqrt(r.recipePopularity) / 10)}
              fill="#FF5722"
              opacity={0.25}
            />
          </Marker>
        ))}
        {/* Cluster markers for dense regions (stub) */}
        {/* In production, use react-leaflet-markercluster or similar */}
        {regions.map(r => (
          <Marker key={r.country} coordinates={countryCoords[r.country]}>
            <circle r={8} fill="#FF5722" onClick={() => setSelected(r)} />
          </Marker>
        ))}
      </ComposableMap>
      {/* Search/filter UI */}
      <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <select onChange={e => setCuisineFilter(e.target.value)}>
          <option value="">All Cuisines</option>
          <option value="Tuscan">Tuscan</option>
          <option value="Okinawan">Okinawan</option>
          <option value="Yucatecan">Yucatecan</option>
        </select>
        <select onChange={e => setDietFilter(e.target.value)}>
          <option value="">All Diets</option>
          <option value="vegan">Vegan</option>
          <option value="keto">Keto</option>
          <option value="vegetarian">Vegetarian</option>
        </select>
        <label>
          Popularity:
          <input type="range" min={0} max={20000} onChange={e => setPopularityFilter(Number(e.target.value))} />
        </label>
      </div>
      {/* Recipe preview panel with analytics tracking */}
      {selected && (
        <div style={{ border: '1px solid #ccc', marginTop: 16, padding: 12 }}>
          <h3>{selected.country}</h3>
          <div>Trending Recipes: {selected.trendingRecipes.join(', ')}</div>
          <div>Top Creator: {selected.topCreator}</div>
          <div>Most Cooked: {selected.mostCooked}</div>
          <div>Fastest Growing Cuisine: {selected.fastestGrowingCuisine}</div>
          <div>Popularity: {selected.recipePopularity}</div>
          <button onClick={() => api.post('/analytics/map-event', {
            eventType: 'recipe_click',
            country: selected.country,
            recipe: selected.trendingRecipes[0],
            creator: selected.topCreator,
            userId: 'currentUserId'
          })}>View Recipe</button>
        </div>
      )}
    </div>
  );
}
