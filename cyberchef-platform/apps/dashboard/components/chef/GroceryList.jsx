import React, { useState } from 'react';

const categories = ['Produce', 'Proteins', 'Grains', 'Dairy', 'Spices', 'Other'];

export default function GroceryList({ groceryData }) {
  const [checked, setChecked] = useState({});

  const handleCheck = (cat, item) => {
    setChecked(prev => ({ ...prev, [`${cat}-${item}`]: !prev[`${cat}-${item}`] }));
  };

  const handleExport = () => {
    const list = categories.map(cat => {
      const items = groceryData[cat] || [];
      return `${cat}:\n${items.join(', ')}`;
    }).join('\n\n');
    const blob = new Blob([list], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grocery-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">Smart Grocery List</div>
      {categories.map(cat => (
        <div key={cat} className="mb-2">
          <div className="font-semibold text-blue-700">{cat}</div>
          <ul>
            {(groceryData[cat] || []).map(item => (
              <li key={item} className="flex items-center">
                <input type="checkbox" checked={!!checked[`${cat}-${item}`]} onChange={() => handleCheck(cat, item)} className="mr-2" />
                <span className={checked[`${cat}-${item}`] ? 'line-through text-gray-400' : ''}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="bg-green-500 text-white px-4 py-2 rounded mt-4" onClick={handleExport}>Export List</button>
    </div>
  );
}
