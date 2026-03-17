import React from 'react';
import { View, Text, Button } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-bold mb-4">Welcome to CyberChef AI</Text>
      <Text className="mb-6 text-lg text-center">AI recipe generation, personalized meal planning, recipe video creation</Text>
      <Button title="Login" onPress={() => navigation.navigate('Profile')} />
      <Button title="Create Account" onPress={() => navigation.navigate('Profile')} />
      <Button title="Try Demo" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}
