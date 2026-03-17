export default function DemoSection() {
  const [ingredients, setIngredients] = React.useState('');
  const [result, setResult] = React.useState('');

  const handleGenerateRecipe = () => {
    setResult(`Sample Recipe for: ${ingredients}\n\n1. Prep ingredients\n2. Cook with CyberChef AI\n3. Enjoy your meal!`);
  };

  const handleGenerateVideo = () => {
    setResult('Sample Cooking Video: [AI-generated video preview]');
  };

  const handleGenerateMealPlan = () => {
    setResult('Sample Meal Plan: [AI-generated meal plan preview]');
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
      <input
        type="text"
        placeholder="Enter ingredients (comma separated)"
        className="border rounded p-2 mb-2 w-full"
        value={ingredients}
        onChange={e => setIngredients(e.target.value)}
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2" onClick={handleGenerateRecipe}>
        Generate Recipe
      </button>
      <button className="bg-green-500 text-white px-4 py-2 rounded w-full mb-2" onClick={handleGenerateVideo}>
        Generate Cooking Video
      </button>
      <button className="bg-purple-500 text-white px-4 py-2 rounded w-full" onClick={handleGenerateMealPlan}>
        Generate Meal Plan
      </button>
      <div className="mt-4 whitespace-pre-wrap text-gray-700">{result}</div>
      <div className="mt-4 text-center text-gray-600">No signup required. Try the platform instantly!</div>
    </div>
  );
}