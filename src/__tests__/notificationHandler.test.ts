const baseSettings = {
  location: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
  calculationMethod: 'MWL',
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    fullAdhanEnabled: false,
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

describe('NotificationService foreground notification handler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function setupHandler(
    platform: 'android' | 'ios',
    notificationsOverride: Partial<typeof baseSettings.notifications> = {}
  ) {
    let capturedHandler: { handleNotification: (notification: any) => Promise<any> } | undefined;

    jest.doMock('react-native', () => ({
      Platform: { OS: platform },
      NativeModules: {
        AdhanModule: {
          scheduleAdhan: jest.fn(async () => {}),
          cancelAllAdhans: jest.fn(async () => {}),
          cancelAdhan: jest.fn(async () => {}),
          stopAdhan: jest.fn(async () => {}),
          getExactAlarmStatus: jest.fn(async () => 'granted'),
        },
        RingerModeModule: {
          setRingerMode: jest.fn(async () => 'NORMAL'),
          getRingerMode: jest.fn(async () => 'NORMAL'),
          canModifyRingerMode: jest.fn(async () => true),
          openNotificationPolicyAccessSettings: jest.fn(async () => true),
          scheduleMosqueMode: jest.fn(async () => true),
          cancelMosqueMode: jest.fn(async () => true),
        },
      },
    }));

    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn((handler) => {
        capturedHandler = handler;
      }),
      DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
      AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
    }));

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => ({
          ...baseSettings,
          notifications: {
            ...baseSettings.notifications,
            ...notificationsOverride,
          },
        })),
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
      default: { handleNotificationResponse: jest.fn() },
    }));
    jest.doMock('../services/notifications/NotificationChannels', () => ({
      NOTIFICATION_CATEGORIES: {
        PRAYER_REMINDER: 'prayer-reminder',
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
      scheduleAdhanAudio: jest.fn(async () => {}),
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

    require('../services/NotificationService');

    return capturedHandler;
  }

  it('lets the channel decide the sound for Android foreground prayer notifications', async () => {
    // Audio is owned by the delivery engine (native service or alarm-grade channel),
    // so the handler no longer mutes prayer-time notifications.
    const handler = setupHandler('android');

    await expect(
      handler?.handleNotification({
        request: { content: { data: { type: 'prayer-time' } } },
      })
    ).resolves.toMatchObject({ shouldPlaySound: true });
  });

  it('mutes the channel for Android test adhans (previewed in-app via AdhanPlayer)', async () => {
    const handler = setupHandler('android');

    await expect(
      handler?.handleNotification({
        request: { content: { data: { type: 'test' } } },
      })
    ).resolves.toMatchObject({ shouldPlaySound: false });
  });

  it('does not mute iOS prayer-notification sound from the foreground handler', async () => {
    const handler = setupHandler('ios');

    await expect(
      handler?.handleNotification({
        request: { content: { data: { type: 'prayer-time' } } },
      })
    ).resolves.toMatchObject({ shouldPlaySound: true });
  });
});
