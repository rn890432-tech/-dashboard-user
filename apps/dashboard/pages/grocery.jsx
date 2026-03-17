import GroceryList from '../components/grocery/GroceryList';

export default function GroceryPage({ groceryList }) {
  // Demo: groceryList prop would be fetched from API
  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Grocery</h1>
      <section className="mb-8">
        <GroceryList groceryList={groceryList} />
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Weekly Meal Plan Groceries</h2>
        {/* Render meal plan grocery list here */}
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Delivery Options</h2>
        {/* Render delivery integration options here */}
      </section>
    </div>
  );
}
