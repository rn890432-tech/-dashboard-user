import React, { useEffect, useState } from 'react';

export default function LiveTimeline({ socket }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on('event', event => {
      setEvents(prev => [event, ...prev.slice(0, 49)]);
    });
    return () => socket.off('event');
  }, [socket]);

  return (
    <div className="bg-white shadow rounded p-4 h-96 overflow-y-auto">
      <div className="font-bold mb-2">Live Activity Timeline</div>
      <ul>
        {events.map((e, i) => (
          <li key={i} className="text-sm text-gray-700 border-b py-1">{e.type}: {e.data}</li>
        ))}
      </ul>
    </div>
  );
}
