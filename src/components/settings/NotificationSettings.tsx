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
import * as Haptics from 'expo-haptics';
import NotificationService from '../../services/NotificationService';
import { UserSettings } from '../../types';
import PrayerHabitBuilderSettings from './PrayerHabitBuilderSettings';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { applyIntensityPreset, NotificationIntensity } from '../../utils/notificationPresets';
import logger from '../../utils/logger';

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
    reminderText: "Time for {prayer} prayer",
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
      if (userSettings) {
        const updated = {
          ...userSettings,
          notifications: newSettings,
        };
        onUpdateSettings(updated);
      }

      await NotificationService.updateNotificationSettings(newSettings);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIntensityChange = async (intensity: NotificationIntensity) => {
    // Save the intensity label on notifications for UI
    const newNotifications = { ...localSettings, intensity };
    setLocalSettings(newNotifications);

    // Apply the preset to habitBuilder so scheduling actually changes
    const updatedHabitBuilder = { ...userSettings.habitBuilder };
    applyIntensityPreset(updatedHabitBuilder, intensity);

    const updated: UserSettings = {
      ...userSettings,
      notifications: newNotifications,
      habitBuilder: updatedHabitBuilder,
    };

    try {
      setIsUpdating(true);
      onUpdateSettings(updated);
      await NotificationService.reconcileScheduling('settings_change');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('Failed to update intensity settings:', error);
      Alert.alert('Error', 'Failed to update reminder style');
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
      'Scheduled Reminders',
      `You have ${scheduled.length} prayer reminders scheduled over the next 7 days.`,
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
            Prayer Reminders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habit' && styles.tabActive]}
          onPress={() => setActiveTab('habit')}
        >
          <Text style={[styles.tabText, activeTab === 'habit' && styles.tabTextActive]}>
            Gentle Support
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
              Receive reminders for the five daily prayers
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
            <Text style={styles.sectionTitle}>Preparation Reminder</Text>
            <Text style={styles.settingDescription}>
              Receive a quiet nudge before prayer time
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
                <Text style={styles.settingLabel}>Sound</Text>
                <Text style={styles.settingDescription}>
                  Play a sound with reminders
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
                <Text style={styles.settingLabel}>Quiet Check-In</Text>
                <Text style={styles.settingDescription}>
                  Offer a gentle follow-up after prayer time begins
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
            <Text style={styles.sectionTitle}>Reminder Style</Text>
            <Text style={styles.settingDescription}>
              Choose how much support you want when prayer slips
            </Text>

            <View style={styles.reminderOptions}>
              {([
                { key: 'gentle', label: 'Gentle Return', desc: 'One quiet reminder' },
                { key: 'balanced', label: 'Help Me Be On Time', desc: 'A few follow-ups' },
                { key: 'persistent', label: 'Do Not Let Me Drift', desc: 'Stronger follow-up support' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.reminderOption,
                    (localSettings.intensity || 'balanced') === opt.key && styles.reminderOptionActive,
                    { flex: 1 },
                  ]}
                  onPress={() => handleIntensityChange(opt.key)}
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
            <Text style={styles.sectionTitle}>Test Reminders</Text>
            
            <TouchableOpacity style={styles.button} onPress={testNotification}>
              <Text style={styles.buttonText}>Send Test Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={showScheduledNotifications}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                View Scheduled Reminders
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Notes</Text>
            <Text style={styles.tipText}>
              • Reminders work best when the app has been opened recently
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
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.settings.containerBg,
  },
  section: {
    backgroundColor: theme.colors.settings.sectionBg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.lg,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelPrimary,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.labelSecondary,
    lineHeight: 20,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  reminderOption: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md - 2,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.settings.optionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
  },
  reminderOptionActive: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  reminderOptionText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.labelSecondary,
  },
  reminderOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  button: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  secondaryButton: {
    backgroundColor: theme.colors.settings.buttonSecondaryBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.buttonSecondaryBorder,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.buttonPrimaryText,
  },
  secondaryButtonText: {
    color: theme.colors.settings.buttonSecondaryText,
  },
  tipsSection: {
    backgroundColor: theme.colors.settings.tipsBg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.tipsTitle,
    marginBottom: theme.spacing.md,
  },
  tipText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.tipsText,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
});

export default NotificationSettings;
