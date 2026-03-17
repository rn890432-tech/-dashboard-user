export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-8 text-center">
      <div className="mb-4">
        <a href="/pricing" className="mx-2 underline">Pricing</a>
        <a href="/demo" className="mx-2 underline">Demo</a>
        <a href="/waitlist" className="mx-2 underline">Waitlist</a>
      </div>
      <div className="mb-2">
        <a href="https://twitter.com/cyberchefai" className="mx-2">Twitter</a>
        <a href="https://instagram.com/cyberchefai" className="mx-2">Instagram</a>
        <a href="https://youtube.com/cyberchefai" className="mx-2">YouTube</a>
      </div>
      <div className="text-sm">© 2026 CyberChef AI. All rights reserved.</div>
    </footer>
  );
}