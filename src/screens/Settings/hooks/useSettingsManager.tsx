import { useState } from 'react';
import { Alert, Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '../../../store/useStore';
import StorageService from '../../../services/StorageService';
import LocationService from '../../../services/LocationService';
import { CalculationMethodType, CALCULATION_METHODS, PrayerTime } from '../../../types';
import { usePrayerTimes } from '../../../providers/PrayerTimesProvider';
import logger from '../../../utils/logger';
import { applyRegionalCalculationMethod } from '../../../utils/calculationMethodByRegion';

interface PreviewPrayerTimes {
  method: string;
  times: PrayerTime[];
}

interface SettingsNavigation {
  navigate: (screen: string) => void;
}

export const useSettingsManager = () => {
  const { userSettings, setUserSettings } = useStore();
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showManualLocationModal, setShowManualLocationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);
  const [previewPrayerTimes, setPreviewPrayerTimes] = useState<PreviewPrayerTimes | null>(null);

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
        const { settings: updatedSettings, calculationMethod, didAutoSelect } =
          applyRegionalCalculationMethod(userSettings, location);
        
        setUserSettings(updatedSettings);
        
        await refreshPrayerTimes();

        const method = calculationMethods.find((item) => item.value === calculationMethod);
        const methodNote = didAutoSelect
          ? `\n\nPrayer times are now using ${method?.label || calculationMethod} for your region.`
          : '';

        Alert.alert(
          'Location Updated ✅',
          `Your location has been set to ${location.city}, ${location.country}.\n\nPrayer times have been updated.${methodNote}`,
          [{ text: 'Great!' }]
        );
      }
    } catch (error) {
      logger.error('Failed to update location:', error);
      
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

  const handleCalculationMethodChange = async (method: CalculationMethodType) => {
    if (!userSettings) return;

    setIsUpdatingMethod(true);
    
    try {
      const updatedSettings = {
        ...userSettings,
        calculationMethod: method.value,
        calculationMethodManuallySelected: true,
      };

      setUserSettings(updatedSettings);
      setShowCalculationPicker(false);

      await refreshPrayerTimes();
      
      Alert.alert(
        'Method Updated ✅',
        `Prayer calculation method changed to ${method.label}. Prayer times have been updated.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Failed to update calculation method:', error);
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
      
      const { prayerTimes } = await PrayerTimeService.getPrayerTimesList(
        userSettings.location,
        new Date(),
        method.value,
        userSettings.adjustments
      );

      setPreviewPrayerTimes({
        method: method.label,
        times: prayerTimes,
      });
    } catch (error) {
      logger.error('Failed to preview prayer times:', error);
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
    try {
      const jsonData = StorageService.exportPrayerData();
      const fileName = `sukoon-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, jsonData, { encoding: FileSystem.EncodingType.UTF8 });

      if (Platform.OS === 'ios') {
        await Share.share({ url: filePath });
      } else {
        await Share.share({ message: jsonData, title: fileName });
      }
    } catch (error) {
      logger.error('Export failed:', error);
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const { imported, skipped } = StorageService.importPrayerData(jsonString);

      Alert.alert(
        'Import Complete',
        `Imported ${imported} prayer record${imported !== 1 ? 's' : ''}.${skipped > 0 ? ` ${skipped} existing record${skipped !== 1 ? 's' : ''} kept.` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid file format';
      logger.error('Import failed:', error);
      Alert.alert('Import Failed', msg);
    }
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

  const handlePrivacyPolicy = (navigation: SettingsNavigation) => {
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
    handleCalculationMethodChange,
    previewCalculationMethod,
    testPrayerCalculations,
    
    // Data functions
    handleExportData,
    handleImportData,
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
