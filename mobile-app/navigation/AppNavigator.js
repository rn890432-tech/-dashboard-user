import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import HomeFeedScreen from '../screens/HomeFeedScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import AIGeneratorScreen from '../screens/AIGeneratorScreen';
import MealPlanScreen from '../screens/MealPlanScreen';
import GroceryScreen from '../screens/GroceryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AIChefChatScreen from '../screens/AIChefChatScreen';
import AIMealPhotoScreen from '../screens/AIMealPhotoScreen';
import FoodScannerScreen from '../screens/FoodScannerScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator initialRouteName="Login">
        <Tab.Screen name="Home" component={HomeFeedScreen} />
        <Tab.Screen name="AI Chef" component={AIGeneratorScreen} />
        <Tab.Screen name="Chef Chat" component={AIChefChatScreen} />
        <Tab.Screen name="Meal Photo" component={AIMealPhotoScreen} />
        <Tab.Screen name="Food Scanner" component={FoodScannerScreen} />
        <Tab.Screen name="Meal Plan" component={MealPlanScreen} />
        <Tab.Screen name="Grocery" component={GroceryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
