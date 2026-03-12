import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/lora';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';

// Components
import { AppInitializer } from './src/components/AppInitializer';
import { NavigationProvider } from './src/providers/NavigationProvider';
import { PrayerTimesProvider } from './src/providers/PrayerTimesProvider';
import { ThemeProvider } from './src/providers/ThemeProvider';
import ErrorBoundary from './src/components/ErrorBoundary';

// Keep the splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });

  if (!fontsLoaded) {
    return null; // Splash screen remains visible
  }

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
