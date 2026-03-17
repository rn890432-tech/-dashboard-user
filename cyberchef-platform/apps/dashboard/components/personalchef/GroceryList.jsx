import React from 'react';

export default function GroceryList({ items }) {
  return (
    <div className="mb-4">
      <div className="font-bold mb-2">Grocery List</div>
      <ul>
        {items.map((item, i) => (
          <li key={i} className="text-sm text-blue-700 border-b py-1">{item}</li>
        ))}
      </ul>
    </div>
  );
}
