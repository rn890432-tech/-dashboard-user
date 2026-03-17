import React, { useState } from 'react';

export default function CopilotInput({ onSend }) {
  const [input, setInput] = useState('');
  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };
  return (
    <div className="flex mt-2">
      <input
        className="flex-1 border rounded p-2"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type your question..."
        onKeyDown={e => e.key === 'Enter' && handleSend()}
      />
      <button className="ml-2 bg-blue-500 text-white rounded px-4 py-2" onClick={handleSend}>Send</button>
    </div>
  );
}
