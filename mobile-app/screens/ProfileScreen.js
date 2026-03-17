import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch('https://api.cyberchef.ai/api/mobile/auth/profile', {
      headers: { Authorization: 'Bearer demo-token' }
    })
      .then(res => res.json())
      .then(data => setProfile(data));
  }, []);

  if (!profile) return <Text>Loading...</Text>;

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">User Profile</Text>
      <Text className="mb-2">Username: {profile.username}</Text>
      <Text className="mb-2">Saved Recipes: {profile.savedRecipes ? profile.savedRecipes.length : 0}</Text>
      <Text className="mb-2">Subscription Plan: {profile.subscription || 'Free'}</Text>
    </View>
  );
}
