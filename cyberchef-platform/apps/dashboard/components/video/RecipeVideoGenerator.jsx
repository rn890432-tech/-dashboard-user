import React, { useState } from 'react';

export default function RecipeVideoGenerator({ recipeId }) {
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerate = async style => {
    setStatus('Generating...');
    await fetch('/api/ai/generate-recipe-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, style })
    });
    setStatus('Video generation started. Please check back soon.');
  };

  const fetchVideo = async () => {
    const res = await fetch(`/api/videos/recipe/${recipeId}`);
    const data = await res.json();
    setVideoUrl(data.videoUrl);
  };

  const handleShare = async platform => {
    await fetch('/api/videos/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, platform })
    });
    setStatus(`Video shared to ${platform}`);
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="font-bold mb-2">AI Recipe Video Generator</div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2" onClick={() => handleGenerate('modern')}>Generate Modern Tutorial</button>
      <button className="bg-gray-700 text-white px-4 py-2 rounded mr-2" onClick={() => handleGenerate('cinematic')}>Generate Cinematic Video</button>
      <button className="bg-pink-500 text-white px-4 py-2 rounded" onClick={() => handleGenerate('fast')}>Generate Social Media Style</button>
      <div className="mt-4">
        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={fetchVideo}>Fetch Video</button>
        {videoUrl && (
          <div className="mt-4">
            <video src={videoUrl} controls className="w-full rounded" />
            <div className="mt-2">
              <button className="bg-purple-500 text-white px-4 py-2 rounded mr-2" onClick={() => handleShare('TikTok')}>Share to TikTok</button>
              <button className="bg-red-500 text-white px-4 py-2 rounded mr-2" onClick={() => handleShare('Instagram')}>Share to Instagram Reels</button>
              <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={() => handleShare('YouTube')}>Share to YouTube Shorts</button>
            </div>
          </div>
        )}
      </div>
      {status && <div className="mt-4 text-blue-600 font-semibold">{status}</div>}
    </div>
  );
}
