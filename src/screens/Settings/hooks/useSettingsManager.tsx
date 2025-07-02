// src/screens/Settings/hooks/useSettingsManager.tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import { useStore } from '../../../store/useStore';
import StorageService from '../../../services/StorageService';
import NotificationService from '../../../services/NotificationService';
import LocationService from '../../../services/LocationService';
import { CalculationMethod, CalculationMethodType, CALCULATION_METHODS } from '../../../types';

export const useSettingsManager = () => {
  const { userSettings, setUserSettings } = useStore();
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const calculationMethods = CALCULATION_METHODS;

  const handleCalculationMethodChange = async (method: CalculationMethodType) => {
    if (!userSettings) return;

    const updatedSettings = {
      ...userSettings,
      calculationMethod: method.value,
    };

    StorageService.setUserSettings(updatedSettings);
    setUserSettings(updatedSettings);
    setShowCalculationPicker(false);

    // Reschedule notifications with new calculation method
    await NotificationService.scheduleAllPrayerNotifications();
    
    Alert.alert(
      'Updated',
      'Prayer calculation method has been updated. Prayer times will be recalculated.',
      [{ text: 'OK' }]
    );
  };

  const updateLocation = async () => {
    setIsUpdatingLocation(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location && userSettings) {
        const updatedSettings = {
          ...userSettings,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            city: 'Updated Location',
            country: 'Updated Country',
          },
        };
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        
        // Reschedule notifications with new location
        await NotificationService.scheduleAllPrayerNotifications();
        
        Alert.alert('Success', 'Location updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update location. Please try again.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will delete all your prayer data and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            StorageService.clearAllData();
            await NotificationService.cancelAllPrayerNotifications();
            Alert.alert('App Reset', 'All data has been cleared. Please restart the app.');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export feature coming soon! This will allow you to backup your prayer data.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us. We do not collect any personal information.',
      [{ text: 'OK' }]
    );
  };

  return {
    // State
    userSettings,
    showCalculationPicker,
    showNotificationModal,
    isUpdatingLocation,
    calculationMethods,

    // Setters
    setUserSettings,
    setShowCalculationPicker,
    setShowNotificationModal,

    // Actions
    handleCalculationMethodChange,
    updateLocation,
    handleResetApp,
    handleExportData,
    handlePrivacyPolicy,
  };
};