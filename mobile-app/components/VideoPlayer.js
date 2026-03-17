import React from 'react';
import { View } from 'react-native';
import { Video } from 'expo-av';

export default function VideoPlayer({ videoUrl }) {
  return (
    <View className="w-full h-64 bg-black rounded mb-4">
      <Video
        source={{ uri: videoUrl }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode="contain"
        shouldPlay
        useNativeControls
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
