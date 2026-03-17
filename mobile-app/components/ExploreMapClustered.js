      // Advanced map features: region highlighting, animated heatmap
      const [highlightedRegion, setHighlightedRegion] = useState(null);
      const handleRegionHover = country => setHighlightedRegion(country);
      // Example heatmap data
      const heatmapData = regions.map(r => ({ lat: countryCoords[r.country][0], lng: countryCoords[r.country][1], value: r.recipePopularity }));
    // Accessibility: high contrast mode
    const [highContrast, setHighContrast] = useState(false);
    const toggleContrast = () => setHighContrast(hc => !hc);

    // Accessibility: keyboard navigation for preview panel
    useEffect(() => {
      if (selected) {
        const handler = e => {
          if (e.key === 'Escape') setSelected(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }
    // Map overlay controls
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showClusters, setShowClusters] = useState(true);
    const [showPolygons, setShowPolygons] = useState(true);
    // Accept widget props
    // ...existing code...
    return (
      <div aria-label="Global Recipe Map" role="region" style={highContrast ? { background: '#000', color: '#fff' } : {}}>
        <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
          <button onClick={toggleContrast} aria-label="Toggle high contrast mode">{highContrast ? 'Normal Mode' : 'High Contrast'}</button>
          <button onClick={() => setShowHeatmap(h => !h)}>{showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}</button>
          <button onClick={() => setShowClusters(c => !c)}>{showClusters ? 'Hide Clusters' : 'Show Clusters'}</button>
          <button onClick={() => setShowPolygons(p => !p)}>{showPolygons ? 'Hide Polygons' : 'Show Polygons'}</button>
        </div>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: 600, width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {showPolygons && <Polygon positions={italyPolygon} color="#4CAF50" />}
          {showClusters && (
            <MarkerClusterGroup>
              {regions.map(r => (
                <Marker key={r.country} position={countryCoords[r.country]} eventHandlers={{ click: () => setSelected(r) }}>
                  <Tooltip>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ReactCountryFlag countryCode={getCountryCode(r.country)} svg style={{ width: 24, height: 24 }} />
                      {r.country}: {r.trendingRecipes[0]}
                      <span>{getCuisineIcon(r.fastestGrowingCuisine)}</span>
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
          {showHeatmap && (
            // Animated heatmap overlay (pseudo-code, replace with actual heatmap layer if using leaflet-heatmap or similar)
            // <HeatmapLayer points={heatmapData} />
            null
          )}
          {/* UI polish: animated preview panel */}
          {selected && (
            <div className="preview-panel" style={{ position: 'absolute', right: 32, top: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16, transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ReactCountryFlag countryCode={getCountryCode(selected.country)} svg style={{ width: 32, height: 32 }} />
                <h3>{selected.country}</h3>
                <span>{getCuisineIcon(selected.fastestGrowingCuisine)}</span>
              </div>
              <div>Trending Recipes: {selected.trendingRecipes.join(', ')}</div>
              <div>Top Creator: {selected.topCreator}</div>
              <div>Most Cooked: {selected.mostCooked}</div>
              <div>Fastest Growing Cuisine: {selected.fastestGrowingCuisine}</div>
              <div>Popularity: {selected.recipePopularity}</div>
              <button onClick={() => setSelected(null)}>Close</button>
            </div>
          )}
        </MapContainer>
      </div>
    );
  const [timeFilter, setTimeFilter] = useState('week');
  useEffect(() => {
    api.get('/explore/trending-by-region', { params: { time: timeFilter } }).then(res => setRegions(res.data.regions));
    const socket = io('http://localhost:3000');
    socket.on('map-event', event => setEvents(evts => [...evts, event]));
    return () => socket.disconnect();
  }, [timeFilter]);

  // Example coordinates
  const countryCoords = {
    Italy: [41.9, 12.5],
    Japan: [35.7, 139.7],
    Mexico: [19.4, -99.1]
  };

  // Example polygon for Italy
  const italyPolygon = [
    [45.0, 7.0], [44.0, 12.0], [41.0, 14.0], [39.0, 16.0], [37.0, 15.0], [38.0, 8.0], [45.0, 7.0]
  ];
  return (
    <div aria-label="Global Recipe Map" role="region" style={highContrast ? { background: '#000', color: '#fff' } : {}}>
      <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
        <button onClick={toggleContrast} aria-label="Toggle high contrast mode">{highContrast ? 'Normal Mode' : 'High Contrast'}</button>
      <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
        <button onClick={exportCSV}>Export CSV</button>
      </div>
      <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
        <label>
          Time:
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </label>
      </div>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: 600, width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polygon positions={italyPolygon} color="#4CAF50" />
        <MarkerClusterGroup>
          {regions.map(r => (
            <Marker key={r.country} position={countryCoords[r.country]} eventHandlers={{ click: () => setSelected(r), mouseover: () => handleRegionHover(r.country), mouseout: () => setHighlightedRegion(null) }}>
                      {/* Highlight region polygon */}
                      {highlightedRegion && (
                        <Polygon positions={[countryCoords[highlightedRegion]]} color="#FF9800" />
                      )}
                      {/* Animated heatmap overlay (pseudo-code, replace with actual heatmap layer if using leaflet-heatmap or similar) */}
                      {/* <HeatmapLayer points={heatmapData} /> */}
              <Tooltip>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ReactCountryFlag countryCode={getCountryCode(r.country)} svg style={{ width: 24, height: 24 }} />
                  {r.country}: {r.trendingRecipes[0]}
                  <span>{getCuisineIcon(r.fastestGrowingCuisine)}</span>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
        {/* UI polish: animated preview panel */}
        {selected && (
          <div className="preview-panel" style={{ position: 'absolute', right: 32, top: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16, transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ReactCountryFlag countryCode={getCountryCode(selected.country)} svg style={{ width: 32, height: 32 }} />
              <h3>{selected.country}</h3>
              <span>{getCuisineIcon(selected.fastestGrowingCuisine)}</span>
            </div>
            <div>Trending Recipes: {selected.trendingRecipes.join(', ')}</div>
            <div>Top Creator: {selected.topCreator}</div>
            <div>Most Cooked: {selected.mostCooked}</div>
            <div>Fastest Growing Cuisine: {selected.fastestGrowingCuisine}</div>
            <div>Popularity: {selected.recipePopularity}</div>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        )}
      </MapContainer>
    </div>
  );
  // Helper functions
  function getCountryCode(country) {
    const codes = { Italy: 'IT', Japan: 'JP', Mexico: 'MX' };
    return codes[country] || 'US';
  }
  function getCuisineIcon(cuisine) {
    const icons = {
      Tuscan: '🍝',
      Okinawan: '🍜',
      Yucatecan: '🌮'
    };
    return icons[cuisine] || '🍽️';
  }
}
