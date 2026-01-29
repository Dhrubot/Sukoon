// src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import { useTheme } from '../providers/ThemeProvider';
import { Icon } from '../components/common/Icon';
import {
  HomeTabIcon,
  QiblaTabIcon,
  ProgressTabIcon,
} from '../assets/icons';

import HomeScreen from '../screens/Home/HomeScreen';
import StatsScreen from '../screens/Stats/StatsScreen';
import QiblaFinderScreen from '../screens/QiblaFinder/QiblaFinderScreen';
import { MenuStackNavigator } from './MenuStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

import Svg, { Circle } from 'react-native-svg';

// More menu icon component (three dots)
const MoreIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

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
        tabBarItemStyle: {
          paddingHorizontal: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Prayer Times',
          tabBarIcon: ({ color }) => (
            <Icon source={HomeTabIcon} size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QiblaFinder"
        component={QiblaFinderScreen}
        options={{
          tabBarLabel: 'Qibla',
          tabBarIcon: ({ color }) => (
            <Icon source={QiblaTabIcon} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => (
            <Icon source={ProgressTabIcon} size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => (
            <MoreIcon color={color} size={22} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};