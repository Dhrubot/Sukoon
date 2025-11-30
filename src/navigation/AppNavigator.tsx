// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigator } from './TabNavigator';
import MindfulnessFlow from '../screens/Mindfulness/MindfulnessFlow';
import { NotificationDebugScreen } from '../screens/Debug/NotificationDebugScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Tab Navigator (includes all tab screens, visible and hidden) */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      
      {/* Debug Screen */}
      <Stack.Screen
        name="NotificationDebug"
        component={NotificationDebugScreen}
        options={{ title: '🔧 Notification Debugger' }}
      />
      
      {/* Modal Screens */}
      <Stack.Screen
        name="MindfulnessFlow"
        component={MindfulnessFlow}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
};