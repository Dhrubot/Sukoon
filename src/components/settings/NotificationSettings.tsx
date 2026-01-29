import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import NotificationService from '../../services/NotificationService';
import StorageService from '../../services/StorageService';
import { UserSettings } from '../../types';
import PrayerHabitBuilderSettings from './PrayerHabitBuilderSettings';

interface NotificationSettingsProps {
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userSettings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'habit'>('basic');
  const [localSettings, setLocalSettings] = useState(userSettings?.notifications || {
    enabled: true,
    soundEnabled: true,
    beforePrayer: 10,
    vibrationEnabled: true,
    postPrayerCheck: true,
    reminderText: "Time for {prayer} prayer 🕌",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const reminderOptions = [0, 5, 10, 15, 20, 30];

  useEffect(() => {
    if (userSettings?.notifications) {
      setLocalSettings(userSettings.notifications);
    }
  }, [userSettings]);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      // Check permissions
      const hasPermission = await NotificationService.initialize();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive prayer reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // @ts-ignore
                  Linking.openURL('app-settings:');
                } else {
                  // @ts-ignore
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        setLocalSettings((prev) => ({ ...prev, enabled: false }));
        return;
      }
    }

    setLocalSettings((prev) => ({ ...prev, enabled: value }));
    await updateSettings({ enabled: value });
  };

  const updateSettings = async (updates: Partial<typeof localSettings>) => {
    setIsUpdating(true);
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);

    try {
      await NotificationService.updateNotificationSettings(newSettings);
      
      if (userSettings) {
        const updated = {
          ...userSettings,
          notifications: newSettings,
        };
        StorageService.setUserSettings(updated);
        onUpdateSettings(updated);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const testNotification = async () => {
    await NotificationService.sendTestNotification();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const showScheduledNotifications = async () => {
    const scheduled = await NotificationService.getScheduledNotifications();
    Alert.alert(
      'Scheduled Notifications',
      `You have ${scheduled.length} prayer notifications scheduled for the next 48 hours.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>
            🔔 Basic
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habit' && styles.tabActive]}
          onPress={() => setActiveTab('habit')}
        >
          <Text style={[styles.tabText, activeTab === 'habit' && styles.tabTextActive]}>
            🏗️ Habit Builder
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'basic' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Main Toggle */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Prayer Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive reminders for all five daily prayers
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={localSettings.enabled ? '#4CAF50' : '#f4f3f4'}
            disabled={isUpdating}
          />
        </View>
      </View>

      {localSettings.enabled && (
        <>
          {/* Pre-Prayer Reminder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pre-Prayer Reminder</Text>
            <Text style={styles.settingDescription}>
              Get notified before prayer time to prepare
            </Text>
            
            <View style={styles.reminderOptions}>
              {reminderOptions.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.reminderOption,
                    localSettings.beforePrayer === minutes && styles.reminderOptionActive,
                  ]}
                  onPress={() => updateSettings({ beforePrayer: minutes })}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      localSettings.beforePrayer === minutes && styles.reminderOptionTextActive,
                    ]}
                  >
                    {minutes === 0 ? 'Off' : `${minutes} min`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sound Settings */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notification Sound</Text>
                <Text style={styles.settingDescription}>
                  Play sound with notifications
                </Text>
              </View>
              <Switch
                value={localSettings.soundEnabled}
                onValueChange={(value) => updateSettings({ soundEnabled: value })}
                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                thumbColor={localSettings.soundEnabled ? '#4CAF50' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Vibration Settings */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <Text style={styles.settingDescription}>
                  Vibrate with notifications
                </Text>
              </View>
              <Switch
                value={localSettings.vibrationEnabled}
                onValueChange={(value) => updateSettings({ vibrationEnabled: value })}
                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                thumbColor={localSettings.vibrationEnabled ? '#4CAF50' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Post-Prayer Check */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Post-Prayer Check</Text>
                <Text style={styles.settingDescription}>
                  Remind me to mark prayers 15 min after prayer time
                </Text>
              </View>
              <Switch
                value={localSettings.postPrayerCheck}
                onValueChange={(value) => updateSettings({ postPrayerCheck: value })}
                trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                thumbColor={localSettings.postPrayerCheck ? '#4CAF50' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Test & Debug */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Notifications</Text>
            
            <TouchableOpacity style={styles.button} onPress={testNotification}>
              <Text style={styles.buttonText}>Send Test Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={showScheduledNotifications}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                View Scheduled Notifications
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Tips</Text>
            <Text style={styles.tipText}>
              • Notifications work best when the app has been opened recently
            </Text>
            <Text style={styles.tipText}>
              • On some devices, you may need to disable battery optimization
            </Text>
            <Text style={styles.tipText}>
              • Prayer times update automatically based on your location
            </Text>
          </View>
        </>
      )}
        </ScrollView>
      ) : (
        <PrayerHabitBuilderSettings
          userSettings={userSettings}
          onUpdateSettings={onUpdateSettings}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 4,
    margin: 16,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,  // base
    fontWeight: '500',  // medium
    color: '#757575',
  },
  tabTextActive: {
    color: '#1B5E3F',
    fontWeight: '600',  // semibold
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,  // xl
    fontWeight: '600',  // semibold
    color: '#1B5E3F',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,  // lg
    fontWeight: '500',  // medium
    color: '#212121',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,  // md
    color: '#757575',
    lineHeight: 20,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  reminderOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reminderOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  reminderOptionText: {
    fontSize: 14,  // md
    color: '#757575',
  },
  reminderOptionTextActive: {
    color: '#1B5E3F',
    fontWeight: '600',  // semibold
  },
  button: {
    backgroundColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1B5E3F',
  },
  buttonText: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#1B5E3F',
  },
  tipsSection: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  tipsTitle: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#1B5E3F',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,  // md
    color: '#2E7D32',
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default NotificationSettings;