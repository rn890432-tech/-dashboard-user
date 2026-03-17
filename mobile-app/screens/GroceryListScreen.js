import React, { useState } from 'react';
import { View, Text, Button, FlatList, CheckBox } from 'react-native';

export default function GroceryListScreen() {
  const [groceryList, setGroceryList] = useState(null);
  const [checked, setChecked] = useState({});

  const handleGenerate = () => {
    fetch('https://api.cyberchef.ai/api/mobile/grocery/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealPlanId: 1 })
    })
      .then(res => res.json())
      .then(data => setGroceryList(data.groceryList));
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Grocery List</Text>
      <Button title="Generate Grocery List" onPress={handleGenerate} />
      {groceryList && Object.entries(groceryList).map(([cat, items]) => (
        <View key={cat} className="mt-4">
          <Text className="text-lg font-semibold mb-2">{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
          <FlatList
            data={items}
            keyExtractor={item => item.name}
            renderItem={({ item }) => (
              <View className="flex-row items-center mb-2">
                <CheckBox
                  value={!!checked[item.name]}
                  onValueChange={() => setChecked({ ...checked, [item.name]: !checked[item.name] })}
                />
                <Text className={checked[item.name] ? 'line-through text-gray-400 ml-2' : 'ml-2'}>{item.name} ({item.quantity})</Text>
              </View>
            )}
          />
        </View>
      ))}
    </View>
  );
}
