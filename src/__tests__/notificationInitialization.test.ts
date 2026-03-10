const mockSettings = {
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
    iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
  },
  theme: 'auto',
};

describe('NotificationService initialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('replaces listeners and only initializes channels once across repeated initialize calls', async () => {
    const receivedRemovers = [jest.fn(), jest.fn()];
    const responseRemovers = [jest.fn(), jest.fn()];
    let receivedIndex = 0;
    let responseIndex = 0;

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      getLastNotificationResponseAsync: jest.fn(async () => null),
      scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
      cancelScheduledNotificationAsync: jest.fn(async () => {}),
      cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
      getAllScheduledNotificationsAsync: jest.fn(async () => []),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(async () => null),
      setNotificationCategoryAsync: jest.fn(async () => null),
      addNotificationReceivedListener: jest.fn(() => ({ remove: receivedRemovers[receivedIndex++] })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: responseRemovers[responseIndex++] })),
      DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
      AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
    }));

    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => mockSettings),
        getValue: jest.fn(() => undefined),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
        setUserSettings: jest.fn(),
      },
    }));
    jest.doMock('../services/ReminderStateService', () => ({
      __esModule: true,
      default: {
        cleanupOldStates: jest.fn(),
        hasReachedMaxSnoozes: jest.fn(() => false),
        incrementSnoozeCount: jest.fn(),
        markPrayerCompleted: jest.fn(),
        markPrayerSkipped: jest.fn(),
      },
    }));
    jest.doMock('../services/PrayerTimeService', () => ({
      __esModule: true,
      default: { getPrayerDisplayName: jest.fn((name: string) => name) },
    }));
    jest.doMock('../services/MosqueModeService', () => ({
      __esModule: true,
      default: { handleNotificationResponse: jest.fn() },
    }));
    const initializeChannelsAndCategories = jest.fn(async () => {});
    jest.doMock('../services/notifications/NotificationChannels', () => ({
      NOTIFICATION_CATEGORIES: {
        PRAYER_REMINDER: 'prayer-reminder',
        PRE_PRAYER: 'pre-prayer',
        POST_PRAYER_CHECK: 'post-prayer-check',
        GRACE_PERIOD_WARNING: 'grace-period-warning',
        TAHAJJUD_REMINDER: 'tahajjud-reminder',
        JUMMAH_REMINDER: 'jummah-reminder',
      },
      initializeChannelsAndCategories,
    }));
    jest.doMock('../services/notifications/AdhanPlayer', () => ({
      __esModule: true,
      default: {
        configureAudioMode: jest.fn(async () => {}),
        play: jest.fn(),
        stop: jest.fn(),
        playing: false,
      },
    }));
    jest.doMock('../services/notifications/FullAdhanScheduler', () => ({
      scheduleFullAdhan: jest.fn(async () => {}),
      cancelAllFullAdhans: jest.fn(async () => {}),
      stopFullAdhan: jest.fn(),
      getExactAlarmStatus: jest.fn(async () => 'granted'),
    }));
    jest.doMock('../services/notifications/HabitBuilderNotifications', () => ({
      scheduleTier2PersistentReminders: jest.fn(async () => {}),
      scheduleTier3GracePeriodWarning: jest.fn(async () => {}),
    }));
    jest.doMock('../services/AnalyticsService', () => ({
      __esModule: true,
      default: { logEvent: jest.fn(), logPrayerMissed: jest.fn() },
    }));
    jest.doMock('../services/NotificationLedger', () => ({
      __esModule: true,
      default: { recordDelivered: jest.fn(), recordTapped: jest.fn(), recordScheduled: jest.fn() },
    }));
    jest.doMock('../store/useStore', () => ({
      useStore: { getState: jest.fn(() => ({ setPendingMosquePromptPrayer: jest.fn() })) },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('../utils/locationValidation', () => ({
      isValidCoordinates: jest.fn(() => true),
    }));

    const NotificationService = require('../services/NotificationService').default;
    const Notifications = require('expo-notifications');

    await NotificationService.initialize();
    await NotificationService.initialize();

    expect(initializeChannelsAndCategories).toHaveBeenCalledTimes(1);
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(2);
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(2);
    expect(receivedRemovers[0]).toHaveBeenCalledTimes(1);
    expect(responseRemovers[0]).toHaveBeenCalledTimes(1);
  });

  it('defers cold-start notification responses until navigation is ready and consumes them once', async () => {
    const lastResponse = {
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: {
        request: {
          identifier: 'prayer-Fajr-2026-03-10',
          content: {
            title: 'Fajr Prayer Time',
            data: { type: 'prayer-time', prayer: 'Fajr' },
          },
        },
      },
    };

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      getLastNotificationResponseAsync: jest.fn(async () => lastResponse),
      scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
      cancelScheduledNotificationAsync: jest.fn(async () => {}),
      cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
      getAllScheduledNotificationsAsync: jest.fn(async () => []),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(async () => null),
      setNotificationCategoryAsync: jest.fn(async () => null),
      addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
      AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
    }));

    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => mockSettings),
        getValue: jest.fn(() => undefined),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
        setUserSettings: jest.fn(),
      },
    }));
    jest.doMock('../services/ReminderStateService', () => ({
      __esModule: true,
      default: {
        cleanupOldStates: jest.fn(),
        hasReachedMaxSnoozes: jest.fn(() => false),
        incrementSnoozeCount: jest.fn(),
        markPrayerCompleted: jest.fn(),
        markPrayerSkipped: jest.fn(),
      },
    }));
    jest.doMock('../services/PrayerTimeService', () => ({
      __esModule: true,
      default: { getPrayerDisplayName: jest.fn((name: string) => name) },
    }));
    jest.doMock('../services/MosqueModeService', () => ({
      __esModule: true,
      default: { handleNotificationResponse: jest.fn() },
    }));
    jest.doMock('../services/notifications/NotificationChannels', () => ({
      NOTIFICATION_CATEGORIES: {
        PRAYER_REMINDER: 'prayer-reminder',
        PRE_PRAYER: 'pre-prayer',
        POST_PRAYER_CHECK: 'post-prayer-check',
        GRACE_PERIOD_WARNING: 'grace-period-warning',
        TAHAJJUD_REMINDER: 'tahajjud-reminder',
        JUMMAH_REMINDER: 'jummah-reminder',
      },
      initializeChannelsAndCategories: jest.fn(async () => {}),
    }));
    jest.doMock('../services/notifications/AdhanPlayer', () => ({
      __esModule: true,
      default: {
        configureAudioMode: jest.fn(async () => {}),
        play: jest.fn(),
        stop: jest.fn(),
        playing: false,
      },
    }));
    jest.doMock('../services/notifications/FullAdhanScheduler', () => ({
      scheduleFullAdhan: jest.fn(async () => {}),
      cancelAllFullAdhans: jest.fn(async () => {}),
      stopFullAdhan: jest.fn(),
      getExactAlarmStatus: jest.fn(async () => 'granted'),
    }));
    jest.doMock('../services/notifications/HabitBuilderNotifications', () => ({
      scheduleTier2PersistentReminders: jest.fn(async () => {}),
      scheduleTier3GracePeriodWarning: jest.fn(async () => {}),
    }));
    const analytics = { logEvent: jest.fn(), logPrayerMissed: jest.fn() };
    jest.doMock('../services/AnalyticsService', () => ({
      __esModule: true,
      default: analytics,
    }));
    jest.doMock('../services/NotificationLedger', () => ({
      __esModule: true,
      default: { recordDelivered: jest.fn(), recordTapped: jest.fn(), recordScheduled: jest.fn() },
    }));
    jest.doMock('../store/useStore', () => ({
      useStore: { getState: jest.fn(() => ({ setPendingMosquePromptPrayer: jest.fn() })) },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('../utils/locationValidation', () => ({
      isValidCoordinates: jest.fn(() => true),
    }));

    const NotificationService = require('../services/NotificationService').default;
    const navigationHandler = jest.fn();

    await NotificationService.initialize();
    await expect(NotificationService.consumeInitialNotificationResponse()).resolves.toBe(false);

    NotificationService.registerNavigationHandler(navigationHandler);

    await expect(NotificationService.consumeInitialNotificationResponse()).resolves.toBe(true);
    await expect(NotificationService.consumeInitialNotificationResponse()).resolves.toBe(false);

    expect(navigationHandler).toHaveBeenCalledTimes(1);
    expect(navigationHandler).toHaveBeenCalledWith('Fajr', 'default');
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });
});
