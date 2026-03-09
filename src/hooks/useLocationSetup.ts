// src/hooks/useLocationSetup.ts (FINAL ENHANCED VERSION)
import { useState } from 'react';
import { Alert } from 'react-native';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';

export const useLocationSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    city: '',
    country: '',
    postalCode: '',
  });
  const [error, setError] = useState('');
  
  // 🎯 ENHANCED: Better UX state management
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | 'postal'>('gps');
  const [isGpsAvailable, setIsGpsAvailable] = useState(true);

  const { userSettings } = useStore();

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
        `${errorMessage}\n\nWould you like to enter your location manually instead?`,
        [
          { text: 'Try GPS Again', onPress: () => setError('') },
          { text: 'Enter Manually', onPress: () => setLocationMethod('manual') }
        ]
      );
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 ENHANCED: Manual location with better validation
  const handleManualLocation = async () => {
    const { city, country } = formData;

    if (!city.trim()) {
      setError('Please enter a city name');
      return false;
    }

    if (!country.trim()) {
      setError('Please enter a country name');
      return false;
    }

    setIsLoading(true);
    setError('');

    try {
      logger.log('🔍 Setting manual location:', { city: city.trim(), country: country.trim() });
      
      const location = await LocationService.setLocationByAddress(city.trim(), country.trim());

      if (location) {
        logger.log('✅ Manual location set successfully');
        
        // 🎯 AUTOMATIC: Prayer times refresh through your architecture
        Alert.alert(
          'Location Set! ✅',
          `Your location has been set to ${location.city}, ${location.country}.\n\nPrayer times have been calculated for your area.`,
          [{ text: 'Perfect!' }]
        );
        
        // Clear form
        resetForm();
        return true;
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      logger.error('❌ Manual location failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Could not find this location';
      setError(errorMessage);
      
      // 🎯 HELPFUL GUIDANCE: Suggest alternatives
      Alert.alert(
        'Location Not Found',
        `${errorMessage}\n\nTry:\n• Check spelling\n• Use a major city nearby\n• Include state/province if needed`,
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 NEW: Postal code location method
  const handlePostalCodeLocation = async () => {
    const { postalCode, country } = formData;

    if (!postalCode.trim()) {
      setError('Please enter a postal/zip code');
      return false;
    }

    if (!country.trim()) {
      setError('Please enter a country name');
      return false;
    }

    setIsLoading(true);
    setError('');

    try {
      logger.log('🔍 Setting location by postal code:', { postalCode: postalCode.trim(), country: country.trim() });
      
      const location = await LocationService.setLocationByPostalCode(postalCode.trim(), country.trim());

      if (location) {
        logger.log('✅ Postal code location set successfully');
        
        // 🎯 AUTOMATIC: Prayer times refresh through your architecture
        Alert.alert(
          'Location Found! ✅',
          `Found your location: ${location.city}, ${location.country}\n\nPrayer times have been calculated for your area.`,
          [{ text: 'Excellent!' }]
        );
        
        // Clear form
        resetForm();
        return true;
      } else {
        throw new Error('Postal code not found');
      }
    } catch (error) {
      logger.error('❌ Postal code location failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Could not find this postal code';
      setError(errorMessage);
      
      Alert.alert(
        'Postal Code Not Found',
        `${errorMessage}\n\nPlease check:\n• Postal code format\n• Country name spelling\n• Try city name instead`,
        [{ text: 'OK' }]
      );
      
      return false;
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

  const resetForm = () => {
    setFormData({ city: '', country: '', postalCode: '' });
    setError('');
    setIsLoading(false);
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
    locationMethod,
    isGpsAvailable,

    // 🎯 MULTIPLE LOCATION METHODS
    handleGpsLocation,
    handleManualLocation,
    handlePostalCodeLocation,
    refreshLocation,
    checkGpsAvailability,
    
    // Form helpers
    updateFormData,
    resetForm,
    setLocationMethod,
    setError,
    
    // Location info
    getCurrentLocationInfo,
  };
};