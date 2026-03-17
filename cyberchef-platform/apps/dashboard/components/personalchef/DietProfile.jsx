import React, { useState } from 'react';

export default function DietProfile({ diet, onUpdate }) {
  const [profile, setProfile] = useState(diet);
  const handleChange = e => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  const handleSubmit = e => {
    e.preventDefault();
    onUpdate(profile);
  };
  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <div className="font-bold mb-2">Your Diet Profile</div>
      <input name="dietType" value={profile.dietType || ''} onChange={handleChange} placeholder="Diet type (vegan, keto, etc.)" className="border rounded p-2 mb-2 w-full" />
      <input name="allergies" value={profile.allergies || ''} onChange={handleChange} placeholder="Allergies (comma separated)" className="border rounded p-2 mb-2 w-full" />
      <input name="preferences" value={profile.preferences || ''} onChange={handleChange} placeholder="Preferences (comma separated)" className="border rounded p-2 mb-2 w-full" />
      <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Update</button>
    </form>
  );
}
