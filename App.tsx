import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// Components
import { AppInitializer } from './src/components/AppInitializer';
import { NavigationProvider } from './src/providers/NavigationProvider';

// Keep the splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationProvider>
        <StatusBar style="auto" />
        <AppInitializer />
      </NavigationProvider>
    </SafeAreaProvider>
  );
}