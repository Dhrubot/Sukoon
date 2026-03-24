import React, { useEffect, useState } from 'react';
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
import { UserSettings, HabitBuilderSettings } from '../../types';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import {
  applyIntensityPreset,
  NotificationIntensity,
} from '../../utils/notificationPresets';
import ThemedTimePicker from '../common/ThemedTimePicker';
import logger from '../../utils/logger';

interface NotificationSettingsProps {
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

const DEFAULT_HABIT_BUILDER: HabitBuilderSettings = {
  enabled: true,
  persistentReminders: {
    enabled: true,
    firstCheckDelay: 20,
    interval: 15,
    maxReminders: 1,
  },
  gracePeriodWarning: {
    enabled: false,
    minutesBeforeNext: 15,
  },
  snooze: {
    allowedIntervals: [5, 10, 15, 30],
    defaultInterval: 10,
    maxSnoozesPerPrayer: 5,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '06:00',
  },
};

const PRESET_OPTIONS: Array<{
  key: NotificationIntensity;
  label: string;
  description: string;
}> = [
  {
    key: 'gentle',
    label: 'Gentle Return',
    description: 'One quiet reminder with no extra follow-up.',
  },
  {
    key: 'balanced',
    label: 'Help Me Be On Time',
    description: 'A little support when a prayer begins to slip.',
  },
  {
    key: 'persistent',
    label: 'Do Not Let Me Drift',
    description: 'Stronger follow-up when you need firmer support.',
  },
];

const buildLocalNotificationSettings = (
  notifications?: UserSettings['notifications'],
) => {
  const defaults = {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    beforePrayer: 10,
    vibrationEnabled: true,
    postPrayerCheck: true,
    reminderText: 'Time for {prayer} prayer',
    intensity: 'balanced' as NotificationIntensity,
    liveActivityEnabled: false,
  };

  return notifications ? { ...defaults, ...notifications } : defaults;
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userSettings,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
  const [localSettings, setLocalSettings] = useState(
    buildLocalNotificationSettings(userSettings?.notifications),
  );
  const [localHabitBuilder, setLocalHabitBuilder] = useState<HabitBuilderSettings>(
    userSettings?.habitBuilder || DEFAULT_HABIT_BUILDER
  );

  const reminderOptions = [0, 5, 10, 15, 20, 30];

  useEffect(() => {
    if (userSettings?.notifications) {
      setLocalSettings(buildLocalNotificationSettings(userSettings.notifications));
    }
    if (userSettings?.habitBuilder) {
      setLocalHabitBuilder(userSettings.habitBuilder);
    }
  }, [userSettings]);

  const cloneHabitBuilder = (
    overrides?: Partial<HabitBuilderSettings>,
  ): HabitBuilderSettings => ({
    ...localHabitBuilder,
    persistentReminders: {
      ...localHabitBuilder.persistentReminders,
      ...overrides?.persistentReminders,
    },
    gracePeriodWarning: {
      ...localHabitBuilder.gracePeriodWarning,
      ...overrides?.gracePeriodWarning,
    },
    snooze: {
      ...localHabitBuilder.snooze,
      ...overrides?.snooze,
    },
    quietHours: {
      ...localHabitBuilder.quietHours,
      ...overrides?.quietHours,
    },
    ...overrides,
  });

  const persistSettings = async (
    notifications = localSettings,
    habitBuilder = localHabitBuilder,
  ) => {
    setIsUpdating(true);
    setLocalSettings(notifications);
    setLocalHabitBuilder(habitBuilder);

    try {
      const updated: UserSettings = {
        ...userSettings,
        notifications,
        habitBuilder,
      };

      onUpdateSettings(updated);
      await NotificationService.updateNotificationSettings(notifications);
      await NotificationService.reconcileScheduling('settings_change');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to update reminder settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const hasPermission = await NotificationService.requestPermissionsFromUser();
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
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }
    }

    await persistSettings({ ...localSettings, enabled: value });
  };

  const handleNotificationUpdate = async (
    updates: Partial<typeof localSettings>,
  ) => {
    await persistSettings({ ...localSettings, ...updates });
  };

  const handleHabitBuilderUpdate = async (
    updates: Partial<HabitBuilderSettings>,
  ) => {
    await persistSettings(localSettings, cloneHabitBuilder(updates));
  };

  const handleIntensityChange = async (intensity: NotificationIntensity) => {
    const nextNotifications = {
      ...localSettings,
      intensity,
      postPrayerCheck: intensity !== 'gentle',
    };
    const nextHabitBuilder = cloneHabitBuilder();
    applyIntensityPreset(nextHabitBuilder, intensity);
    await persistSettings(nextNotifications, nextHabitBuilder);
  };

