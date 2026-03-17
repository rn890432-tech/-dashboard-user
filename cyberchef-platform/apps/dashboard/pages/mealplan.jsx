import Link from 'next/link';

export default function MealPlanPage({ mealPlan }) {
  // ...existing code...
  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Weekly Meal Plan</h1>
      {/* ...existing meal plan UI... */}
      {/* Offer grocery list generation */}
      <div className="mt-8">
        <Link href={`/grocery?mealPlanId=${mealPlan.id}`}>
          <button className="bg-green-600 text-white px-4 py-2 rounded text-lg">Generate Grocery List</button>
        </Link>
      </div>
    </div>
  );
}
