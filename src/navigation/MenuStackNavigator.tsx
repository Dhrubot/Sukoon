// src/navigation/MenuStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../providers/ThemeProvider';
import MenuScreen from '../screens/Menu/MenuScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import PrivacyPolicyScreen from '../screens/Settings/PrivacyPolicyScreen';
import StatsScreen from '../screens/Stats/StatsScreen';
import SupportScreen from '../screens/Support/SupportScreen';
import SetupHealthScreen from '../screens/SetupHealth/SetupHealthScreen';
import ReflectionGardenScreen from '../screens/ReflectionGarden/ReflectionGardenScreen';
import MosqueModeScreen from '../screens/MosqueMode/MosqueModeScreen';
import AdhkarScreen from '../screens/Adhkar/AdhkarScreen';
import TasbihScreen from '../screens/Tasbih/TasbihScreen';
import DuaLibraryScreen from '../screens/DuaLibrary/DuaLibraryScreen';

export type MenuStackParamList = {
  MenuHome: undefined;
  Adhkar: undefined;
  Tasbih: undefined;
  DuaLibrary: undefined;
  MyJourney: undefined;
  ReflectionGarden: undefined;
  MosqueMode: undefined;
  Support: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  SetupHealth: undefined;
};

const Stack = createStackNavigator<MenuStackParamList>();

export const MenuStackNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily.bodySemibold,
          fontSize: theme.typography.fontSize.xl,
        },
        headerBackTitle: '',
        cardStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Stack.Screen
        name="MenuHome"
        component={MenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaLibrary"
        component={DuaLibraryScreen}
        options={{ title: 'Dua Library' }}
      />
      <Stack.Screen
        name="Adhkar"
        component={AdhkarScreen}
        options={{ title: 'Morning & Evening Adhkar' }}
      />
      <Stack.Screen
        name="Tasbih"
        component={TasbihScreen}
        options={{ title: 'Tasbih Counter' }}
      />
      <Stack.Screen
        name="MyJourney"
        component={StatsScreen}
        options={{ title: 'My Journey' }}
      />
      <Stack.Screen
        name="ReflectionGarden"
        component={ReflectionGardenScreen}
        options={{ title: 'My Garden' }}
      />
      <Stack.Screen
        name="MosqueMode"
        component={MosqueModeScreen}
        options={{ title: 'Mosque Mode' }}
      />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
      <Stack.Screen
        name="SetupHealth"
        component={SetupHealthScreen}
        options={{ title: 'Setup & Health' }}
      />
    </Stack.Navigator>
  );
};