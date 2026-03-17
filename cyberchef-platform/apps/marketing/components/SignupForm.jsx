import { useState } from 'react';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus('Submitting...');
    const res = await fetch('/api/email/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setStatus(data.success ? 'Thanks for joining the waitlist!' : 'Error: ' + data.error);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96 flex flex-col items-center">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="border rounded p-2 mb-4 w-full"
        required
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" type="submit">Join Waitlist</button>
      {status && <div className="mt-4 text-blue-600 font-semibold">{status}</div>}
    </form>
  );
}