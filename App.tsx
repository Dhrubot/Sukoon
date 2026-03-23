import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
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
  const [fontsLoaded] = useFonts({
    Amiri_400Regular: require('@expo-google-fonts/amiri/400Regular/Amiri_400Regular.ttf'),
    Amiri_700Bold: require('@expo-google-fonts/amiri/700Bold/Amiri_700Bold.ttf'),
    DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    DMSans_600SemiBold: require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    DMSans_700Bold: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
    CormorantGaramond_300Light: require('@expo-google-fonts/cormorant-garamond/300Light/CormorantGaramond_300Light.ttf'),
    CormorantGaramond_400Regular: require('@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf'),
    CormorantGaramond_500Medium: require('@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf'),
    CormorantGaramond_600SemiBold: require('@expo-google-fonts/cormorant-garamond/600SemiBold/CormorantGaramond_600SemiBold.ttf'),
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
