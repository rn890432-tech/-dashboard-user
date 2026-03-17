import React, { useState } from 'react';
import { View, Text, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { generateRecipeVideo } from '../services/api';

export default function FoodScannerScreen() {
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const takePhoto = async () => {
    let res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.cancelled) setPhoto(res.uri);
  };

  const analyzePhoto = async () => {
    if (!photo) return;
    setLoading(true);
    // Resize image before upload (optional)
    const formData = new FormData();
    formData.append('image', { uri: photo, name: 'food.jpg', type: 'image/jpeg' });
    try {
      const res = await api.post('/ai/food-recognition', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
    } catch {
      setResult({ error: 'Analysis failed.' });
    }
    setLoading(false);
  };

  const saveMeal = async () => {
    if (!result) return;
    await api.post('/meals/log', result);
    alert('Meal saved to log!');
  };

  const viewHistory = async () => {
    const res = await api.get('/meals/history');
    setHistory(res.data.history);
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Food Scanner</Text>
      <Button title="Take Photo" onPress={takePhoto} />
      {photo && <Image source={{ uri: photo }} className="w-full h-64 rounded mt-4 mb-4" />}
      <Button title="Analyze" onPress={analyzePhoto} disabled={loading || !photo} />
      <Button title="Generate Cooking Video" onPress={async () => {
        if (!result) return;
        const res = await generateRecipeVideo(result.dish);
        alert('Video generation started! Status: ' + res.data.status);
      }} />
      {loading && <Text className="mt-4">Analyzing...</Text>}
      {result && (
        <View className="mt-4">
          {result.error ? <Text>{result.error}</Text> : <>
            <Text className="font-semibold mb-2">Dish: {result.dish}</Text>
            <Text className="font-semibold mb-2">Ingredients:</Text>
            {result.ingredients && result.ingredients.map((ing, idx) => (
              <Text key={idx}>{ing}</Text>
            ))}
            <Text className="mt-2">Calories: {result.calories_estimate}</Text>
            <Text>Protein: {result.protein}</Text>
            <Text>Carbs: {result.carbs}</Text>
            <Text>Fat: {result.fat}</Text>
            <Text>Fiber: {result.fiber}</Text>
            <Button title="Save to meal log" onPress={saveMeal} />
            <Button title="Generate AI Cooking Video" onPress={async () => {
              setVideoUrl(null);
              const res = await generateRecipeVideo(result.dish + '\n' + result.ingredients.join(', '));
              setVideoUrl(res.data.video_url);
            }} />
          </>}
        </View>
      )}
      <Button title="View Meal History" onPress={viewHistory} />
      {videoUrl && (
        <View className="mt-4">
          <Text className="font-bold mb-2">AI Cooking Video</Text>
          <Text selectable>{videoUrl}</Text>
        </View>
      )}
      {history && (
        <View className="mt-4">
          <Text className="font-bold mb-2">Meal Log History</Text>
          {history.length === 0 && <Text>No meals logged yet.</Text>}
          {history.map((meal, idx) => (
            <View key={idx} className="mb-2">
              <Text>Dish: {meal.dish}</Text>
              <Text>Calories: {meal.calories_estimate}</Text>
              <Text>Protein: {meal.protein}</Text>
              <Text>Carbs: {meal.carbs}</Text>
              <Text>Fat: {meal.fat}</Text>
              <Text>Fiber: {meal.fiber}</Text>
              <Text>Time: {new Date(meal.timestamp).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
