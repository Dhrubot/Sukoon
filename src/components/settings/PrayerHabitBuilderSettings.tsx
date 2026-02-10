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
  Modal,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';
import { UserSettings, HabitBuilderSettings } from '../../types';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

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

  const [showTimePickerModal, setShowTimePickerModal] = useState<'start' | 'end' | null>(null);
  const [tempHour, setTempHour] = useState('22');
  const [tempMinute, setTempMinute] = useState('00');
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

  const openTimePicker = (type: 'start' | 'end') => {
    const time = type === 'start' ? localSettings.quietHours.start : localSettings.quietHours.end;
    const [hours, minutes] = time.split(':');
    setTempHour(hours);
    setTempMinute(minutes);
    setShowTimePickerModal(type);
  };

  const saveTime = () => {
    const hour = parseInt(tempHour) || 0;
    const minute = parseInt(tempMinute) || 0;
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid time (Hours: 0-23, Minutes: 0-59)');
      return;
    }
    
    const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    if (showTimePickerModal === 'start') {
      updateSettings({
        quietHours: { ...localSettings.quietHours, start: formattedTime },
      });
    } else {
      updateSettings({
        quietHours: { ...localSettings.quietHours, end: formattedTime },
      });
    }
    
    setShowTimePickerModal(null);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.sectionTitle}>🏗️ Prayer Habit Builder</Text>
            <Text style={styles.settingDescription}>
              Advanced reminders to help build consistent prayer habits
            </Text>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{ false: theme.colors.settings.sliderMax, true: theme.colors.settings.sliderMin }}
            thumbColor={localSettings.enabled ? theme.colors.settings.sliderThumb : theme.colors.switch.thumb}
            disabled={isUpdating}
          />
        </View>
      </View>

      {localSettings.enabled && (
        <>
          {/* TIER 2: Persistent Reminders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Persistent Reminders</Text>
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
                trackColor={{ false: theme.colors.settings.sliderMax, true: theme.colors.settings.sliderMin }}
                thumbColor={localSettings.persistentReminders.enabled ? theme.colors.settings.sliderThumb : theme.colors.switch.thumb}
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
              <Text style={styles.sectionTitle}>⚠️ Grace Period Warning</Text>
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
                trackColor={{ false: theme.colors.settings.sliderMax, true: theme.colors.settings.sliderMin }}
                thumbColor={localSettings.gracePeriodWarning.enabled ? theme.colors.settings.sliderThumb : theme.colors.switch.thumb}
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

          {/* Snooze Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Snooze Options</Text>
            <Text style={styles.settingDescription}>
              Customize snooze behavior for reminders
            </Text>

            {/* Default Snooze Interval */}
            <View style={styles.snoozeOptions}>
              <Text style={styles.optionLabel}>Default Snooze Duration</Text>
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

            {/* Max Snoozes */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Max Snoozes Per Prayer</Text>
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
                Prevent excessive snoozing
              </Text>
            </View>
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>
              <Switch
                value={localSettings.quietHours.enabled}
                onValueChange={(value) =>
                  updateSettings({
                    quietHours: { ...localSettings.quietHours, enabled: value },
                  })
                }
                trackColor={{ false: theme.colors.settings.sliderMax, true: theme.colors.settings.sliderMin }}
                thumbColor={localSettings.quietHours.enabled ? theme.colors.settings.sliderThumb : theme.colors.switch.thumb}
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
                    onPress={() => openTimePicker('start')}
                  >
                    <Text style={styles.timeButtonText}>
                      {localSettings.quietHours.start}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* End Time */}
                <View style={styles.timePickerRow}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker('end')}
                  >
                    <Text style={styles.timeButtonText}>
                      {localSettings.quietHours.end}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.quietHoursHint}>
                  💡 Quiet hours work across midnight (e.g., 22:00 to 06:00)
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>ℹ️ How it Works</Text>
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

      {/* Custom Time Picker Modal */}
      <Modal
        visible={showTimePickerModal !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>
              Set {showTimePickerModal === 'start' ? 'Start' : 'End'} Time
            </Text>
            
            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Hour</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempHour}
                  onChangeText={setTempHour}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="HH"
                />
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Minute</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempMinute}
                  onChangeText={setTempMinute}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="MM"
                />
              </View>
            </View>
            
            <Text style={styles.timeInputHint}>
              24-hour format (e.g., 22:00 for 10 PM)
            </Text>
            
            <View style={styles.timePickerButtons}>
              <TouchableOpacity
                style={[styles.timePickerButton, styles.cancelButton]}
                onPress={() => setShowTimePickerModal(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerButton, styles.saveButton]}
                onPress={saveTime}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
    padding: 20,
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
    marginRight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.settings.labelSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.settings.labelPrimary,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    marginTop: 4,
  },
  snoozeOptions: {
    marginTop: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.settings.labelPrimary,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.settings.labelSecondary,
  },
  snoozeButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  timePickerContainer: {
    marginTop: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.settings.labelPrimary,
  },
  timeButton: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  quietHoursHint: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoSection: {
    backgroundColor: theme.colors.settings.infoBg,
    padding: 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.infoTitle,
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.settings.infoLabel,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.settings.infoText,
    lineHeight: 18,
  },
  // Time Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.settings.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerModal: {
    backgroundColor: theme.colors.settings.modalBg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: theme.colors.settings.modalShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.settings.modalTitle,
    marginBottom: 24,
    textAlign: 'center',
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 13,
    color: theme.colors.settings.labelSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  timeInput: {
    width: 70,
    height: 60,
    borderWidth: 2,
    borderColor: theme.colors.settings.inputBorder,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.settings.inputText,
    textAlign: 'center',
    backgroundColor: theme.colors.settings.inputBg,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
    marginHorizontal: 12,
  },
  timeInputHint: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.settings.cancelBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.cancelBorder,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.cancelText,
  },
  saveButton: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.buttonPrimaryText,
  },
});

export default PrayerHabitBuilderSettings;
