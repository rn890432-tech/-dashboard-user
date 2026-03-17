import React from 'react';
import ChatMessage from './ChatMessage';

export default function ChatPanel({ messages }) {
  return (
    <div className="mb-4">
      {messages.map((msg, i) => <ChatMessage key={i} role={msg.role} content={msg.content} />)}
    </div>
  );
}
