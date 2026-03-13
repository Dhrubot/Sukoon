// src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import { useTheme } from '../providers/ThemeProvider';
import { Icon } from '../components/common/Icon';
import {
  HomeTabIcon,
  QiblaTabIcon,
} from '../assets/icons';

import HomeScreen from '../screens/Home/HomeScreen';
import MosqueModeScreen from '../screens/MosqueMode/MosqueModeScreen';
import QiblaFinderScreen from '../screens/QiblaFinder/QiblaFinderScreen';
import { MenuStackNavigator } from './MenuStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

import Svg, { Circle, Path, Polyline } from 'react-native-svg';

// Home icon component (clean outline house with door)
const HomeIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="9 22 9 12 15 12 15 22"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
          paddingBottom: 18,
          paddingTop: 6,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontFamily: theme.typography.fontFamily.bodySemibold,
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
          tabBarLabel: 'Pray',
          tabBarIcon: ({ color }) => (
            <HomeIcon color={color} size={24} />
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
        name="MosqueMode"
        component={MosqueModeScreen}
        options={{
          tabBarLabel: 'Mosque',
          tabBarIcon: ({ color }) => (
            <Icon source={HomeTabIcon} size={30} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{
          tabBarLabel: 'Tools',
          tabBarIcon: ({ color }) => (
            <MoreIcon color={color} size={22} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};
