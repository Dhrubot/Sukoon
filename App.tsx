import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// Components
import { AppInitializer } from './src/components/AppInitializer';
import { NavigationProvider } from './src/providers/NavigationProvider';
import { PrayerTimesProvider } from './src/providers/PrayerTimesProvider';
import { ThemeProvider } from './src/providers/ThemeProvider';
import ErrorBoundary from './src/components/ErrorBoundary';

// Keep the splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationProvider>
            <PrayerTimesProvider>
              <StatusBar style="auto" />
              <AppInitializer />
            </PrayerTimesProvider>
          </NavigationProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}