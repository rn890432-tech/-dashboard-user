import React, { useState } from 'react';

export default function Onboarding() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSignup = async e => {
    e.preventDefault();
    const res = await fetch('/api/onboarding/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    setMessage(data.success ? 'Check your email to verify your account.' : data.error);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };
  const handleAppleLogin = () => {
    window.location.href = '/api/auth/apple';
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup} className="mb-4">
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="border rounded p-2 mb-2 w-full" />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border rounded p-2 mb-2 w-full" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border rounded p-2 mb-2 w-full" />
        <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" type="submit">Sign Up</button>
      </form>
      <div className="mb-4">
        <button className="bg-red-500 text-white px-4 py-2 rounded w-full mb-2" onClick={handleGoogleLogin}>Sign Up with Google</button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded w-full" onClick={handleAppleLogin}>Sign Up with Apple</button>
      </div>
      {message && <div className="text-green-600 font-semibold">{message}</div>}
    </div>
  );
}
