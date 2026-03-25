import { applyIntensityPreset } from '../utils/notificationPresets';
import { HabitBuilderSettings, UserSettings } from '../types';

const makeHabitBuilder = (): HabitBuilderSettings => ({
  enabled: true,
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
});

const makeNotifications = (): UserSettings['notifications'] => ({
  enabled: true,
  adhanEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  beforePrayer: 10,
  reminderText: 'Time for {prayer} prayer',
  postPrayerCheck: true,
  intensity: 'balanced',
  liveActivityEnabled: false,
});

describe('applyIntensityPreset', () => {
  it('disables extra follow-up support and removes pre-prayer reminders for gentle', () => {
    const notifications = makeNotifications();
    const habitBuilder = makeHabitBuilder();

    const preset = applyIntensityPreset(notifications, habitBuilder, 'gentle');

    expect(preset.notifications.beforePrayer).toBe(0);
    expect(preset.notifications.postPrayerCheck).toBe(false);
    expect(preset.habitBuilder.enabled).toBe(false);
    expect(preset.habitBuilder.persistentReminders.enabled).toBe(false);
    expect(preset.habitBuilder.gracePeriodWarning.enabled).toBe(false);
  });

  it('configures balanced reminders for a light follow-up pattern', () => {
    const notifications = makeNotifications();
    const habitBuilder = makeHabitBuilder();

    const preset = applyIntensityPreset(notifications, habitBuilder, 'balanced');

    expect(preset.notifications.beforePrayer).toBe(10);
    expect(preset.notifications.postPrayerCheck).toBe(true);
    expect(preset.habitBuilder.enabled).toBe(true);
    expect(preset.habitBuilder.persistentReminders.enabled).toBe(true);
    expect(preset.habitBuilder.persistentReminders.maxReminders).toBe(1);
    expect(preset.habitBuilder.persistentReminders.firstCheckDelay).toBe(20);
    expect(preset.habitBuilder.gracePeriodWarning.enabled).toBe(false);
  });

  it('configures persistent reminders for stronger follow-up support', () => {
    const notifications = makeNotifications();
    const habitBuilder = makeHabitBuilder();

    const preset = applyIntensityPreset(notifications, habitBuilder, 'persistent');

    expect(preset.notifications.beforePrayer).toBe(10);
    expect(preset.notifications.postPrayerCheck).toBe(true);
    expect(preset.habitBuilder.enabled).toBe(true);
    expect(preset.habitBuilder.persistentReminders.enabled).toBe(true);
    expect(preset.habitBuilder.persistentReminders.maxReminders).toBe(3);
    expect(preset.habitBuilder.persistentReminders.firstCheckDelay).toBe(15);
    expect(preset.habitBuilder.persistentReminders.interval).toBe(15);
    expect(preset.habitBuilder.gracePeriodWarning.enabled).toBe(true);
    expect(preset.habitBuilder.gracePeriodWarning.minutesBeforeNext).toBe(15);
  });
});
