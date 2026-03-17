import React, { useState } from 'react';

export default function GroceryList({ groceryList }) {
  const [checked, setChecked] = useState({});
  const [quantities, setQuantities] = useState({});

  const handleCheck = (cat, idx) => {
    setChecked({ ...checked, [`${cat}-${idx}`]: !checked[`${cat}-${idx}`] });
  };

  const handleQuantity = (cat, idx, value) => {
    setQuantities({ ...quantities, [`${cat}-${idx}`]: value });
  };

  const handleExport = () => {
    // Export as text
    let text = '';
    Object.entries(groceryList).forEach(([cat, items]) => {
      text += `${cat.toUpperCase()}\n`;
      items.forEach((item, idx) => {
        const qty = quantities[`${cat}-${idx}`] || item.quantity;
        text += `- ${item.name} (${qty})\n`;
      });
      text += '\n';
    });
    // Download as .txt
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grocery-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Grocery List</h2>
      {Object.entries(groceryList).map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <h3 className="text-xl font-semibold mb-2">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
          <ul>
            {items.map((item, idx) => (
              <li key={item.name} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={!!checked[`${cat}-${idx}`]}
                  onChange={() => handleCheck(cat, idx)}
                  className="mr-2"
                />
                <span className={checked[`${cat}-${idx}`] ? 'line-through text-gray-400' : ''}>{item.name}</span>
                <input
                  type="number"
                  min="1"
                  value={quantities[`${cat}-${idx}`] || item.quantity}
                  onChange={e => handleQuantity(cat, idx, e.target.value)}
                  className="ml-4 w-16 border rounded p-1"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="bg-blue-600 text-white px-4 py-2 rounded mt-4" onClick={handleExport}>
        Export as Text
      </button>
    </div>
  );
}
