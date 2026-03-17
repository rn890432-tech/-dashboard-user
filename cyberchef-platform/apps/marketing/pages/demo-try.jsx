import DemoSection from '../components/DemoSection';
import Footer from '../components/Footer';

export default function DemoTry() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mt-8 mb-4">Try CyberChef AI Instantly</h1>
      <DemoSection />
      <div className="max-w-2xl mx-auto mt-8 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
        <form className="mb-4">
          <input type="text" placeholder="Enter ingredients (comma separated)" className="border rounded p-2 mb-2 w-full" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" type="button">Generate Recipe</button>
        </form>
        <div className="mb-4">
          <button className="bg-green-500 text-white px-4 py-2 rounded w-full mb-2">Generate Cooking Video</button>
          <button className="bg-purple-500 text-white px-4 py-2 rounded w-full">Generate Meal Plan</button>
        </div>
        <div className="mt-4 text-center text-gray-600">No signup required. Try the platform instantly!</div>
      </div>
      <Footer />
    </div>
  );
}
