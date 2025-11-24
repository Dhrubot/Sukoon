// src/navigation/TabNavigator.tsx
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import { useTheme } from '../providers/ThemeProvider';

import HomeScreen from '../screens/Home/HomeScreen';
import StatsScreen from '../screens/Stats/StatsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AchievementsScreen from '../screens/Achievements/AchievementsScreen';
import DigitalWellnessScreen from '../screens/DigitalWellness/DigitalWellnessScreen';
import SupportScreen from '../screens/Support/SupportScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const tabScreens: {
  name: keyof TabParamList;
  component: React.ComponentType<any>;
  options: any;
}[] = [
  {
    name: 'Home',
    component: HomeScreen,
    options: {
      tabBarLabel: 'Prayer Times',
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size, color }}>🕌</Text>
      ),
    },
  },
  {
    name: 'Stats',
    component: StatsScreen,
    options: {
      tabBarLabel: 'Progress',
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size, color }}>📊</Text>
      ),
    },
  },
  {
    name: 'Achievements',
    component: AchievementsScreen,
    options: {
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size }}>🏆</Text>
      ),
    },
  },
  {
    name: 'DigitalWellness',
    component: DigitalWellnessScreen,
    options: {
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size }}>📱</Text>
      ),
      tabBarLabel: 'Digital',
    },
  },
  {
    name: 'Support',
    component: SupportScreen,
    options: {
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size, color }}>💚</Text>
      ),
      tabBarLabel: 'Support',
    },
  },
  {
    name: 'Settings',
    component: SettingsScreen,
    options: {
      tabBarLabel: 'Settings',
      tabBarIcon: ({ color, size }: any) => (
        <Text style={{ fontSize: size, color }}>⚙️</Text>
      ),
    },
  },
];

export const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors.secondary.DEFAULT,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.secondary,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      {tabScreens.map((screen) => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.options}
        />
      ))}
    </Tab.Navigator>
  );
};
