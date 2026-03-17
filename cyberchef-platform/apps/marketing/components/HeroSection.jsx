export default function HeroSection() {
  return (
    <section className="bg-white py-16 text-center">
      <h1 className="text-5xl font-bold mb-4">CyberChef AI</h1>
      <p className="text-xl mb-6">Your AI-powered kitchen companion. Discover, cook, and share recipes with the power of AI.</p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded text-lg font-semibold mb-4">Start Cooking with AI</button>
      <img src="/demo-screenshot.png" alt="Product Demo" className="mx-auto rounded shadow-lg mt-8 w-96" />
    </section>
  );
}