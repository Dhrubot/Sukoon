// src/__tests__/notificationCancelResilience.test.ts
// Sprint 5A: Verify that cancelPrayerReminderFlow uses Promise.allSettled
// so one failed cancellation doesn't abort the rest.

// expo-notifications is already mocked globally by jest.setup.js
// We just override specific behaviors per test via require()

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getUserSettings: jest.fn(() => null),
    getValue: jest.fn(() => undefined),
    setValue: jest.fn(),
    deleteValue: jest.fn(),
    setUserSettings: jest.fn(),
  },
}));

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

jest.mock('../services/PrayerTimeService', () => ({
  __esModule: true,
  default: { getPrayerDisplayName: jest.fn((n: string) => n) },
}));

jest.mock('../services/MosqueModeService', () => ({
  __esModule: true,
  default: { isCurrentlyActive: jest.fn(() => false) },
}));

jest.mock('../services/notifications/NotificationChannels', () => ({
  NOTIFICATION_CATEGORIES: {},
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

jest.mock('../services/AnalyticsService', () => ({
  __esModule: true,
  default: { logEvent: jest.fn() },
}));

jest.mock('../store/useStore', () => ({
  useStore: { getState: jest.fn(() => ({ userSettings: null })) },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../utils/locationValidation', () => ({
  isValidCoordinates: jest.fn(() => true),
}));

import NotificationService from '../services/NotificationService';
import * as Notifications from 'expo-notifications';

describe('cancelPrayerReminderFlow resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels remaining notifications even if one fails (Promise.allSettled)', async () => {
    const Notifs = require('expo-notifications');

    // Simulate 3 scheduled notifications for a prayer flow
    const mockScheduled = [
      { identifier: 'n1', content: { data: { prayerId: 'Fajr-2025-01-15' } } },
      { identifier: 'n2', content: { data: { prayerId: 'Fajr-2025-01-15' } } },
      { identifier: 'n3', content: { data: { prayerId: 'Fajr-2025-01-15' } } },
    ];

    Notifs.getAllScheduledNotificationsAsync.mockResolvedValueOnce(mockScheduled);

    // First cancel succeeds, second fails, third succeeds
    Notifs.cancelScheduledNotificationAsync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Stale identifier'))
      .mockResolvedValueOnce(undefined);

    // Should NOT throw despite one failure
    await NotificationService.cancelPrayerReminderFlow('Fajr-2025-01-15');

    // All 3 should have been attempted (not just the first)
    expect(Notifs.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(Notifs.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n1');
    expect(Notifs.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n2');
    expect(Notifs.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n3');
  });

  it('does nothing when no matching notifications exist', async () => {
    const Notifs = require('expo-notifications');

    Notifs.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'other', content: { data: { prayerId: 'Dhuhr-2025-01-15' } } },
    ]);

    await NotificationService.cancelPrayerReminderFlow('Fajr-2025-01-15');

    expect(Notifs.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
