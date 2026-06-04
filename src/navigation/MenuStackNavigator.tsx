// src/navigation/MenuStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../providers/ThemeProvider';

export type MenuStackParamList = {
  MenuHome: undefined;
  Adhkar: undefined;
  Tasbih: undefined;
  DuaLibrary: undefined;
  MyJourney: undefined;
  ReflectionGarden: undefined;
  TubaTreeInfo: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  SetupHealth: undefined;
  Meanings: undefined;
  MeaningDetail: { id: string };
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
        getComponent={() => require('../screens/Menu/MenuScreen').default}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DuaLibrary"
        getComponent={() => require('../screens/DuaLibrary/DuaLibraryScreen').default}
        options={{ title: 'Dua Library' }}
      />
      <Stack.Screen
        name="Adhkar"
        getComponent={() => require('../screens/Adhkar/AdhkarScreen').default}
        options={{ title: 'Morning & Evening Adhkar' }}
      />
      <Stack.Screen
        name="Tasbih"
        getComponent={() => require('../screens/Tasbih/TasbihScreen').default}
        options={{ title: 'Tasbih Counter' }}
      />
      <Stack.Screen
        name="MyJourney"
        getComponent={() => require('../screens/Stats/StatsScreen').default}
        options={{ title: 'Prayer Insights' }}
      />
      <Stack.Screen
        name="ReflectionGarden"
        getComponent={() => require('../screens/ReflectionGarden/ReflectionGardenScreen').default}
        options={{ title: 'Tuba Tree' }}
      />
      <Stack.Screen
        name="TubaTreeInfo"
        getComponent={() => require('../screens/ReflectionGarden/TubaTreeInfoScreen').default}
        options={{ title: 'About the Tree' }}
      />
      <Stack.Screen
        name="Settings"
        getComponent={() => require('../screens/Settings/SettingsScreen').default}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => require('../screens/Settings/PrivacyPolicyScreen').default}
        options={{ title: 'Privacy Policy' }}
      />
      <Stack.Screen
        name="SetupHealth"
        getComponent={() => require('../screens/SetupHealth/SetupHealthScreen').default}
        options={{ title: 'Setup & Health' }}
      />
      <Stack.Screen
        name="Meanings"
        getComponent={() => require('../features/meanings').MeaningsScreen}
        options={{ title: 'In the Prayer' }}
      />
      <Stack.Screen
        name="MeaningDetail"
        getComponent={() => require('../features/meanings').MeaningDetailScreen}
        options={{ title: '' }}
      />
    </Stack.Navigator>
  );
};
