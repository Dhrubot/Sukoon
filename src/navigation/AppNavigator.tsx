// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigator } from './TabNavigator';
import MindfulnessFlow from '../screens/Mindfulness/MindfulnessFlow';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="MindfulnessFlow"
        component={MindfulnessFlow}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
};