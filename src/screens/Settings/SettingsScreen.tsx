import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';
import LocationService from '../../services/LocationService';
import NotificationSettings from '../../components/settings/NotificationSettings';
import { CalculationMethod } from '../../types';

const SettingsScreen = ({ navigation }: any) => {
  const { userSettings, setUserSettings, setLocation } = useStore();
  const [showCalculationPicker, setShowCalculationPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const calculationMethods = [
    { value: 'MWL', label: 'Muslim World League' },
    { value: 'ISNA', label: 'Islamic Society of North America' },
    { value: 'Egypt', label: 'Egyptian General Authority' },
    { value: 'Makkah', label: 'Umm al-Qura, Makkah' },
    { value: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
    { value: 'Tehran', label: 'Institute of Geophysics, Tehran' },
    { value: 'Jafari', label: 'Shia Ithna Ashari' },
  ];

  const handleCalculationMethodChange = async (method: CalculationMethod) => {
    if (!userSettings) return;

    const updatedSettings = {
      ...userSettings,
      calculationMethod: method,
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
          location,
        };
        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(location);
        
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

  if (!userSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Prayer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowCalculationPicker(true)}
          >
            <Text style={styles.settingLabel}>Calculation Method</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>
                {calculationMethods.find(m => m.value === userSettings.calculationMethod)?.label}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Juristic Method</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  userSettings.asrJuristic === 'Standard' && styles.segmentActive,
                ]}
                onPress={() => {
                  const updated = { ...userSettings, asrJuristic: 'Standard' as const };
                  StorageService.setUserSettings(updated);
                  setUserSettings(updated);
                }}
              >
                <Text style={[
                  styles.segmentText,
                  userSettings.asrJuristic === 'Standard' && styles.segmentTextActive,
                ]}>
                  Standard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  userSettings.asrJuristic === 'Hanafi' && styles.segmentActive,
                ]}
                onPress={() => {
                  const updated = { ...userSettings, asrJuristic: 'Hanafi' as const };
                  StorageService.setUserSettings(updated);
                  setUserSettings(updated);
                }}
              >
                <Text style={[
                  styles.segmentText,
                  userSettings.asrJuristic === 'Hanafi' && styles.segmentTextActive,
                ]}>
                  Hanafi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowNotificationModal(true)}
          >
            <View>
              <Text style={styles.settingLabel}>Prayer Reminders</Text>
              <Text style={styles.settingSubtext}>
                {userSettings.notifications.enabled ? 'Enabled' : 'Disabled'}
                {userSettings.notifications.enabled && userSettings.notifications.beforePrayer > 0 && 
                  ` • ${userSettings.notifications.beforePrayer} min before`
                }
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              {userSettings.location.city || 'Unknown City'}, {userSettings.location.country || 'Unknown Country'}
            </Text>
            <Text style={styles.coordinatesText}>
              {userSettings.location.latitude.toFixed(4)}°, {userSettings.location.longitude.toFixed(4)}°
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, isUpdatingLocation && styles.buttonDisabled]}
            onPress={updateLocation}
            disabled={isUpdatingLocation}
          >
            <Text style={styles.buttonText}>
              {isUpdatingLocation ? 'Updating...' : 'Update Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Data</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={() => {
            // TODO: Implement export functionality
            Alert.alert('Coming Soon', 'Export feature will be available in the next update');
          }}>
            <Text style={styles.settingLabel}>Export Prayer Data</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, styles.dangerRow]} 
            onPress={handleResetApp}
          >
            <Text style={[styles.settingLabel, styles.dangerText]}>Reset App</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={() => {
            // TODO: Navigate to privacy policy
            Alert.alert('Privacy Policy', 'All your data is stored locally on your device. We do not collect any personal information.');
          }}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <Text style={styles.aboutText}>
            PrayerBuddy is a free app built with ❤️ for the Muslim community
          </Text>
        </View>
      </ScrollView>

      {/* Calculation Method Picker Modal */}
      <Modal
        visible={showCalculationPicker}
        transparent
        animationType="slide"
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalculationPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Method</Text>
              <TouchableOpacity onPress={() => setShowCalculationPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={userSettings.calculationMethod}
              onValueChange={handleCalculationMethodChange}
              style={styles.picker}
            >
              {calculationMethods.map(method => (
                <Picker.Item 
                  key={method.value} 
                  label={method.label} 
                  value={method.value} 
                />
              ))}
            </Picker>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.notificationModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <NotificationSettings />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212121',
  },
  settingSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  settingValue: {
    fontSize: 16,
    color: '#757575',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#757575',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#1B5E3F',
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#757575',
  },
  button: {
    backgroundColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerRow: {
    marginTop: 16,
  },
  dangerText: {
    color: '#F44336',
  },
  aboutText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  notificationModal: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  modalClose: {
    fontSize: 16,
    color: '#1B5E3F',
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
});

export default SettingsScreen;