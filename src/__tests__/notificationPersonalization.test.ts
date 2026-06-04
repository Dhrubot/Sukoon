import * as Notifications from 'expo-notifications';
import { PrayerTime, UserSettings } from '../types';
import {
  getNotificationPersonalizationName,
  prependNotificationName,
} from '../utils/notificationPersonalization';
import { scheduleTier2PersistentReminders } from '../services/notifications/HabitBuilderNotifications';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
}));

jest.mock('../services/PrayerTimeService', () => ({
  __esModule: true,
  default: {
    getPrayerDisplayName: jest.fn((name: string) => name),
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('notification personalization', () => {
  const baseSettings: UserSettings = {
    location: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
    calculationMethod: 'MWL',
    asrJuristic: 'Standard',
    adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
    notifications: {
      enabled: true,
      adhanEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      beforePrayer: 10,
      reminderText: 'Time for {prayer} prayer',
      postPrayerCheck: false,
      liveActivityEnabled: false,
    },
    prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
    habitBuilder: {
      enabled: true,
      persistentReminders: { enabled: true, firstCheckDelay: 15, interval: 15, maxReminders: 1 },
      gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
      snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
      quietHours: { enabled: false, start: '22:00', end: '04:00' },
    },
    mosqueMode: {
      enabled: false,
      silentDuration: 10,
      autoRestore: true,
      promptBeforeEnable: false,
      useVibrateInsteadOfSilent: false,
      iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
    },
    theme: 'auto',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 17, 11, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('uses only real user-provided names for personalization', () => {
    expect(getNotificationPersonalizationName()).toBeNull();
    expect(getNotificationPersonalizationName({ name: '   ' })).toBeNull();
    expect(getNotificationPersonalizationName({ name: 'Default friend' })).toBeNull();
    expect(getNotificationPersonalizationName({ name: '  your NAME  ' })).toBeNull();
    expect(getNotificationPersonalizationName({ name: 'Amina' })).toBe('Amina');
    expect(prependNotificationName('Take a quiet moment before Fajr prayer', { name: 'Amina' }))
      .toBe('Amina, Take a quiet moment before Fajr prayer');
  });

  it('personalizes Tier 2 reminder bodies when a name exists', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // prayerId 'Fajr-2026-03-18' hashes to 942228912 (even) → name IS prepended
    const prayerTime = new Date(2026, 2, 18, 12, 0, 0);
    const prayer: PrayerTime = {
      name: 'Fajr',
      time: prayerTime,
      timestamp: prayerTime.getTime(),
    };
    const deadline = new Date(2026, 2, 18, 13, 0, 0);

    await scheduleTier2PersistentReminders(
      prayer,
      'Fajr-2026-03-18',
      { ...baseSettings, name: 'Amina' },
      new Set(),
      deadline
    );

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'Amina, Fajr time is open — find a quiet moment',
        }),
      })
    );
  });

  it('skips placeholder names in Tier 2 reminder bodies', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const prayerTime = new Date(2026, 2, 17, 12, 0, 0);
    const prayer: PrayerTime = {
      name: 'Fajr',
      time: prayerTime,
      timestamp: prayerTime.getTime(),
    };
    const deadline = new Date(2026, 2, 17, 13, 0, 0);

    await scheduleTier2PersistentReminders(
      prayer,
      'Fajr-2026-03-17',
      { ...baseSettings, name: 'Default friend' },
      new Set(),
      deadline
    );

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: 'Fajr time is open — find a quiet moment',
        }),
      })
    );
  });

  it('prependNotificationName with seed is stable — same seed always yields same result', () => {
    const seed = 'Fajr-2026-06-05';
    const result1 = prependNotificationName('hello', { name: 'Amina' }, seed);
    const result2 = prependNotificationName('hello', { name: 'Amina' }, seed);
    expect(result1).toBe(result2);
    // Fajr-2026-06-05 hashes to 942139573 (odd) → no name prefix
    expect(result1).toBe('hello');
  });

  it('prependNotificationName with seed varies across different seeds', () => {
    // 'Fajr-2026-06-05' → hash 942139573 (odd) → no name
    const oddResult = prependNotificationName('hello', { name: 'Amina' }, 'Fajr-2026-06-05');
    // 'Asr-2026-06-05'  → hash 1555763246 (even) → name prepended
    const evenResult = prependNotificationName('hello', { name: 'Amina' }, 'Asr-2026-06-05');
    expect(oddResult).toBe('hello');
    expect(evenResult).toBe('Amina, hello');
    expect(oddResult).not.toBe(evenResult);
  });

  it('prependNotificationName with seed and no name always returns message unchanged', () => {
    expect(prependNotificationName('hello', null, 'any-seed')).toBe('hello');
    expect(prependNotificationName('hello', undefined, 'Fajr-2026-06-05')).toBe('hello');
  });
});
