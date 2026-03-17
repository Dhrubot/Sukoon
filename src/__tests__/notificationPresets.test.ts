import { applyIntensityPreset } from '../utils/notificationPresets';
import { HabitBuilderSettings } from '../types';

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

describe('applyIntensityPreset', () => {
  it('disables extra follow-up support for gentle reminders', () => {
    const habitBuilder = makeHabitBuilder();

    applyIntensityPreset(habitBuilder, 'gentle');

    expect(habitBuilder.enabled).toBe(false);
  });

  it('configures balanced reminders for a light follow-up pattern', () => {
    const habitBuilder = makeHabitBuilder();

    applyIntensityPreset(habitBuilder, 'balanced');

    expect(habitBuilder.enabled).toBe(true);
    expect(habitBuilder.persistentReminders.enabled).toBe(true);
    expect(habitBuilder.persistentReminders.maxReminders).toBe(1);
    expect(habitBuilder.persistentReminders.firstCheckDelay).toBe(20);
    expect(habitBuilder.gracePeriodWarning.enabled).toBe(false);
  });

  it('configures persistent reminders for stronger follow-up support', () => {
    const habitBuilder = makeHabitBuilder();

    applyIntensityPreset(habitBuilder, 'persistent');

    expect(habitBuilder.enabled).toBe(true);
    expect(habitBuilder.persistentReminders.enabled).toBe(true);
    expect(habitBuilder.persistentReminders.maxReminders).toBe(3);
    expect(habitBuilder.persistentReminders.firstCheckDelay).toBe(15);
    expect(habitBuilder.persistentReminders.interval).toBe(15);
    expect(habitBuilder.gracePeriodWarning.enabled).toBe(true);
    expect(habitBuilder.gracePeriodWarning.minutesBeforeNext).toBe(15);
  });
});
