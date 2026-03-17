import HeroSection from '../components/HeroSection';
import FeatureSection from '../components/FeatureSection';
import DemoSection from '../components/DemoSection';
import TestimonialsSection from '../components/TestimonialsSection';
import CallToActionSection from '../components/CallToActionSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <HeroSection />
      <FeatureSection />
      <DemoSection />
      <TestimonialsSection />
      <CallToActionSection />
      <Footer />
    </div>
  );
}
