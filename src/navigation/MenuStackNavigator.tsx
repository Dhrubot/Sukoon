// src/navigation/MenuStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MenuScreen from '../screens/Menu/MenuScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AchievementsScreen from '../screens/Achievements/AchievementsScreen';
import DigitalWellnessScreen from '../screens/DigitalWellness/DigitalWellnessScreen';
import SupportScreen from '../screens/Support/SupportScreen';
import SetupHealthScreen from '../screens/SetupHealth/SetupHealthScreen';

export type MenuStackParamList = {
  MenuHome: undefined;
  Achievements: undefined;
  DigitalWellness: undefined;
  Support: undefined;
  Settings: undefined;
  SetupHealth: undefined;
};

const Stack = createStackNavigator<MenuStackParamList>();

export const MenuStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MenuHome" component={MenuScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="DigitalWellness" component={DigitalWellnessScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SetupHealth" component={SetupHealthScreen} />
    </Stack.Navigator>
  );
};