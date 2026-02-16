import { useState } from 'react';
import { Alert } from 'react-native';
import { useStore } from '../../../store/useStore';
import StorageService from '../../../services/StorageService';
import LocationService from '../../../services/LocationService';
import { CalculationMethodType, CALCULATION_METHODS } from '../../../types';
import { usePrayerTimes } from '../../../providers/PrayerTimesProvider';

export const useSettingsManager = () => {
  const { userSettings, setUserSettings, setLocation } = useStore();
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showManualLocationModal, setShowManualLocationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);
  const [previewPrayerTimes, setPreviewPrayerTimes] = useState<any>(null);

  const { 
    todayPrayerTimes, 
    nextPrayer, 
    isLoading: prayerTimesLoading, 
    hasValidLocation,
    refreshPrayerTimes 
  } = usePrayerTimes();

  const calculationMethods = CALCULATION_METHODS;

  // ✅ FIXED: Proper location update with full location object
  const updateLocation = async () => {
    setIsUpdatingLocation(true);
    
    try {
      // getCurrentLocation already does reverse geocoding
      const location = await LocationService.getCurrentLocation();
      
      if (location && userSettings) {
        // ✅ Use the FULL location object (has city, country, timezone)
        const updatedSettings = {
          ...userSettings,
          location: location,
        };
        
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(location); // Update store
        
        await refreshPrayerTimes();
        
        Alert.alert(
          'Location Updated ✅',
          `Your location has been set to ${location.city}, ${location.country}.\n\nPrayer times have been updated.`,
          [{ text: 'Great!' }]
        );
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      
      Alert.alert(
        'Location Update Failed',
        `${errorMessage}\n\nWould you like to enter your location manually instead?`,
        [
          { text: 'Try Again', onPress: () => updateLocation() },
          { text: 'Enter Manually', onPress: () => setShowManualLocationModal(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const selectLocationManually = () => {
    setShowManualLocationModal(true);
  };

  // ✅ Manual location by city - uses existing setLocationByAddress
  const handleManualLocationByCity = async (city: string, country: string) => {
    if (!city.trim() || !country.trim()) {
      Alert.alert('Missing Information', 'Please enter both city and country.');
      return false;
    }

    setIsUpdatingLocation(true);
    
    try {
      const location = await LocationService.setLocationByAddress(city.trim(), country.trim());

      if (location && userSettings) {
        const updatedSettings = {
          ...userSettings,
          location: location,
        };
        
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(location);
        
        await refreshPrayerTimes();
        
        setShowManualLocationModal(false);
        
        Alert.alert(
          'Location Set! ✅',
          `Your location has been set to ${location.city}, ${location.country}.`,
          [{ text: 'Perfect!' }]
        );
        
        return true;
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Manual location failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not find location';
      
      Alert.alert(
        'Location Not Found',
        `${errorMessage}\n\nTry:\n• Check spelling\n• Use a major city nearby\n• Include state/province if needed`,
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // ✅ Manual location by postal code - uses existing setLocationByPostalCode
  const handleManualLocationByPostalCode = async (postalCode: string, countryCode: string) => {
    if (!postalCode.trim() || !countryCode.trim()) {
      Alert.alert('Missing Information', 'Please enter both postal code and country code.');
      return false;
    }

    setIsUpdatingLocation(true);
    
    try {
      const location = await LocationService.setLocationByPostalCode(postalCode.trim(), countryCode.trim());

      if (location && userSettings) {
        const updatedSettings = {
          ...userSettings,
          location: location,
        };
        
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(location);
        
        await refreshPrayerTimes();
        
        setShowManualLocationModal(false);
        
        Alert.alert(
          'Location Found! ✅',
          `Found: ${location.city}, ${location.country}`,
          [{ text: 'Excellent!' }]
        );
        
        return true;
      } else {
        throw new Error('Postal code not found');
      }
    } catch (error) {
      console.error('Postal code location failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not find postal code';
      
      Alert.alert('Postal Code Not Found', errorMessage, [{ text: 'OK' }]);
      
      return false;
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // ✅ CORRECTED: Manual location by coordinates
  // Uses reverseGeocodeCoordinates instead of non-existent setLocationByCoordinates
  const handleManualLocationByCoordinates = async (latitude: number, longitude: number) => {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return false;
    }

    setIsUpdatingLocation(true);
    
    try {
      // ✅ Use reverseGeocodeCoordinates (this method EXISTS)
      const location = await LocationService.reverseGeocodeCoordinates({ latitude, longitude });

      if (location && userSettings) {
        // Save the location through LocationService to trigger callbacks
        await LocationService.saveLocation(location);
        
        const updatedSettings = {
          ...userSettings,
          location: location,
        };
        
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(location);
        
        await refreshPrayerTimes();
        
        setShowManualLocationModal(false);
        
        Alert.alert(
          'Coordinates Set! ✅',
          `Location set to ${location.city}, ${location.country}`,
          [{ text: 'Great!' }]
        );
        
        return true;
      } else {
        throw new Error('Could not reverse geocode coordinates');
      }
    } catch (error) {
      console.error('Coordinate location failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not set coordinates';
      
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      
      return false;
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleCalculationMethodChange = async (method: CalculationMethodType) => {
    if (!userSettings) return;

    setIsUpdatingMethod(true);
    
    try {
      const updatedSettings = {
        ...userSettings,
        calculationMethod: method.value,
      };

      StorageService.setUserSettings(updatedSettings);
      setUserSettings(updatedSettings);
      setShowCalculationPicker(false);

      await refreshPrayerTimes();
      
      Alert.alert(
        'Method Updated ✅',
        `Prayer calculation method changed to ${method.label}. Prayer times have been updated.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to update calculation method:', error);
      Alert.alert(
        'Update Failed',
        'Failed to update calculation method. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpdatingMethod(false);
    }
  };

  const previewCalculationMethod = async (method: CalculationMethodType) => {
    if (!userSettings?.location || !hasValidLocation) {
      Alert.alert(
        'Location Required',
        'Please set your location first to preview prayer times.'
      );
      return;
    }

    try {
      const PrayerTimeService = (await import('../../../services/PrayerTimeService')).default;
      
      const previewTimes = await PrayerTimeService.getPrayerTimesList(
        userSettings.location,
        new Date(),
        method.value,
        userSettings.adjustments
      );

      setPreviewPrayerTimes({
        method: method.label,
        times: previewTimes,
      });
    } catch (error) {
      console.error('Failed to preview prayer times:', error);
      Alert.alert('Preview Failed', 'Unable to preview prayer times for this method.');
    }
  };

  const testPrayerCalculations = async () => {
    if (!hasValidLocation) {
      Alert.alert('Location Required', 'Please set your location first.');
      return;
    }

    Alert.alert(
      '🧪 Prayer Calculations',
      `Current method: ${userSettings?.calculationMethod}\n` +
      `Asr method: ${userSettings?.asrJuristic}\n` +
      `Location: ${userSettings?.location.city}\n` +
      `Prayers today: ${todayPrayerTimes.length}\n` +
      `Next prayer: ${nextPrayer?.name || 'None'}`,
      [{ text: 'OK' }]
    );
  };

  const handleExportData = async () => {
    Alert.alert('Export Data', 'Data export feature coming soon!', [{ text: 'OK' }]);
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'Are you sure? This will delete all your data and prayer history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            StorageService.clearAllData();
            Alert.alert('App Reset', 'Please restart the app.', [{ text: 'OK' }]);
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = (navigation: any) => {
    navigation.navigate('PrivacyPolicy');
  };

  const showDebugInfo = async () => {
    Alert.alert(
      'Debug Info',
      JSON.stringify({
        hasLocation: hasValidLocation,
        location: userSettings?.location,
        prayerTimesCount: todayPrayerTimes.length,
        nextPrayer: nextPrayer?.name,
      }, null, 2),
      [{ text: 'OK' }]
    );
  };

  return {
    userSettings,
    setUserSettings,
    calculationMethods,
    showCalculationPicker,
    setShowCalculationPicker,
    showNotificationModal,
    setShowNotificationModal,
    showManualLocationModal,
    setShowManualLocationModal,
    isUpdatingLocation,
    isUpdatingMethod,
    previewPrayerTimes,
    
    // Enhanced functions
    updateLocation,
    selectLocationManually,
    handleManualLocationByCity,
    handleManualLocationByPostalCode,
    handleManualLocationByCoordinates,
    handleCalculationMethodChange,
    previewCalculationMethod,
    testPrayerCalculations,
    
    // Data functions
    handleExportData,
    handleResetApp,
    handlePrivacyPolicy,
    showDebugInfo,
    
    // Prayer times data
    todayPrayerTimes,
    nextPrayer,
    prayerTimesLoading,
    hasValidLocation,
    refreshPrayerTimes
  };
};
