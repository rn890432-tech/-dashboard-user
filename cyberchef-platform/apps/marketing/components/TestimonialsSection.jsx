export default function TestimonialsSection() {
  return (
    <section className="py-12 bg-gray-100 text-center">
      <h2 className="text-3xl font-bold mb-6">What Our Users Say</h2>
      <div className="flex flex-col md:flex-row justify-center items-center gap-8">
        <div className="bg-white p-6 rounded shadow w-80">
          <p className="italic mb-2">“CyberChef AI made meal planning effortless!”</p>
          <div className="font-semibold">— Alex, NYC</div>
        </div>
        <div className="bg-white p-6 rounded shadow w-80">
          <p className="italic mb-2">“I love the recipe videos for Instagram Reels!”</p>
          <div className="font-semibold">— Priya, SF</div>
        </div>
        <div className="bg-white p-6 rounded shadow w-80">
          <p className="italic mb-2">“The AI chef is my new kitchen buddy.”</p>
          <div className="font-semibold">— Sam, London</div>
        </div>
      </div>
    </section>
  );
}