import SignupForm from '../components/SignupForm';
import Footer from '../components/Footer';

export default function Waitlist() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Join the Waitlist</h1>
      <SignupForm />
      <Footer />
    </div>
  );
}
