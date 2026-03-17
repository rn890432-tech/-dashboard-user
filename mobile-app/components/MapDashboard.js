  // Advanced map features: region highlighting, animated heatmap
  const [highlightedRegion, setHighlightedRegion] = useState(null);
  const handleRegionHover = country => setHighlightedRegion(country);
  // Example heatmap data
  const heatmapData = events.map(e => ({ lat: e.lat, lng: e.lng, value: e.recipePopularity }));
// Map Analytics Dashboard UI (integrated with ExploreMap)
import React, { useEffect, useState } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
    // Real-time event streaming widget
    const [liveEvents, setLiveEvents] = useState([]);
    useEffect(() => {
      const socket = window.io ? window.io('http://localhost:3000') : null;
      if (socket) {
        socket.on('map-event', event => setLiveEvents(evts => [event, ...evts].slice(0, 10)));
        return () => socket.disconnect();
      }
    }, []);
    // Chart visualizations
    const eventFrequencyData = {
      labels: eventFrequency.map(e => e.day),
      datasets: [{
        label: 'Events per Day',
        data: eventFrequency.map(e => e.count),
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
        fill: true,
      }],
    };
    const cuisinePieData = {
      labels: Object.keys(cuisineDistribution),
      datasets: [{
        data: Object.values(cuisineDistribution),
        backgroundColor: ['#FF9800', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0'],
      }],
    };
    const countryBarData = {
      labels: topCountries.map(([country]) => country),
      datasets: [{
        label: 'Top Countries',
        data: topCountries.map(([_, count]) => count),
        backgroundColor: '#2196F3',
      }],
    };
  // Advanced analytics: top trending countries, cuisine distribution, event frequency chart
  const [topCountries, setTopCountries] = useState([]);
  const [cuisineDistribution, setCuisineDistribution] = useState({});
  const [eventFrequency, setEventFrequency] = useState([]);

  useEffect(() => {
    // Calculate top trending countries
    const countryCounts = {};
    const cuisineCounts = {};
    const freq = {};
    events.forEach(e => {
      countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
      cuisineCounts[e.fastestGrowingCuisine] = (cuisineCounts[e.fastestGrowingCuisine] || 0) + 1;
      const day = e.time.split('T')[0];
      freq[day] = (freq[day] || 0) + 1;
    });
    setTopCountries(Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5));
    setCuisineDistribution(cuisineCounts);
    setEventFrequency(Object.entries(freq).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)));
  }, [events]);

  // Custom widget: trending recipe preview
  const trendingRecipe = events.length ? events[0].recipe : 'N/A';
import ExploreMapClustered from './ExploreMapClustered';
import { api } from '../services/api';

  // Polygon example
  const italyPolygon = [
    [45.0, 7.0], [44.0, 12.0], [41.0, 14.0], [39.0, 16.0], [37.0, 15.0], [38.0, 8.0], [45.0, 7.0]
  ];
  // Time slider
  const [timeFilter, setTimeFilter] = useState('week');
  // CSV export
  const [events, setEvents] = useState([]);
  const exportCSV = () => {
    const csv = events.map(e => `${e.time},${e.eventType},${e.country},${e.recipe},${e.creator},${e.userId}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map_events.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  // Accessibility
  const [highContrast, setHighContrast] = useState(false);
  const toggleContrast = () => setHighContrast(hc => !hc);
  useEffect(() => {
    api.get('/analytics/map-events', { params: { time: timeFilter } }).then(res => setEvents(res.data.events));
  }, [timeFilter]);
  return (
    <div aria-label="Global Recipe Map Dashboard" role="region" style={highContrast ? { background: '#000', color: '#fff' } : {}}>
      <div style={{ margin: '16px 0', display: 'flex', gap: 16 }}>
        <button onClick={toggleContrast} aria-label="Toggle high contrast mode">{highContrast ? 'Normal Mode' : 'High Contrast'}</button>
        <button onClick={exportCSV}>Export CSV</button>
        <label>
          Time:
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </label>
      </div>
      <ExploreMapClustered
        timeFilter={timeFilter}
        polygon={italyPolygon}
        highContrast={highContrast}
        highlightedRegion={highlightedRegion}
        onRegionHover={handleRegionHover}
        heatmapData={heatmapData}
      />
      {/* Advanced Analytics Widgets & Chart Visualizations */}
      <div style={{ display: 'flex', gap: 32, margin: '32px 0', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Top Trending Countries</h3>
          <Bar data={countryBarData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div style={{ minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Cuisine Distribution</h3>
          <Pie data={cuisinePieData} options={{ responsive: true }} />
        </div>
        <div style={{ minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Event Frequency</h3>
          <Line data={eventFrequencyData} options={{ responsive: true }} />
        </div>
        <div style={{ minWidth: 220, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Trending Recipe Preview</h3>
          <div>{trendingRecipe}</div>
        </div>
        <div style={{ minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Live Event Stream</h3>
          <ul style={{ maxHeight: 180, overflowY: 'auto' }}>
            {liveEvents.map((e, i) => (
              <li key={i} style={{ fontSize: 14 }}>{e.time} - {e.country} - {e.recipe} - {e.eventType}</li>
            ))}
          </ul>
        </div>
      </div>
      {/* Drill-down analytics: click country for details */}
      {highlightedRegion && (
        <div style={{ margin: '24px 0', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 16 }}>
          <h3>Drill-down: {highlightedRegion}</h3>
          <ul>
            {events.filter(e => e.country === highlightedRegion).map((e, i) => (
              <li key={i}>{e.time} - {e.recipe} - {e.eventType} - {e.creator}</li>
            ))}
          </ul>
        </div>
      )}
      <h2 id="dashboard-title">Map Analytics Dashboard</h2>
      <div style={{ overflowX: 'auto', marginTop: 32 }}>
        <table aria-labelledby="dashboard-title" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: highContrast ? '#222' : '#f9f9f9', zIndex: 2 }}>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Event</th>
              <th scope="col">Country</th>
              <th scope="col">Recipe</th>
              <th scope="col">Creator</th>
              <th scope="col">User</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} tabIndex={0} aria-label={`Event ${e.eventType} in ${e.country}`}
                style={highContrast ? { background: i % 2 ? '#111' : '#333', color: '#fff' } : { background: i % 2 ? '#fff' : '#f3f3f3' }}>
                <td>{e.time}</td>
                <td>{e.eventType}</td>
                <td>{e.country}</td>
                <td>{e.recipe}</td>
                <td>{e.creator}</td>
                <td>{e.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
