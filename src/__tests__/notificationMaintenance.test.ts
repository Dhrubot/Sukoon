const baseSettings = {
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

describe('NotificationService maintenance flows', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadNotificationService(options?: {
    isInitialized?: boolean;
    lastBatchScheduleDate?: string;
    scheduledNotifications?: Array<{ identifier: string; content: { data?: Record<string, unknown> } }>;
  }) {
    const scheduledNotifications = options?.scheduledNotifications ?? [];
    const cancelAllFullAdhans = jest.fn(async () => {});
    const stopFullAdhan = jest.fn();
    const getAllScheduledNotificationsAsync = jest.fn(async () => scheduledNotifications);
    const cancelScheduledNotificationAsync = jest.fn(async () => {});
    const storageState = {
      settings: { ...baseSettings, notifications: { ...baseSettings.notifications } },
    };

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
      getLastNotificationResponseAsync: jest.fn(async () => null),
      scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
      cancelScheduledNotificationAsync,
      cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
      getAllScheduledNotificationsAsync,
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
        isInitialized: jest.fn(() => options?.isInitialized ?? true),
        getUserSettings: jest.fn(() => storageState.settings),
        getValue: jest.fn((key: string) =>
          key === 'last_batch_schedule_date' ? options?.lastBatchScheduleDate ?? null : null
        ),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
        setUserSettings: jest.fn(),
      },
    }));
    jest.doMock('../services/PrayerTimeService', () => ({
      __esModule: true,
      default: { getPrayerDisplayName: jest.fn((name: string) => name) },
    }));
    jest.doMock('../services/ReminderStateService', () => ({
      __esModule: true,
      default: { cleanupOldStates: jest.fn() },
    }));
    jest.doMock('../services/MosqueModeService', () => ({
      __esModule: true,
      default: { handleNotificationResponse: jest.fn(), isCurrentlyActive: jest.fn(() => false) },
    }));
    jest.doMock('../services/notifications/NotificationChannels', () => ({
      NOTIFICATION_CATEGORIES: {
        PRAYER_REMINDER: 'prayer-reminder',
        PRE_PRAYER: 'pre-prayer',
        POST_PRAYER_CHECK: 'post-prayer-check',
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
      cancelAllFullAdhans,
      stopFullAdhan,
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
    jest.doMock('../utils/locationValidation', () => ({
      isValidCoordinates: jest.fn(() => true),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('../services/NotificationTraceService', () => ({
      __esModule: true,
      default: { log: jest.fn() },
    }));

    const service = require('../services/NotificationService').default;
    return {
      service,
      storageState,
      cancelAllFullAdhans,
      stopFullAdhan,
      getAllScheduledNotificationsAsync,
      cancelScheduledNotificationAsync,
      AdhanPlayer: require('../services/notifications/AdhanPlayer').default,
    };
  }

  it('reconciles when the last batch schedule is older than the threshold', async () => {
    const { service } = loadNotificationService({
      lastBatchScheduleDate: '2026-03-16T00:00:00.000Z',
    });
    const reconcileSpy = jest.spyOn(service, 'reconcileScheduling').mockResolvedValue(true);

    await expect(
      service.maybeRescheduleExtendedNotifications(12, 'background_refresh')
    ).resolves.toBe(true);

    expect(reconcileSpy).toHaveBeenCalledWith('background_refresh', { force: true });
  });

  it('skips reconcile when storage is unavailable or the threshold has not been crossed', async () => {
    const unavailable = loadNotificationService({ isInitialized: false });
    await expect(unavailable.service.maybeRescheduleExtendedNotifications()).resolves.toBe(false);

    const withinThreshold = loadNotificationService({
      lastBatchScheduleDate: '2026-03-17T08:30:00.000Z',
    });
    const reconcileSpy = jest.spyOn(withinThreshold.service, 'reconcileScheduling').mockResolvedValue(true);

    await expect(withinThreshold.service.maybeRescheduleExtendedNotifications()).resolves.toBe(false);
    expect(reconcileSpy).not.toHaveBeenCalled();
  });

  it('cancels only prayer-related notifications and always cancels native full adhans', async () => {
    const { service, cancelAllFullAdhans, cancelScheduledNotificationAsync } = loadNotificationService({
      scheduledNotifications: [
        { identifier: 'prayer-main', content: { data: { type: 'prayer-time' } } },
        { identifier: 'mindfulness', content: { data: { type: 'mindfulness-reminder' } } },
        { identifier: 'mosque', content: { data: { type: 'mosque_mode_prompt' } } },
        { identifier: 'other', content: { data: { type: 'marketing' } } },
      ],
    });

    await service.cancelAllPrayerNotifications();

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('prayer-main');
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('mindfulness');
    expect(cancelAllFullAdhans).toHaveBeenCalledTimes(1);
  });

  it('cancels every Sukoon devotional notification type when reminders are disabled', async () => {
    const { service, cancelAllFullAdhans, cancelScheduledNotificationAsync } = loadNotificationService({
      scheduledNotifications: [
        { identifier: 'prayer-main', content: { data: { type: 'prayer-time' } } },
        { identifier: 'pre-prayer', content: { data: { type: 'pre-prayer' } } },
        { identifier: 'tier2', content: { data: { type: 'tier2-reminder' } } },
        { identifier: 'tier3', content: { data: { type: 'tier3-warning' } } },
        { identifier: 'snooze', content: { data: { type: 'snoozed' } } },
        { identifier: 'mindfulness', content: { data: { type: 'mindfulness-reminder' } } },
        { identifier: 'keepalive', content: { data: { type: 'keepalive' } } },
        { identifier: 'tahajjud', content: { data: { type: 'tahajjud-reminder' } } },
        { identifier: 'jummah', content: { data: { type: 'jummah-dua' } } },
        { identifier: 'ramadan', content: { data: { type: 'ramadan-countdown' } } },
        { identifier: 'eid', content: { data: { type: 'eid' } } },
        { identifier: 'mosque', content: { data: { type: 'mosque_mode_prompt' } } },
        { identifier: 'other', content: { data: { type: 'marketing' } } },
      ],
    });

    await service.cancelAllSukoonReminderNotifications();

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledTimes(12);
    expect(cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other');
    expect(cancelAllFullAdhans).toHaveBeenCalledTimes(1);
  });

  it('stops adhan playback and clears scheduled notifications when notifications are disabled', async () => {
    const { service, AdhanPlayer } = loadNotificationService();
    const cancelSpy = jest.spyOn(service, 'cancelAllSukoonReminderNotifications').mockResolvedValue();

    await service.updateNotificationSettings({
      enabled: false,
    });

    expect(AdhanPlayer.stop).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
