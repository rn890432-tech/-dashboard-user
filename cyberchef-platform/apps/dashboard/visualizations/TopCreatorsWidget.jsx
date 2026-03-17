import React from 'react';

export default function TopCreatorsWidget({ creators }) {
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
