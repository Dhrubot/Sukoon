// src/utils/notificationPresets.ts
// Shared mapping from notification intensity presets to habitBuilder settings.

import { HabitBuilderSettings } from '../types';

export type NotificationIntensity = 'gentle' | 'balanced' | 'persistent';

/**
 * Apply an intensity preset to habitBuilder settings (mutates in place).
 * Used by both Onboarding and Settings screens so behaviour stays in sync.
 */
export function applyIntensityPreset(
  habitBuilder: HabitBuilderSettings,
  intensity: NotificationIntensity,
): void {
  switch (intensity) {
    case 'gentle':
      habitBuilder.enabled = false;
      habitBuilder.persistentReminders.enabled = false;
      habitBuilder.gracePeriodWarning.enabled = false;
      break;
    case 'balanced':
      habitBuilder.enabled = true;
      habitBuilder.persistentReminders.enabled = true;
      habitBuilder.persistentReminders.maxReminders = 1;
      habitBuilder.persistentReminders.firstCheckDelay = 20;
      habitBuilder.gracePeriodWarning.enabled = false;
      break;
    case 'persistent':
      habitBuilder.enabled = true;
      habitBuilder.persistentReminders.enabled = true;
      habitBuilder.persistentReminders.maxReminders = 3;
      habitBuilder.persistentReminders.firstCheckDelay = 15;
      habitBuilder.persistentReminders.interval = 15;
      habitBuilder.gracePeriodWarning.enabled = true;
      habitBuilder.gracePeriodWarning.minutesBeforeNext = 15;
      break;
  }
}
