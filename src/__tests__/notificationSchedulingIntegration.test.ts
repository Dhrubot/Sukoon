// src/__tests__/notificationSchedulingIntegration.test.ts
// Integration test for scheduleExtendedNotifications — verifies the scheduling
// orchestration produces valid notifications within iOS budget constraints.

import { PrayerTime, UserSettings } from '../types';
import { CHANNELS, IOS_NOTIFICATION_CAP, SOUNDS } from '../constants/NotificationConstants';
import { Platform } from 'react-native';

// ── Track all scheduled notifications ────────────────────────────────────────
const mockScheduledNotifications: Array<{
  identifier: string;
  content: { title: string; body: string; data: Record<string, unknown> };
  trigger: unknown;
}> = [];

// ── Mock expo-notifications ──────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getAllScheduledNotificationsAsync: jest.fn(() =>
    Promise.resolve(
      mockScheduledNotifications.map((notification) => ({
        identifier: notification.identifier,
        content: notification.content,
        trigger: notification.trigger,
      }))
    )
  ),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn((identifier: string) => {
    const index = mockScheduledNotifications.findIndex((notification) => notification.identifier === identifier);
    if (index >= 0) {
      mockScheduledNotifications.splice(index, 1);
    }
    return Promise.resolve();
  }),
  scheduleNotificationAsync: jest.fn((input: any) => {
    const id = input.identifier || `notif-${mockScheduledNotifications.length}`;
    mockScheduledNotifications.push({
      identifier: id,
      content: input.content,
      trigger: input.trigger,
    });
    return Promise.resolve(id);
  }),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// ── Mock expo-device ─────────────────────────────────────────────────────────
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// ── Build realistic mock settings ────────────────────────────────────────────
const mockLocation = { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' };

const mockTestSettings: UserSettings = {
  location: mockLocation,
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
    persistentReminders: { enabled: true, firstCheckDelay: 15, interval: 15, maxReminders: 3 },
    gracePeriodWarning: { enabled: true, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
    quietHours: { enabled: false, start: '22:00', end: '04:00' },
  },
  mosqueMode: {
    enabled: false,
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    iqamahOffsets: { Fajr: 15, Dhuhr: 15, Asr: 10, Maghrib: 5, Isha: 15 },
  },
  theme: 'auto',
};

// ── Mock StorageService ──────────────────────────────────────────────────────
const mockStorageData: Record<string, string> = {};
jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getUserSettings: jest.fn(() => mockTestSettings),
    getValue: jest.fn((key: string) => mockStorageData[key] || undefined),
    setValue: jest.fn((key: string, value: string) => { mockStorageData[key] = value; }),
    deleteValue: jest.fn((key: string) => { delete mockStorageData[key]; }),
    setUserSettings: jest.fn(),
  },
}));

// ── Mock ReminderStateService ────────────────────────────────────────────────
jest.mock('../services/ReminderStateService', () => ({
  __esModule: true,
  default: {
    initializePrayerReminder: jest.fn(),
    cleanupOldStates: jest.fn(),
    getPrayerReminderState: jest.fn(() => null),
    updatePrayerReminderState: jest.fn(),
    getReminderCount: jest.fn(() => 0),
  },
}));

// ── Mock PrayerTimeService ───────────────────────────────────────────────────
function mockBuildPrayerTimesForDate(date: Date): { prayerTimes: PrayerTime[]; sunrise: Date; sunset: Date; midnight: Date } {
  const d = new Date(date);
  const makePrayer = (name: string, h: number, m: number): PrayerTime => {
    const t = new Date(d);
    t.setHours(h, m, 0, 0);
    return { name: name as PrayerTime['name'], time: t, timestamp: t.getTime(), isNext: false };
  };
  return {
    prayerTimes: [
      makePrayer('Fajr', 5, 12),
      makePrayer('Dhuhr', 12, 5),
      makePrayer('Asr', 15, 30),
      makePrayer('Maghrib', 17, 40),
      makePrayer('Isha', 19, 0),
    ],
    sunrise: (() => { const s = new Date(d); s.setHours(6, 30, 0, 0); return s; })(),
    sunset: (() => { const s = new Date(d); s.setHours(17, 40, 0, 0); return s; })(),
    midnight: (() => { const s = new Date(d); s.setHours(23, 35, 0, 0); return s; })(),
  };
}

jest.mock('../services/PrayerTimeService', () => ({
  __esModule: true,
  default: {
    getPrayerTimesList: jest.fn((_coords: any, date: Date) =>
      Promise.resolve(mockBuildPrayerTimesForDate(date))
    ),
    getPrayerDisplayName: jest.fn((name: string) => name),
  },
}));

