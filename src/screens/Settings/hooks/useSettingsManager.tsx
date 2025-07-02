// src/screens/Settings/hooks/useSettingsManager.tsx (ENHANCED)
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useStore } from '../../../store/useStore';
import StorageService from '../../../services/StorageService';
import NotificationService from '../../../services/NotificationService';
import LocationService from '../../../services/LocationService';
import { CalculationMethod, CalculationMethodType, CALCULATION_METHODS } from '../../../types';

// 🎯 NEW: Use centralized prayer times for better UX
import { usePrayerTimes } from '../../../providers/PrayerTimesProvider';

export const useSettingsManager = () => {
  const { userSettings, setUserSettings } = useStore();
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  // 🎯 NEW: State for enhanced UX
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);
  const [previewPrayerTimes, setPreviewPrayerTimes] = useState<any>(null);

  // 🎯 NEW: Access centralized prayer times
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    isLoading: prayerTimesLoading, 
    hasValidLocation,
    refreshPrayerTimes 
  } = usePrayerTimes();

  const calculationMethods = CALCULATION_METHODS;

  // 🎯 NEW: Enhanced calculation method change with preview
  const handleCalculationMethodChange = async (method: CalculationMethodType) => {
    if (!userSettings) return;

    setIsUpdatingMethod(true);
    
    try {
      const updatedSettings = {
        ...userSettings,
        calculationMethod: method.value,
      };

      // Save settings
      StorageService.setUserSettings(updatedSettings);
      setUserSettings(updatedSettings);
      setShowCalculationPicker(false);

      // 🎯 NEW: Refresh prayer times through provider (automatic notification rescheduling)
      await refreshPrayerTimes();
      
      // 🎯 ENHANCED: Better user feedback
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

  // 🎯 NEW: Preview prayer times for different calculation methods
  const previewCalculationMethod = async (method: CalculationMethodType) => {
    if (!userSettings?.location || !hasValidLocation) {
      Alert.alert(
        'Location Required',
        'Please set your location first to preview prayer times.'
      );
      return;
    }

    try {
      // Import PrayerTimeService for preview
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

  // 🎯 ENHANCED: Location update with better feedback
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
            city: 'Updated Location', // TODO: Get actual city name
            country: 'Updated Country', // TODO: Get actual country name
          },
        };
        
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        
        // 🎯 NEW: Use provider for refresh (automatic notification rescheduling)
        await refreshPrayerTimes();
        
        Alert.alert(
          'Location Updated ✅',
          'Your location has been updated and prayer times recalculated.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      Alert.alert(
        'Location Update Failed',
        'Failed to get your current location. Please check your location permissions and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // 🎯 NEW: Enhanced location selection with geocoding
  const selectLocationManually = () => {
    Alert.alert(
      'Manual Location',
      'Manual location selection coming soon! You\'ll be able to search for your city or enter coordinates.',
      [{ text: 'OK' }]
    );
  };

  // 🎯 NEW: Test prayer time calculations
  const testPrayerCalculations = async () => {
    if (!hasValidLocation) {
      Alert.alert('Location Required', 'Please set your location first.');
      return;
    }

    try {
      await refreshPrayerTimes();
      
      const debugInfo = await NotificationService.getDebugInfo();
      
      Alert.alert(
        'Prayer Times Test ✅',
        `Prayer times refreshed successfully!\n\n` +
        `📅 Today's prayers: ${todayPrayerTimes.length}\n` +
        `⏰ Next prayer: ${nextPrayer?.name || 'None'}\n` +
        `🔔 Scheduled notifications: ${debugInfo.scheduledCount}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Prayer calculation test failed:', error);
      Alert.alert('Test Failed', 'Failed to refresh prayer times.');
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

  // 🎯 ENHANCED: Export with more comprehensive data
  const handleExportData = async () => {
    try {
      // Get comprehensive debug info
      const debugInfo = await NotificationService.getDebugInfo();
      const scheduled = await NotificationService.getScheduledNotifications();
      
      const exportData = {
        userSettings,
        todayPrayerTimes,
        nextPrayer,
        notificationDebugInfo: debugInfo,
        scheduledNotifications: scheduled.length,
        exportedAt: new Date().toISOString(),
      };

      Alert.alert(
        'Export Data',
        `Ready to export:\n\n` +
        `📊 User settings\n` +
        `📅 Prayer times data\n` +
        `🔔 ${scheduled.length} scheduled notifications\n\n` +
        `Export feature coming soon!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to prepare export data:', error);
      Alert.alert('Export Failed', 'Failed to prepare export data.');
    }
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us. We do not collect any personal information. All data is stored locally on your device.',
      [{ text: 'OK' }]
    );
  };

  // 🎯 NEW: Debug panel for development
  const showDebugInfo = async () => {
    try {
      const debugInfo = await NotificationService.getDebugInfo();
      
      Alert.alert(
        'Debug Information 🔧',
        `Prayer Times Provider:\n` +
        `• Has valid location: ${hasValidLocation}\n` +
        `• Loading: ${prayerTimesLoading}\n` +
        `• Today's prayers: ${todayPrayerTimes.length}\n` +
        `• Next prayer: ${nextPrayer?.name || 'None'}\n\n` +
        `Notifications:\n` +
        `• Has source: ${debugInfo.hasSource}\n` +
        `• Scheduled: ${debugInfo.scheduledCount}\n` +
        `• Last hash: ${debugInfo.lastScheduledHash.slice(0, 10)}...`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Debug Failed', 'Failed to get debug information.');
    }
  };

  // 🎯 NEW: Clear preview when modal closes
  useEffect(() => {
    if (!showCalculationPicker) {
      setPreviewPrayerTimes(null);
    }
  }, [showCalculationPicker]);

  return {
    // Existing state
    userSettings,
    showCalculationPicker,
    showNotificationModal,
    isUpdatingLocation,
    calculationMethods,

    // 🎯 NEW: Enhanced state
    isUpdatingMethod,
    previewPrayerTimes,
    prayerTimesLoading,
    hasValidLocation,
    todayPrayerTimes,
    nextPrayer,

    // Existing setters
    setUserSettings,
    setShowCalculationPicker,
    setShowNotificationModal,

    // Enhanced actions
    handleCalculationMethodChange,
    updateLocation,
    handleResetApp,
    handleExportData,
    handlePrivacyPolicy,

    // 🎯 NEW: Enhanced actions
    previewCalculationMethod,
    selectLocationManually,
    testPrayerCalculations,
    showDebugInfo,
    refreshPrayerTimes,
  };
};