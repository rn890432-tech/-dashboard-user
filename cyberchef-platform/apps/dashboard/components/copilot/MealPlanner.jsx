import React from 'react';

export default function MealPlanner({ plan }) {
  return (
    <div className="mt-4">
      <div className="font-bold mb-2">Weekly Meal Plan</div>
      <ul>
        {plan.map((day, i) => (
          <li key={i} className="mb-2">
            <div className="font-semibold">{day.day}</div>
            <ul>
              {day.meals.map((meal, j) => (
                <li key={j} className="text-sm text-gray-700">{meal.title} ({meal.cuisine})</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
