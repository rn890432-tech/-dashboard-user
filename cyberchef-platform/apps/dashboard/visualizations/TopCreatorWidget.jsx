import React from 'react';

export default function TopCreatorWidget({ creators }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Top Performing Creators</div>
      <ul>
        {creators.map((c, i) => (
          <li key={i} className="text-sm text-gray-700 border-b py-1">{c.name} ({c.recipes} recipes)</li>
        ))}
      </ul>
    </div>
  );
}
