export default function PricingCards() {
  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-8">
      <div className="bg-white p-6 rounded shadow w-80">
        <h3 className="text-xl font-bold mb-2">Free</h3>
        <p>Basic recipe generation and feed access.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-4">Sign Up Free</button>
      </div>
      <div className="bg-white p-6 rounded shadow w-80 border-2 border-blue-600">
        <h3 className="text-xl font-bold mb-2">Pro</h3>
        <p>Advanced AI features, meal planner, nutrition analysis.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-4">Upgrade to Pro</button>
      </div>
      <div className="bg-white p-6 rounded shadow w-80">
        <h3 className="text-xl font-bold mb-2">Creator</h3>
        <p>Video generator, recipe marketplace, creator analytics.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-4">Become a Creator</button>
      </div>
    </div>
  );
}