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
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';
import { UserSettings, HabitBuilderSettings } from '../../types';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import ThemedTimePicker from '../common/ThemedTimePicker';

interface PrayerHabitBuilderSettingsProps {
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

const PrayerHabitBuilderSettings: React.FC<PrayerHabitBuilderSettingsProps> = ({
  userSettings,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [localSettings, setLocalSettings] = useState<HabitBuilderSettings>(
    userSettings?.habitBuilder || {
      enabled: false,
      persistentReminders: {
        enabled: true,
        firstCheckDelay: 15,
        interval: 15,
        maxReminders: 3,
      },
      gracePeriodWarning: {
        enabled: true,
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
    }
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userSettings?.habitBuilder) {
      setLocalSettings(userSettings.habitBuilder);
    }
  }, [userSettings]);

  const updateSettings = async (updates: Partial<HabitBuilderSettings>) => {
    setIsUpdating(true);
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);

    try {
      const updated: UserSettings = {
        ...userSettings,
        habitBuilder: newSettings,
      };
      
      StorageService.setUserSettings(updated);
      onUpdateSettings(updated);
      
      // Reschedule notifications with new settings
      if (newSettings.enabled) {
        await NotificationService.scheduleAllPrayerNotifications();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to update habit builder settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuietTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      updateSettings({ quietHours: { ...localSettings.quietHours, start: value } });
    } else {
      updateSettings({ quietHours: { ...localSettings.quietHours, end: value } });
    }
  };

  const formatQuietTime = (time: string) => {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.sectionTitle}>Prayer Habit Builder</Text>
            <Text style={styles.settingDescription}>
              Advanced reminders to help build consistent prayer habits
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
            thumbColor={theme.colors.switch.thumb}
            disabled={isUpdating}
          />
        </View>
      </View>

      {localSettings.enabled && (
        <>
          {/* TIER 2: Persistent Reminders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Persistent Reminders</Text>
              <Switch
                value={localSettings.persistentReminders.enabled}
                onValueChange={(value) =>
                  updateSettings({
                    persistentReminders: {
                      ...localSettings.persistentReminders,
                      enabled: value,
                    },
                  })
                }
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
              />
            </View>
            <Text style={styles.settingDescription}>
              "Have you prayed?" reminders after prayer time
            </Text>

            {localSettings.persistentReminders.enabled && (
              <>
                {/* First Check Delay */}
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>First Check After</Text>
                    <Text style={styles.sliderValue}>
                      {localSettings.persistentReminders.firstCheckDelay} min
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={60}
                    step={5}
                    value={localSettings.persistentReminders.firstCheckDelay}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          firstCheckDelay: value,
                        },
                      })
                    }
                    onSlidingComplete={(value) =>
                      updateSettings({
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          firstCheckDelay: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                  <Text style={styles.sliderHint}>
                    First "Have you prayed?" reminder
                  </Text>
                </View>

                {/* Reminder Interval */}
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Reminder Interval</Text>
                    <Text style={styles.sliderValue}>
                      {localSettings.persistentReminders.interval} min
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={5}
                    maximumValue={60}
                    step={5}
                    value={localSettings.persistentReminders.interval}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          interval: value,
                        },
                      })
                    }
                    onSlidingComplete={(value) =>
                      updateSettings({
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          interval: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                  <Text style={styles.sliderHint}>
                    Time between follow-up reminders
                  </Text>
                </View>

                {/* Max Reminders */}
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Maximum Reminders</Text>
                    <Text style={styles.sliderValue}>
                      {localSettings.persistentReminders.maxReminders}
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={10}
                    step={1}
                    value={localSettings.persistentReminders.maxReminders}
                    onValueChange={(value) =>
                      setLocalSettings({
                        ...localSettings,
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          maxReminders: value,
                        },
                      })
                    }
                    onSlidingComplete={(value) =>
                      updateSettings({
                        persistentReminders: {
                          ...localSettings.persistentReminders,
                          maxReminders: value,
                        },
                      })
                    }
                    minimumTrackTintColor={theme.colors.settings.sliderMin}
                    maximumTrackTintColor={theme.colors.settings.sliderMax}
                    thumbTintColor={theme.colors.settings.sliderThumb}
                  />
                  <Text style={styles.sliderHint}>
                    Total follow-up reminders per prayer
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* TIER 3: Grace Period Warning */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Grace Period Warning</Text>
              <Switch
                value={localSettings.gracePeriodWarning.enabled}
                onValueChange={(value) =>
                  updateSettings({
                    gracePeriodWarning: {
                      ...localSettings.gracePeriodWarning,
                      enabled: value,
                    },
                  })
                }
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
              />
            </View>
            <Text style={styles.settingDescription}>
              Urgent reminder before next prayer starts
            </Text>

            {localSettings.gracePeriodWarning.enabled && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Warn Before Next Prayer</Text>
                  <Text style={styles.sliderValue}>
                    {localSettings.gracePeriodWarning.minutesBeforeNext} min
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={60}
                  step={5}
                  value={localSettings.gracePeriodWarning.minutesBeforeNext}
                  onValueChange={(value) =>
                    setLocalSettings({
                      ...localSettings,
                      gracePeriodWarning: {
                        ...localSettings.gracePeriodWarning,
                        minutesBeforeNext: value,
                      },
                    })
                  }
                  onSlidingComplete={(value) =>
                    updateSettings({
                      gracePeriodWarning: {
                        ...localSettings.gracePeriodWarning,
                        minutesBeforeNext: value,
                      },
                    })
                  }
                  minimumTrackTintColor={theme.colors.settings.sliderWarningMin}
                  maximumTrackTintColor={theme.colors.settings.sliderMax}
                  thumbTintColor={theme.colors.settings.sliderWarningThumb}
                />
                <Text style={styles.sliderHint}>
                  "Last chance" notification timing
                </Text>
              </View>
            )}
          </View>

          {/* Reminder Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Options</Text>
            <Text style={styles.settingDescription}>
              Customize how prayer reminders follow up
            </Text>

            {/* Default Reminder Delay */}
            <View style={styles.snoozeOptions}>
              <Text style={styles.optionLabel}>Default Reminder Delay</Text>
              <View style={styles.buttonRow}>
                {[5, 10, 15, 30].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.snoozeButton,
                      localSettings.snooze.defaultInterval === minutes &&
                        styles.snoozeButtonActive,
                    ]}
                    onPress={() =>
                      updateSettings({
                        snooze: { ...localSettings.snooze, defaultInterval: minutes },
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.snoozeButtonText,
                        localSettings.snooze.defaultInterval === minutes &&
                          styles.snoozeButtonTextActive,
                      ]}
                    >
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Reminders */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Max Reminders Per Prayer</Text>
                <Text style={styles.sliderValue}>
                  {localSettings.snooze.maxSnoozesPerPrayer}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={localSettings.snooze.maxSnoozesPerPrayer}
                onValueChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    snooze: { ...localSettings.snooze, maxSnoozesPerPrayer: value },
                  })
                }
                onSlidingComplete={(value) =>
                  updateSettings({
                    snooze: { ...localSettings.snooze, maxSnoozesPerPrayer: value },
                  })
                }
                minimumTrackTintColor={theme.colors.settings.sliderMin}
                maximumTrackTintColor={theme.colors.settings.sliderMax}
                thumbTintColor={theme.colors.settings.sliderThumb}
              />
              <Text style={styles.sliderHint}>
                Limit follow-up reminders
              </Text>
            </View>
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quiet Hours</Text>
              <Switch
                value={localSettings.quietHours.enabled}
                onValueChange={(value) =>
                  updateSettings({
                    quietHours: { ...localSettings.quietHours, enabled: value },
                  })
                }
                trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                thumbColor={theme.colors.switch.thumb}
              />
            </View>
            <Text style={styles.settingDescription}>
              Skip reminders during sleep hours
            </Text>

            {localSettings.quietHours.enabled && (
              <View style={styles.timePickerContainer}>
                {/* Start Time */}
                <View style={styles.timePickerRow}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatQuietTime(localSettings.quietHours.start)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* End Time */}
                <View style={styles.timePickerRow}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatQuietTime(localSettings.quietHours.end)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.quietHoursHint}>
                  Quiet hours work across midnight (e.g., 22:00 to 06:00)
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it Works</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tier 1: Main Notification</Text>
              <Text style={styles.infoText}>
                Prayer time alert with snooze and complete options
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tier 2: Persistent Reminders</Text>
              <Text style={styles.infoText}>
                Follow-up "Have you prayed?" checks at your chosen intervals
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tier 3: Grace Period</Text>
              <Text style={styles.infoText}>
                Urgent warning before the window for this prayer closes
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Themed Time Pickers */}
      <ThemedTimePicker
        visible={showStartPicker}
        title="Quiet Hours Start"
        value={localSettings.quietHours.start}
        onChange={(v) => handleQuietTimeChange('start', v)}
        onClose={() => setShowStartPicker(false)}
        minuteInterval={5}
      />
      <ThemedTimePicker
        visible={showEndPicker}
        title="Quiet Hours End"
        value={localSettings.quietHours.end}
        onChange={(v) => handleQuietTimeChange('end', v)}
        onClose={() => setShowEndPicker(false)}
        minuteInterval={5}
      />
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginRight: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.settings.labelSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  sliderContainer: {
    marginTop: theme.spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sliderLabel: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelPrimary,
  },
  sliderValue: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.settings.labelMuted,
    marginTop: theme.spacing.xs,
  },
  snoozeOptions: {
    marginTop: theme.spacing.md,
  },
  optionLabel: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelPrimary,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  snoozeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.settings.optionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
    alignItems: 'center',
  },
  snoozeButtonActive: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  snoozeButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelSecondary,
  },
  snoozeButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  timePickerContainer: {
    marginTop: theme.spacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timeLabel: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.settings.labelPrimary,
  },
  timeButton: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md - 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  timeButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
  },
  quietHoursHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.settings.labelMuted,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  infoSection: {
    backgroundColor: theme.colors.settings.infoBg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.infoTitle,
    marginBottom: theme.spacing.lg,
  },
  infoItem: {
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.infoLabel,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.settings.infoText,
    lineHeight: 18,
  },
});

export default PrayerHabitBuilderSettings;
