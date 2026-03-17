import React, { useEffect, useState } from 'react';

export default function ActivityFeed({ socket }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on('activity', activity => {
      setActivities(prev => [activity, ...prev.slice(0, 49)]);
    });
    return () => socket.off('activity');
  }, [socket]);

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Live Activity Feed</div>
      <ul>
        {activities.map((a, i) => (
          <li key={i} className="text-sm text-gray-700 border-b py-1">{a}</li>
        ))}
      </ul>
    </div>
  );
}
