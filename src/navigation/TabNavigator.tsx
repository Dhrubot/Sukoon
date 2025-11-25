// src/navigation/TabNavigator.tsx
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import { useTheme } from '../providers/ThemeProvider';

import HomeScreen from '../screens/Home/HomeScreen';
import StatsScreen from '../screens/Stats/StatsScreen';
import QiblaFinderScreen from '../screens/QiblaFinder/QiblaFinderScreen';
import MenuScreen from '../screens/Menu/MenuScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors.text.muted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Prayer Times',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🕌</Text>
          ),
        }}
      />
      <Tab.Screen
        name="QiblaFinder"
        component={QiblaFinderScreen}
        options={{
          tabBarLabel: 'Qibla',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧭</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⋮</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};