// ── Mock MosqueModeService ───────────────────────────────────────────────────
jest.mock('../services/MosqueModeService', () => ({
  __esModule: true,
  default: {
    isCurrentlyActive: jest.fn(() => false),
    getActiveMosqueMode: jest.fn(() => null),
  },
}));

// ── Mock notification sub-modules ────────────────────────────────────────────
jest.mock('../services/notifications/NotificationChannels', () => ({
  NOTIFICATION_CATEGORIES: {
    PRAYER_REMINDER: 'prayer-reminder',
    PRE_PRAYER: 'pre-prayer',
    POST_PRAYER_CHECK: 'post-prayer-check',
    GRACE_PERIOD_WARNING: 'grace-period-warning',
    SNOOZE_OPTIONS: 'snooze-options',
    MOSQUE_REMINDER: 'mosque-reminder',
    TAHAJJUD_REMINDER: 'tahajjud-reminder',
    JUMMAH_REMINDER: 'jummah-reminder',
  },
  initializeChannelsAndCategories: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/notifications/AdhanPlayer', () => ({
  __esModule: true,
  default: { play: jest.fn(), stop: jest.fn() },
}));

jest.mock('../services/notifications/FullAdhanScheduler', () => ({
  scheduleFullAdhan: jest.fn(() => Promise.resolve()),
  cancelAllFullAdhans: jest.fn(() => Promise.resolve()),
  stopFullAdhan: jest.fn(),
  getExactAlarmStatus: jest.fn(() => Promise.resolve('granted')),
}));

jest.mock('../services/notifications/HabitBuilderNotifications', () => ({
  scheduleTier2PersistentReminders: jest.fn(() => Promise.resolve()),
  scheduleTier3GracePeriodWarning: jest.fn(() => Promise.resolve()),
}));

// ── Mock AnalyticsService ────────────────────────────────────────────────────
jest.mock('../services/AnalyticsService', () => ({
  __esModule: true,
  default: { logEvent: jest.fn() },
}));

// ── Mock useStore ────────────────────────────────────────────────────────────
jest.mock('../store/useStore', () => ({
  useStore: { getState: jest.fn(() => ({ userSettings: mockTestSettings })) },
}));

// ── Mock logger ──────────────────────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Mock locationValidation ──────────────────────────────────────────────────
jest.mock('../utils/locationValidation', () => ({
  isValidCoordinates: jest.fn((loc: any) => loc && loc.latitude !== 0 && loc.longitude !== 0),
}));

// ════════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════════

// Import NotificationService once (singleton); reset state via mocks in beforeEach
import NotificationService from '../services/NotificationService';

