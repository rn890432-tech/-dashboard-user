// Example creator profile page UI (Stub)
import React from 'react';

export default function CreatorProfilePage({ creator }) {
  return (
    <div>
      <img src={creator.profileImage} alt="Profile" style={{ width: 120, borderRadius: '50%' }} />
      <h2>{creator.creatorName}</h2>
      <p>{creator.bio}</p>
      <div>Followers: {creator.followers}</div>
      <div>Verified: {creator.verifiedStatus ? 'Yes' : 'No'}</div>
      <div>Social Links: {creator.socialLinks?.join(', ')}</div>
      <button>Follow</button>
      <button>Subscribe</button>
      <h3>Recipes</h3>
      <ul>
        {creator.recipes.map(r => <li key={r}>{r.title}</li>)}
      </ul>
      <h3>Videos</h3>
      {/* Video content list here */}
    </div>
  );
}
