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
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface NotificationSettingsProps {
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userSettings, onUpdateSettings }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
            Basic
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habit' && styles.tabActive]}
          onPress={() => setActiveTab('habit')}
        >
          <Text style={[styles.tabText, activeTab === 'habit' && styles.tabTextActive]}>
            Habit Builder
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
            trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
            thumbColor={theme.colors.switch.thumb}
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
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
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
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
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
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
              />
            </View>
          </View>

          {/* Notification Intensity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Intensity</Text>
            <Text style={styles.settingDescription}>
              How persistent should follow-up reminders be?
            </Text>

            <View style={styles.reminderOptions}>
              {([
                { key: 'gentle', label: 'Gentle', desc: 'Single reminder only' },
                { key: 'balanced', label: 'Balanced', desc: 'Up to 2 follow-ups' },
                { key: 'persistent', label: 'Persistent', desc: 'Remind until marked' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.reminderOption,
                    (localSettings.intensity || 'balanced') === opt.key && styles.reminderOptionActive,
                    { flex: 1 },
                  ]}
                  onPress={() => updateSettings({ intensity: opt.key })}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      (localSettings.intensity || 'balanced') === opt.key && styles.reminderOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.settings.sectionBg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.settings.optionBg,
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
    backgroundColor: theme.colors.settings.sectionBg,
    shadowColor: theme.colors.settings.modalShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.settings.labelSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.settings.containerBg,
  },
  section: {
    backgroundColor: theme.colors.settings.sectionBg,
    marginBottom: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
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
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.settings.labelPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.settings.labelSecondary,
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
    backgroundColor: theme.colors.settings.optionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
  },
  reminderOptionActive: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  reminderOptionText: {
    fontSize: 14,
    color: theme.colors.settings.labelSecondary,
  },
  reminderOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  button: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: theme.colors.settings.buttonSecondaryBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.buttonSecondaryBorder,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.buttonPrimaryText,
  },
  secondaryButtonText: {
    color: theme.colors.settings.buttonSecondaryText,
  },
  tipsSection: {
    backgroundColor: theme.colors.settings.tipsBg,
    padding: 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.tipsTitle,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.settings.tipsText,
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default NotificationSettings;