describe('scheduleExtendedNotifications integration', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduledNotifications.length = 0;
    Object.keys(mockStorageData).forEach((k) => delete mockStorageData[k]);
    mockTestSettings.notifications.fullAdhanEnabled = false;
    mockTestSettings.notifications.adhanEnabled = true;
    mockTestSettings.notifications.soundEnabled = true;
    mockTestSettings.notifications.beforePrayer = 10;
    mockTestSettings.notifications.postPrayerCheck = false;
    mockTestSettings.notifications.intensity = 'balanced';
    mockTestSettings.habitBuilder.enabled = true;
    mockTestSettings.habitBuilder.persistentReminders.enabled = true;
    mockTestSettings.habitBuilder.gracePeriodWarning.enabled = true;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('schedules notifications within iOS cap (≤ 58)', async () => {
    await NotificationService.scheduleExtendedNotifications();

    expect(mockScheduledNotifications.length).toBeGreaterThan(0);
    expect(mockScheduledNotifications.length).toBeLessThanOrEqual(IOS_NOTIFICATION_CAP);
  });

  it('produces no duplicate notification identifiers', async () => {
    await NotificationService.scheduleExtendedNotifications();

    const ids = mockScheduledNotifications.map((n) => n.identifier);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('reconcileScheduling is idempotent across repeated settings-change calls', async () => {
    await NotificationService.reconcileScheduling('settings_change');
    const firstPassIdentifiers = new Set(mockScheduledNotifications.map((n) => n.identifier));

    await NotificationService.reconcileScheduling('settings_change');
    const secondPassIdentifiers = mockScheduledNotifications.map((n) => n.identifier);

    expect(new Set(secondPassIdentifiers)).toEqual(firstPassIdentifiers);
    expect(secondPassIdentifiers).toHaveLength(firstPassIdentifiers.size);
  });

  it('schedules Tier 1 (Adhan) for future prayers across all scheduling days', async () => {
    await NotificationService.scheduleExtendedNotifications();

    // Tier 1 notifications have type 'prayer-time'
    const tier1 = mockScheduledNotifications.filter(
      (n) => n.content?.data?.type === 'prayer-time'
    );

    // Should have at least some Tier 1 notifications for future prayers
    // (exact count depends on how many prayers are still upcoming today)
    expect(tier1.length).toBeGreaterThan(0);
  });

  it('saves fingerprint after successful scheduling', async () => {
    await NotificationService.scheduleExtendedNotifications();

    const StorageService = require('../services/StorageService').default;
    expect(StorageService.setValue).toHaveBeenCalledWith(
      'notification_schedule_fingerprint',
      expect.any(String)
    );
  });

  it('sets permission denied flag when permission not granted', async () => {
    const Notifications = require('expo-notifications');
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    await NotificationService.scheduleExtendedNotifications();

    const StorageService = require('../services/StorageService').default;
    expect(StorageService.setValue).toHaveBeenCalledWith(
      'notification_permission_denied',
      'true'
    );
    // No prayer notifications should be scheduled (only lock was set)
    expect(mockScheduledNotifications.length).toBe(0);
  });

  it('clears permission denied flag when permission is granted', async () => {
    mockStorageData['notification_permission_denied'] = 'true';

    await NotificationService.scheduleExtendedNotifications();

    const StorageService = require('../services/StorageService').default;
    expect(StorageService.deleteValue).toHaveBeenCalledWith(
      'notification_permission_denied'
    );
  });

  it('skips scheduling when lock is held', async () => {
    // Simulate an active lock (within timeout)
    mockStorageData['notification_scheduling_lock'] = Date.now().toString();

    await NotificationService.scheduleExtendedNotifications();

    expect(mockScheduledNotifications.length).toBe(0);
  });

  it('uses the Android native full adhan path when full adhan is enabled', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockTestSettings.notifications.fullAdhanEnabled = true;

    await NotificationService.scheduleExtendedNotifications();

    const mainPrayerNotification = mockScheduledNotifications.find(
      (notification) => notification.content?.data?.type === 'prayer-time'
    );
    const FullAdhanScheduler = require('../services/notifications/FullAdhanScheduler');

    expect(mainPrayerNotification).toBeTruthy();
    expect(mainPrayerNotification?.content.sound).toBeUndefined();
    expect(mainPrayerNotification?.trigger).toMatchObject({ channelId: CHANNELS.ADHAN_SILENT });
    expect(FullAdhanScheduler.scheduleFullAdhan).toHaveBeenCalled();
  });

  it('keeps iOS scheduled prayer notifications on the short bundled sound even when full adhan is enabled', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockTestSettings.notifications.fullAdhanEnabled = true;

    await NotificationService.scheduleExtendedNotifications();

    const mainPrayerNotification = mockScheduledNotifications.find(
      (notification) => notification.content?.data?.type === 'prayer-time'
    );
    const FullAdhanScheduler = require('../services/notifications/FullAdhanScheduler');

    expect(mainPrayerNotification?.content.sound).toBe(SOUNDS.IOS_SHORT);
    expect(FullAdhanScheduler.scheduleFullAdhan).not.toHaveBeenCalled();
  });

  it('falls back to the default notification sound when adhan audio is disabled', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockTestSettings.notifications.adhanEnabled = false;

    await NotificationService.scheduleExtendedNotifications();

    const mainPrayerNotification = mockScheduledNotifications.find(
      (notification) => notification.content?.data?.type === 'prayer-time'
    );

    expect(mainPrayerNotification?.content.sound).toBe('default');
    expect(mainPrayerNotification?.trigger).toMatchObject({ channelId: CHANNELS.DEFAULT });
  });

  it('does not schedule pre-prayer notifications when gentle intensity is active', async () => {
    mockTestSettings.notifications.intensity = 'gentle';
    mockTestSettings.notifications.beforePrayer = 0;
    mockTestSettings.notifications.postPrayerCheck = false;
    mockTestSettings.habitBuilder.enabled = false;
    mockTestSettings.habitBuilder.persistentReminders.enabled = false;
    mockTestSettings.habitBuilder.gracePeriodWarning.enabled = false;

    await NotificationService.scheduleExtendedNotifications();

    const prePrayer = mockScheduledNotifications.filter(
      (notification) => notification.content?.data?.type === 'pre-prayer'
    );
    const prayerTime = mockScheduledNotifications.filter(
      (notification) => notification.content?.data?.type === 'prayer-time'
    );

    expect(prePrayer).toHaveLength(0);
    expect(prayerTime.length).toBeGreaterThan(0);
  });
});
