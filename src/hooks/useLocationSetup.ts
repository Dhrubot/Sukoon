// src/hooks/useLocationSetup.ts (FINAL ENHANCED VERSION)
import { useState } from 'react';
import { Alert } from 'react-native';
import { Location } from '../types';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';
import { useStructuredLocationSearch } from './useStructuredLocationSearch';

export const useLocationSetup = () => {
  const { userSettings } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    city: '',
    country: '',
  });
  const [error, setError] = useState('');
  
  const [isGpsAvailable, setIsGpsAvailable] = useState(true);
  const structuredSearch = useStructuredLocationSearch({
    initialCountryName: userSettings?.location.country,
  });

  // 🎯 ENHANCED: GPS location with better error handling
  const handleGpsLocation = async () => {
    setIsLoading(true);
    setError('');

    try {
      logger.log('📍 Getting GPS location...');
      
      const location = await LocationService.getCurrentLocation();
      
      if (location) {
        logger.log('✅ GPS location obtained:', {
          city: location.city,
          country: location.country
        });

        await LocationService.saveLocation(location);
        
        // 🎯 AUTOMATIC: Location saves and triggers prayer time refresh
        // through your existing architecture (store → PrayerTimesProvider)
        
        Alert.alert(
          'Location Updated! ✅',
          `Your location has been set to ${location.city}, ${location.country}.\n\nPrayer times have been updated automatically.`,
          [{ text: 'Great!' }]
        );
        
        return true;
      } else {
        throw new Error('Could not get your location');
      }
    } catch (error) {
      logger.error('❌ GPS location failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setError(errorMessage);
      
      // 🎯 SMART FALLBACK: Suggest manual entry
      Alert.alert(
        'GPS Location Failed',
        `${errorMessage}\n\nYou can enter your location manually from the location picker.`,
        [
          { text: 'OK', onPress: () => setError('') },
        ]
      );
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 ENHANCED: Manual location with better validation
  const handleManualLocation = async (): Promise<Location | null> => {
    const { city, country } = formData;

    if (!country.trim()) {
      setError('Please select a country');
      return null;
    }

    if (!city.trim()) {
      setError('Please enter a city name');
      return null;
    }

    if (!structuredSearch.selectedSearchResult) {
      setError('Choose a city from the list. If your town is not listed, pick the nearest major city.');
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      logger.log('📍 Saving selected city search result directly');
      await LocationService.saveLocation({
        latitude: structuredSearch.selectedSearchResult.latitude,
        longitude: structuredSearch.selectedSearchResult.longitude,
        city: structuredSearch.selectedSearchResult.city,
        country: structuredSearch.selectedSearchResult.country,
        timezone: structuredSearch.selectedSearchResult.timezone,
      });

      Alert.alert(
        'Location Set! ✅',
        `Your location has been set to ${structuredSearch.selectedSearchResult.city}, ${structuredSearch.selectedSearchResult.country}.\n\nPrayer times have been calculated for your area.`,
        [{ text: 'Perfect!' }]
      );

      resetForm();
      return {
        latitude: structuredSearch.selectedSearchResult.latitude,
        longitude: structuredSearch.selectedSearchResult.longitude,
        city: structuredSearch.selectedSearchResult.city,
        country: structuredSearch.selectedSearchResult.country,
        timezone: structuredSearch.selectedSearchResult.timezone,
      };
    } catch (error) {
      logger.error('❌ Manual location failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Could not find this location';
      setError(errorMessage);
      
      // 🎯 HELPFUL GUIDANCE: Suggest alternatives
      Alert.alert(
        'Location Not Found',
        `${errorMessage}\n\nTry:\n• Search again with a nearby major city\n• Use GPS location if available`,
        [{ text: 'OK' }]
      );
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 NEW: Check GPS availability
  const checkGpsAvailability = async () => {
    try {
      const { hasPermission, servicesEnabled } = await LocationService.getLocationAccuracy();
      setIsGpsAvailable(hasPermission && servicesEnabled);
      return hasPermission && servicesEnabled;
    } catch (error) {
      logger.error('❌ Error checking GPS availability:', error);
      setIsGpsAvailable(false);
      return false;
    }
  };

  // 🎯 NEW: Refresh current location
  const refreshLocation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const location = await LocationService.refreshCurrentLocation();
      
      if (location) {
        // 🎯 AUTOMATIC: Updates flow through your architecture
        Alert.alert(
          'Location Refreshed! ✅',
          `Updated to ${location.city}, ${location.country}`,
          [{ text: 'Great!' }]
        );
        return true;
      } else {
        throw new Error('Could not refresh location');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh location';
      setError(errorMessage);
      Alert.alert('Refresh Failed', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user types
  };

  const updateCity = (value: string) => {
    updateFormData('city', value);
    structuredSearch.updateCityQuery(value);
  };

  const updateCountry = (value: string) => {
    updateFormData('country', value);
    structuredSearch.updateCountryQuery(value);
  };

  const selectCountry = (country: { code: string; name: string }) => {
    structuredSearch.selectCountry(country);
    updateFormData('country', country.name);
  };

  const selectSearchResult = (result: { latitude: number; longitude: number; city?: string; country?: string; timezone?: string; admin1?: string }) => {
    structuredSearch.selectSearchResult(result);
    updateFormData('city', result.city || '');
    updateFormData('country', result.country || formData.country);
  };

  const resetForm = () => {
    setFormData({ city: '', country: '' });
    setError('');
    setIsLoading(false);
    structuredSearch.reset();
  };

  // 🎯 NEW: Get current location info
  const getCurrentLocationInfo = () => {
    const location = LocationService.getCurrentSavedLocation();
    const hasValid = LocationService.hasSavedLocation();
    
    return {
      location,
      hasValidLocation: hasValid,
      isValid: location ? LocationService.isValidLocation(location) : false,
    };
  };

  return {
    // Form state
    formData,
    error,
    isLoading,
    isGpsAvailable,

    // 🎯 MULTIPLE LOCATION METHODS
    handleGpsLocation,
    handleManualLocation,
    refreshLocation,
    checkGpsAvailability,
    structuredSearch,
    
    // Form helpers
    updateFormData,
    updateCity,
    updateCountry,
    selectCountry,
    selectSearchResult,
    resetForm,
    setError,
    
    // Location info
    getCurrentLocationInfo,
  };
};