  const formatQuietTime = (time: string) => {
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Prayer Reminders</Text>
            <Text style={styles.settingDescription}>
              Receive prayer notifications in a calmer, simpler way.
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={handleToggleNotifications}
            trackColor={{
              false: theme.colors.switch.trackFalse,
              true: theme.colors.switch.trackTrue,
            }}
            thumbColor={theme.colors.switch.thumb}
            disabled={isUpdating}
          />
        </View>
      </View>

      {localSettings.enabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Style</Text>
            <Text style={styles.settingDescription}>
              Choose the kind of support you want around prayer.
            </Text>
            <View style={styles.presetList}>
              {PRESET_OPTIONS.map((option) => {
                const active = (localSettings.intensity || 'balanced') === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.presetCard, active && styles.presetCardActive]}
                    onPress={() => handleIntensityChange(option.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetTitle, active && styles.presetTitleActive]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetDescription,
                        active && styles.presetDescriptionActive,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.advancedHeader}
              onPress={() => setShowAdvanced((current) => !current)}
              activeOpacity={0.7}
            >
              <View style={styles.advancedHeaderText}>
                <Text style={styles.sectionTitle}>Advanced Reminder Settings</Text>
                <Text style={styles.settingDescription}>
                  Most people do not need this. Sukoon already adjusts reminders based on your chosen support style.
                </Text>
              </View>
              <Text style={styles.advancedChevron}>{showAdvanced ? '−' : '+'}</Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedBody}>
                <Text style={styles.subsectionTitle}>Preparation Reminder</Text>
                <Text style={styles.settingDescription}>
                  Choose how early Sukoon should nudge you before prayer.
                </Text>
                <View style={styles.reminderOptions}>
                  {reminderOptions.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.reminderOption,
                        localSettings.beforePrayer === minutes &&
                          styles.reminderOptionActive,
                      ]}
                      onPress={() =>
                        handleNotificationUpdate({ beforePrayer: minutes })
                      }
                    >
                      <Text
                        style={[
                          styles.reminderOptionText,
                          localSettings.beforePrayer === minutes &&
                            styles.reminderOptionTextActive,
                        ]}
                      >
                        {minutes === 0 ? 'Off' : `${minutes} min`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Sound</Text>
                    <Text style={styles.settingDescription}>
                      Play a sound with reminders.
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.soundEnabled}
                    onValueChange={(value) =>
                      handleNotificationUpdate({ soundEnabled: value })
                    }
                    trackColor={{
                      false: theme.colors.switch.trackFalse,
                      true: theme.colors.switch.trackTrue,
                    }}
                    thumbColor={theme.colors.switch.thumb}
                  />
                </View>

                <View style={styles.switchCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Vibration</Text>
                    <Text style={styles.settingDescription}>
                      Vibrate with reminders.
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.vibrationEnabled}
                    onValueChange={(value) =>
                      handleNotificationUpdate({ vibrationEnabled: value })
                    }
                    trackColor={{
                      false: theme.colors.switch.trackFalse,
                      true: theme.colors.switch.trackTrue,
                    }}
                    thumbColor={theme.colors.switch.thumb}
                  />
                </View>

                <View style={styles.switchCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Quiet Check-In</Text>
                    <Text style={styles.settingDescription}>
                      Offer a gentle follow-up after prayer time begins.
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.postPrayerCheck}
                    onValueChange={(value) =>
                      handleNotificationUpdate({ postPrayerCheck: value })
                    }
                    trackColor={{
                      false: theme.colors.switch.trackFalse,
                      true: theme.colors.switch.trackTrue,
                    }}
                    thumbColor={theme.colors.switch.thumb}
                  />
                </View>

                <View style={styles.switchCard}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Quiet Hours</Text>
                    <Text style={styles.settingDescription}>
                      Skip reminders during your sleeping hours.
                    </Text>
                  </View>
                  <Switch
                    value={localHabitBuilder.quietHours.enabled}
                    onValueChange={(value) =>
                      handleHabitBuilderUpdate({
                        quietHours: {
                          ...localHabitBuilder.quietHours,
                          enabled: value,
                        },
                      })
                    }
                    trackColor={{
                      false: theme.colors.switch.trackFalse,
                      true: theme.colors.switch.trackTrue,
                    }}
                    thumbColor={theme.colors.switch.thumb}
                  />
                </View>

                {localHabitBuilder.quietHours.enabled && (
                  <View style={styles.timePickerGroup}>
                    <TouchableOpacity
                      style={styles.timePickerRow}
                      onPress={() => setShowQuietStartPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.timePickerLabel}>Quiet hours start</Text>
                      <Text style={styles.timePickerValue}>
                        {formatQuietTime(localHabitBuilder.quietHours.start)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timePickerRow}
                      onPress={() => setShowQuietEndPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.timePickerLabel}>Quiet hours end</Text>
                      <Text style={styles.timePickerValue}>
                        {formatQuietTime(localHabitBuilder.quietHours.end)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.sliderCard}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>First Follow-Up</Text>
                    <Text style={styles.sliderValue}>
                      {localHabitBuilder.persistentReminders.firstCheckDelay} min
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={60}
                    step={5}
                    value={localHabitBuilder.persistentReminders.firstCheckDelay}
                    onSlidingComplete={(value) =>
                      handleHabitBuilderUpdate({
                        persistentReminders: {
                          ...localHabitBuilder.persistentReminders,
                          firstCheckDelay: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                </View>

                <View style={styles.sliderCard}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Space Between Follow-Ups</Text>
                    <Text style={styles.sliderValue}>
                      {localHabitBuilder.persistentReminders.interval} min
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={60}
                    step={5}
                    value={localHabitBuilder.persistentReminders.interval}
                    onSlidingComplete={(value) =>
                      handleHabitBuilderUpdate({
                        persistentReminders: {
                          ...localHabitBuilder.persistentReminders,
                          interval: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                </View>

                <View style={styles.sliderCard}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Follow-Up Limit</Text>
                    <Text style={styles.sliderValue}>
                      {localHabitBuilder.persistentReminders.maxReminders}
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={6}
                    step={1}
                    value={localHabitBuilder.persistentReminders.maxReminders}
                    onSlidingComplete={(value) =>
                      handleHabitBuilderUpdate({
                        persistentReminders: {
                          ...localHabitBuilder.persistentReminders,
                          maxReminders: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                </View>

                <View style={styles.sliderCard}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Prayer Window Reminder</Text>
                    <Text style={styles.sliderValue}>
                      {localHabitBuilder.gracePeriodWarning.minutesBeforeNext} min
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={45}
                    step={5}
                    value={localHabitBuilder.gracePeriodWarning.minutesBeforeNext}
                    onSlidingComplete={(value) =>
                      handleHabitBuilderUpdate({
                        gracePeriodWarning: {
                          ...localHabitBuilder.gracePeriodWarning,
                          enabled: true,
                          minutesBeforeNext: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderWarningMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderWarningThumb}
                  />
                </View>
              </View>
            )}
          </View>

        </>
      )}

      <ThemedTimePicker
        visible={showQuietStartPicker}
        title="Quiet Hours Start"
        value={localHabitBuilder.quietHours.start}
        onChange={(value) =>
          handleHabitBuilderUpdate({
            quietHours: {
              ...localHabitBuilder.quietHours,
              start: value,
            },
          })
        }
        onClose={() => setShowQuietStartPicker(false)}
        minuteInterval={5}
      />
      <ThemedTimePicker
        visible={showQuietEndPicker}
        title="Quiet Hours End"
        value={localHabitBuilder.quietHours.end}
        onChange={(value) =>
          handleHabitBuilderUpdate({
            quietHours: {
              ...localHabitBuilder.quietHours,
              end: value,
            },
          })
        }
        onClose={() => setShowQuietEndPicker(false)}
        minuteInterval={5}
      />
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
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
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.settings.labelPrimary,
      marginBottom: theme.spacing.xs,
    },
    settingDescription: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.settings.labelSecondary,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.primary.DEFAULT,
      marginBottom: theme.spacing.sm,
    },
    presetList: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    presetCard: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.settings.optionBorder,
      backgroundColor: theme.colors.settings.optionBg,
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    presetCardActive: {
      backgroundColor: theme.colors.settings.optionActiveBg,
      borderColor: theme.colors.settings.optionActiveBorder,
    },
    presetTitle: {
      fontSize: 17,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    presetTitleActive: {
      color: theme.colors.primary.DEFAULT,
    },
    presetDescription: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    presetDescriptionActive: {
      color: theme.colors.text.primary,
    },
    advancedHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    advancedHeaderText: {
      flex: 1,
    },
    advancedChevron: {
      fontSize: theme.typography.fontSize['3xl'],
      color: theme.colors.text.muted,
      lineHeight: 28,
      marginTop: 2,
    },
    advancedBody: {
      marginTop: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    subsectionTitle: {
      fontSize: 17,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    reminderOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
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
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.settings.labelSecondary,
    },
    reminderOptionTextActive: {
      color: theme.colors.primary.DEFAULT,
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    switchCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.card.hover,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
    },
    timePickerGroup: {
      gap: theme.spacing.sm,
    },
    timePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.card.hover,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    timePickerLabel: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    timePickerValue: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    sliderCard: {
      backgroundColor: theme.colors.card.hover,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    sliderLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
      marginRight: theme.spacing.md,
    },
    sliderValue: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    slider: {
      width: '100%',
      height: 36,
    },
  });

export default NotificationSettings;
