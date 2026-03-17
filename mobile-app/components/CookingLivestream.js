// Example AI Cooking Livestream UI (Stub)
import React, { useState } from 'react';

export default function CookingLivestream({ creatorId }) {
  const [streamUrl, setStreamUrl] = useState(null);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');

  const startLivestream = async () => {
    // Call API to start livestream
    // Example: setStreamUrl('https://live.cyberchef.ai/creator/' + creatorId);
    setStreamUrl('https://live.cyberchef.ai/creator/' + creatorId);
  };

  const sendMessage = async () => {
    // Call API to send chat message
    setChat([...chat, { user: 'You', text: message }]);
    setMessage('');
  };

  return (
    <div>
      <button onClick={startLivestream}>Start Livestream</button>
      {streamUrl && <div>
        <iframe src={streamUrl} width="480" height="320" title="Livestream" />
        <div>
          <h3>Live Chat</h3>
          <div style={{ height: 120, overflowY: 'auto', border: '1px solid #ccc' }}>
            {chat.map((c, i) => <div key={i}><b>{c.user}:</b> {c.text}</div>)}
          </div>
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type message..." />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>}
    </div>
  );
}
