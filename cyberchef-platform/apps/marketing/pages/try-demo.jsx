import Link from 'next/link';
import Footer from '../components/Footer';

export default function TryDemo() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-xl bg-white p-8 rounded shadow mt-12">
        <h1 className="text-4xl font-bold mb-4 text-center">CyberChef AI Product Preview</h1>
        <p className="mb-6 text-gray-600 text-center">Explore recipes, meal plans, and cooking videos powered by AI. No signup required.</p>
        <Link href="/demo">
          <button className="bg-blue-600 text-white px-6 py-3 rounded text-lg w-full font-semibold">Try the Live Demo</button>
        </Link>
      </div>
      <Footer />
    </div>
  );
}
