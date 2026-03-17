import React from 'react';

export default function ChatMessage({ role, content }) {
  const color = role === 'assistant' ? 'bg-blue-100' : role === 'user' ? 'bg-green-100' : 'bg-gray-100';
  return (
    <div className={`rounded p-2 mb-2 ${color}`}>{content}</div>
  );
}
