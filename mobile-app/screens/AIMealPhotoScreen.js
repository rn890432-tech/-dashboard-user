import React, { useState } from 'react';
import { View, Text, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';

export default function AIMealPhotoScreen() {
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.cancelled) setPhoto(res.uri);
  };

  const takePhoto = async () => {
    let res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.cancelled) setPhoto(res.uri);
  };

  const analyzePhoto = async () => {
    if (!photo) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', { uri: photo, name: 'meal.jpg', type: 'image/jpeg' });
    try {
      const res = await api.post('/ai/photo-recognition', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
    } catch {
      setResult({ error: 'Analysis failed.' });
    }
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">AI Meal Photo Recognition</Text>
      <Button title="Take Photo" onPress={takePhoto} />
      <Button title="Upload Photo" onPress={pickImage} />
      {photo && <Image source={{ uri: photo }} className="w-full h-64 rounded mt-4 mb-4" />}
      <Button title="Analyze" onPress={analyzePhoto} disabled={loading || !photo} />
      {loading && <Text className="mt-4">Analyzing...</Text>}
      {result && (
        <View className="mt-4">
          {result.error ? <Text>{result.error}</Text> : <>
            <Text className="font-semibold mb-2">Estimated Calories: {result.calories}</Text>
            <Text className="font-semibold mb-2">Ingredients:</Text>
            {result.ingredients && result.ingredients.map((ing, idx) => (
              <Text key={idx}>{ing}</Text>
            ))}
          </>}
        </View>
      )}
    </View>
  );
}
