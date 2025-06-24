import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { View, Text, ActivityIndicator, Modal, TextInput, Button, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';

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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [locationInputError, setLocationInputError] = useState('');
  
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

      // Only request location if we don't already have it stored
      let location = settings.location;
      if (!location || !location.latitude || !location.longitude) {
        console.log('No saved location found, requesting new location...');
        const newLocation = await requestLocation();
        
        if (newLocation) {
          location = newLocation;
          settings.location = location;
          StorageService.updateUserSettings({ location });
          setLocation(location);
        }
      } else {
        console.log('Using saved location:', location);
        setLocation(location);
      }

      // Initialize notifications
      await NotificationService.initialize();

      // Only fetch prayer times if needed
      if (location) {
        // Check if we need to refresh prayer times (e.g., if it's a new day)
        const shouldRefreshPrayerTimes = await shouldRefreshPrayers(location, settings.calculationMethod);
        
        if (shouldRefreshPrayerTimes) {
          console.log('Refreshing prayer times...');
          await PrayerTimeService.getPrayerTimesList(
            location,
            new Date(),
            settings.calculationMethod
          );
        } else {
          console.log('Using cached prayer times');
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  // Helper function to determine if we should refresh prayer times
  const shouldRefreshPrayers = async (location: LocationType, method: string): Promise<boolean> => {
    try {
      // Get today's date in YYYY-MM-DD format for the cache key
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      // Create a storage key for the prayer times refresh timestamp
      const refreshKey = `lastPrayerRefresh_${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}_${dateStr}_${method}`;
      
      // Check if we've already refreshed prayers today
      const lastRefreshedStr = StorageService.getValue(refreshKey);
      
      if (lastRefreshedStr) {
        // We already refreshed prayers today, no need to refresh again
        return false;
      }
      
      // Store the refresh timestamp
      StorageService.setValue(refreshKey, Date.now().toString());
      return true;
    } catch (error) {
      console.error('Error checking prayer refresh status:', error);
      // If there's an error, refresh to be safe
      return true;
    }
  };

  const getCoordinatesFromAddress = async (cityName: string, countryName: string): Promise<LocationType | null> => {
    try {
      // Use the Al Adhan API to get location data by city/country
      // This endpoint returns prayer times, but also includes latitude/longitude data
      const encodedCity = encodeURIComponent(cityName);
      const encodedCountry = encodeURIComponent(countryName);
      
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodedCity}&country=${encodedCountry}&method=2`;
      
      console.log(`Fetching location data for ${cityName}, ${countryName}`);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        // Extract the coordinates from the API response
        const { latitude, longitude } = data.data.meta;
        
        return {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          city: cityName || 'Unknown',
          country: countryName || 'Unknown',
          timezone: data.data.meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      } else {
        console.error('Al Adhan API error:', data.data);
        return null;
      }
    } catch (error) {
      console.error('Error getting location from Al Adhan API:', error);
      return null;
    }
  };

  const handleManualLocation = async () => {
    setLocationInputError('');
    
    // Validate required fields
    if (!city) {
      setLocationInputError('Please enter a city name');
      return;
    }
    
    if (!country) {
      setLocationInputError('Please enter a country name');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the Al Adhan API with city and country
      const locationData = await getCoordinatesFromAddress(city, country);
      
      if (locationData) {
        setShowLocationModal(false);
        // Update settings with the new location
        const settings = StorageService.getUserSettings() || StorageService.getDefaultSettings();
        settings.location = locationData;
        StorageService.setUserSettings(settings);
        setUserSettings(settings);
        setLocation(locationData);
        
        // Force refresh prayer times when location is manually changed
        await PrayerTimeService.clearCache(); // Clear the cached prayer times
        
        // Fetch prayer times with the new location
        await PrayerTimeService.getPrayerTimesList(
          locationData,
          new Date(),
          settings.calculationMethod
        );
      } else {
        setLocationInputError('Could not find location. Please check your city and country names.');
      }
    } catch (error) {
      console.error('Error setting manual location:', error);
      setLocationInputError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocation = async (): Promise<LocationType | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        // Show modal for manual location input
        setShowLocationModal(true);
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
      // Show modal for manual location input in case of error
      setShowLocationModal(true);
      return null;
    }
  };

  if (isLoading && !showLocationModal) {
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
        <Modal
          visible={showLocationModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Your Location</Text>
              <Text style={styles.modalSubtitle}>
                Please provide your location details to calculate accurate prayer times
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Enter country name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Postal/Zip Code</Text>
                <TextInput
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="Enter postal code"
                  placeholderTextColor="#999"
                />
              </View>
              
              {locationInputError ? (
                <Text style={styles.errorText}>{locationInputError}</Text>
              ) : null}
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.submitButton]} 
                  onPress={handleManualLocation}
                >
                  <Text style={styles.buttonText}>Set Location</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.noteText}>
                Note: Enter either a city or postal code. Country is optional but recommended for accuracy.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1B5E3F',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  button: {
    borderRadius: 5,
    padding: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#1B5E3F',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});