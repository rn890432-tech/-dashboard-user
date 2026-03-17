import React, { useRef, useState } from 'react';

export default function RecipeVideoPlayer({ videoURL }) {
  const videoRef = useRef();
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  const handleMouseEnter = () => {
    videoRef.current && videoRef.current.pause();
    setPlaying(false);
  };
  const handleMouseLeave = () => {
    videoRef.current && videoRef.current.play();
    setPlaying(true);
  };
  const toggleMute = () => setMuted(m => !m);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoURL}
        autoPlay
        loop
        muted={muted}
        className="w-full h-64 object-cover rounded"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <button
        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded"
        onClick={toggleMute}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
