import PricingCards from '../components/PricingCards';
import Footer from '../components/Footer';

export default function Pricing() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mt-8 mb-4">Pricing Plans</h1>
      <PricingCards />
      <Footer />
    </div>
  );
}
