// src/utils/notificationPresets.ts
// Shared mapping from notification intensity presets to notification + habitBuilder settings.

import { HabitBuilderSettings, UserSettings } from '../types';

export type NotificationIntensity = 'gentle' | 'balanced' | 'persistent';

type NotificationSettings = UserSettings['notifications'];

interface IntensityPresetResult {
  notifications: NotificationSettings;
  habitBuilder: HabitBuilderSettings;
}

const cloneHabitBuilder = (
  habitBuilder: HabitBuilderSettings,
): HabitBuilderSettings => ({
  ...habitBuilder,
  persistentReminders: { ...habitBuilder.persistentReminders },
  gracePeriodWarning: { ...habitBuilder.gracePeriodWarning },
  snooze: { ...habitBuilder.snooze },
  quietHours: { ...habitBuilder.quietHours },
});

/**
 * Apply an intensity preset to notification + habitBuilder settings.
 * Used by both Onboarding and Settings screens so behaviour stays in sync.
 */
export function applyIntensityPreset(
  notifications: NotificationSettings,
  habitBuilder: HabitBuilderSettings,
  intensity: NotificationIntensity,
): IntensityPresetResult {
  const nextNotifications: NotificationSettings = {
    ...notifications,
    intensity,
  };
  const nextHabitBuilder = cloneHabitBuilder(habitBuilder);

  switch (intensity) {
    case 'gentle':
      nextNotifications.beforePrayer = 0;
      nextNotifications.postPrayerCheck = false;
      nextHabitBuilder.enabled = false;
      nextHabitBuilder.persistentReminders.enabled = false;
      nextHabitBuilder.persistentReminders.firstCheckDelay = 20;
      nextHabitBuilder.persistentReminders.interval = 15;
      nextHabitBuilder.persistentReminders.maxReminders = 1;
      nextHabitBuilder.gracePeriodWarning.enabled = false;
      nextHabitBuilder.gracePeriodWarning.minutesBeforeNext = 15;
      break;
    case 'balanced':
      nextNotifications.beforePrayer = 10;
      nextNotifications.postPrayerCheck = true;
      nextHabitBuilder.enabled = true;
      nextHabitBuilder.persistentReminders.enabled = true;
      nextHabitBuilder.persistentReminders.maxReminders = 1;
      nextHabitBuilder.persistentReminders.firstCheckDelay = 20;
      nextHabitBuilder.persistentReminders.interval = 15;
      nextHabitBuilder.gracePeriodWarning.enabled = false;
      nextHabitBuilder.gracePeriodWarning.minutesBeforeNext = 15;
      break;
    case 'persistent':
      nextNotifications.beforePrayer = 10;
      nextNotifications.postPrayerCheck = true;
      nextHabitBuilder.enabled = true;
      nextHabitBuilder.persistentReminders.enabled = true;
      nextHabitBuilder.persistentReminders.maxReminders = 3;
      nextHabitBuilder.persistentReminders.firstCheckDelay = 15;
      nextHabitBuilder.persistentReminders.interval = 15;
      nextHabitBuilder.gracePeriodWarning.enabled = true;
      nextHabitBuilder.gracePeriodWarning.minutesBeforeNext = 15;
      break;
  }

  return {
    notifications: nextNotifications,
    habitBuilder: nextHabitBuilder,
  };
}
