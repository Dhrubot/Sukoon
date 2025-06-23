import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { View, Text, ActivityIndicator } from 'react-native';

// Services
import StorageService from './src/services/StorageService';
import NotificationService from './src/services/NotificationService';
import PrayerTimeService from './src/services/PrayerTimeService';

// Screens (we'll create these next)
import HomeScreen from './src/screens/Home/HomeScreen';
import StatsScreen from './src/screens/Stats/StatsScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';

// Store
import { useStore } from './src/store/useStore';

// Types
import { Location as LocationType } from './src/types';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  
  const { setUserSettings, setLocation } = useStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);

      // Load saved settings or create defaults
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
        StorageService.setUserSettings(settings);
      }
      setUserSettings(settings);

      // Request location permission and get current location
      const location = await requestLocation();
      if (location) {
        settings.location = location;
        StorageService.updateUserSettings({ location });
        setLocation(location);
      }

      // Initialize notifications
      await NotificationService.initialize();

      // Fetch initial prayer times
      if (location) {
        await PrayerTimeService.getPrayerTimesList(
          location,
          new Date(),
          settings.calculationMethod
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const requestLocation = async (): Promise<LocationType | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city/country
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const place = geocode[0];
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: place?.city || 'Unknown',
        country: place?.country || 'Unknown',
        timezone: place?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B5E3F' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
          Preparing your prayer companion...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#1B5E3F',
            tabBarInactiveTintColor: '#757575',
            headerShown: false,
            tabBarStyle: {
              borderTopWidth: 1,
              borderTopColor: '#E0E0E0',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
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
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>⚙️</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}