import React from 'react';
import { View, Text, CheckBox } from 'react-native';

export default function GroceryItem({ item, checked, onToggle }) {
  return (
    <View className="flex-row items-center mb-2">
      <CheckBox value={checked} onValueChange={onToggle} />
      <Text className={checked ? 'line-through text-gray-400 ml-2' : 'ml-2'}>{item.name} ({item.quantity})</Text>
    </View>
  );
}
