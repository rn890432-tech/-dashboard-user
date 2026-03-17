import React from 'react';

export default function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white shadow rounded p-4 flex items-center">
      {icon && <span className="mr-3 text-2xl">{icon}</span>}
      <div>
        <div className="text-gray-500 text-sm">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}
