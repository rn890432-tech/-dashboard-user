import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { api } from '../services/api';

const quickActions = [
  { label: 'Generate Recipe', context: 'recipe', message: 'Generate a recipe for me.' },
  { label: 'Create Meal Plan', context: 'mealplan', message: 'Create a meal plan.' },
  { label: 'Cooking Tips', context: 'general', message: 'Give me cooking tips.' },
  { label: 'Nutrition Advice', context: 'general', message: 'Give me nutrition advice.' }
];

export default function AIChefChatScreen() {
  const [messages, setMessages] = useState([
    { sender: 'chef', text: 'Hello! I am your AI Cooking Assistant. What are you making today?' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const sendMessage = async (msg, ctx = 'general') => {
    if (!msg.trim()) return;
    setMessages([...messages, { sender: 'user', text: msg }]);
    setInput('');
    setTyping(true);
    try {
      const res = await api.post('/ai/chef-chat', { message: msg, context: ctx });
      setMessages(msgs => [...msgs, { sender: 'chef', text: res.data.reply }]);
    } catch {
      setMessages(msgs => [...msgs, { sender: 'chef', text: 'Sorry, I had trouble responding.' }]);
    }
    setTyping(false);
  };

  return (
    <View className="flex-1 bg-white p-4">
      <FlatList
        data={messages}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View className={item.sender === 'chef' ? 'mb-2 p-2 bg-blue-100 rounded' : 'mb-2 p-2 bg-gray-200 rounded self-end'}>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      {typing && <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 8 }} />}
      <View className="flex-row items-center mt-4">
        <TextInput
          className="border rounded p-2 flex-1 mr-2"
          placeholder="Ask your chef..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Send" onPress={() => sendMessage(input)} />
      </View>
      <View className="flex-row flex-wrap mt-4">
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.label}
            className="bg-blue-200 rounded px-3 py-2 mr-2 mb-2"
            onPress={() => sendMessage(action.message, action.context)}
          >
            <Text>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
