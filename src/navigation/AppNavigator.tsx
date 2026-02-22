// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../providers/ThemeProvider';
import { TabNavigator } from './TabNavigator';
import MindfulnessFlow from '../screens/Mindfulness/MindfulnessFlow';
import { NotificationDebugScreen } from '../screens/Debug/NotificationDebugScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: theme.colors.background.primary } }}>
      {/* Main Tab Navigator (includes all tab screens, visible and hidden) */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      
      {/* Debug Screen */}
      <Stack.Screen
        name="NotificationDebug"
        component={NotificationDebugScreen}
        options={{ title: 'Notification Debugger' }}
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