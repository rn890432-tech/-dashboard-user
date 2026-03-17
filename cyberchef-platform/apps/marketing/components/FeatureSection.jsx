export default function FeatureSection() {
  return (
    <section className="py-12 bg-gray-100 text-center">
      <h2 className="text-3xl font-bold mb-6">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">AI Recipe Generator</h3>
          <p>Generate unique recipes tailored to your tastes and dietary needs.</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">AI Nutrition Analysis</h3>
          <p>Analyze nutritional content and optimize your meals for health goals.</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">Social Recipe Feed</h3>
          <p>Share and discover recipes from a global community.</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">AI Video Generator</h3>
          <p>Create engaging cooking videos for social media with one click.</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">AI Personal Chef</h3>
          <p>Get personalized meal plans and grocery lists from your AI chef.</p>
        </div>
      </div>
    </section>
  );
}