describe('StorageService maintenance flows', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadStorageService() {
    const logDawamMilestone = jest.fn();
    let encryptedStoreRef: unknown;
    let publicStoreRef: unknown;

    jest.doMock('../services/StorageAdapter', () => {
      const actual = jest.requireActual('../services/StorageAdapter');
      return {
        ...actual,
        createStorage: jest.fn(() => {
          encryptedStoreRef = new actual.MemoryStorage();
          return encryptedStoreRef;
        }),
        createUnencryptedStorage: jest.fn(() => {
          publicStoreRef = new actual.MemoryStorage();
          return publicStoreRef;
        }),
      };
    });
    jest.doMock('../services/AnalyticsService', () => ({
      __esModule: true,
      default: {
        logDawamMilestone,
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const storageService = require('../services/StorageService').default;
    return {
      storageService,
      logDawamMilestone,
      encryptedStore: encryptedStoreRef as any,
      publicStore: publicStoreRef as any,
    };
  }

  it('tracks first launch and public JSON helpers', () => {
    const { storageService } = loadStorageService();

    expect(storageService.isFirstLaunch()).toBe(true);
    expect(storageService.isFirstLaunch()).toBe(false);

    storageService.setPublicJson('notification_debug', { enabled: true, count: 3 });
    expect(storageService.getPublicJson('notification_debug')).toEqual({
      enabled: true,
      count: 3,
    });

    storageService.deletePublicValue('notification_debug');
    expect(storageService.getPublicJson('notification_debug')).toBeNull();
  });

  it('replays queued encrypted writes after initialization and migrates public keys out of secure storage', async () => {
    const { storageService } = loadStorageService();

    storageService.setUserSettings(storageService.getDefaultSettings());
    expect(storageService.isInitialized()).toBe(false);
    expect(storageService.getUserSettings()).toMatchObject({
      calculationMethod: 'MWL',
    });

    await storageService.initialize();
    expect(storageService.isInitialized()).toBe(true);
    expect(storageService.getValue('user_settings')).toContain('"calculationMethod":"MWL"');

    const encryptedStorage = (storageService as any).storage;
    const publicStorage = (storageService as any).publicStorage;
    encryptedStorage.set('current_dawam', '3');
    encryptedStorage.set('prayer_2026-03-17_Fajr', '{"status":"prayed"}');
    encryptedStorage.set('user_id', 'private-user-id');

    storageService.migrateSplitStorage();

    expect(publicStorage.getString('current_dawam')).toBe('3');
    expect(publicStorage.getString('prayer_2026-03-17_Fajr')).toBe('{"status":"prayed"}');
    expect(publicStorage.getBoolean('storage_split_migrated')).toBe(true);
    expect(encryptedStorage.getString('current_dawam')).toBeUndefined();
    expect(encryptedStorage.getString('prayer_2026-03-17_Fajr')).toBeUndefined();
    expect(encryptedStorage.getString('user_id')).toBe('private-user-id');
  });

  it('normalizes untouched legacy gentle settings once during initialization', async () => {
    const { storageService } = loadStorageService();
    const legacyGentle = {
      ...storageService.getDefaultSettings(),
      notifications: {
        enabled: true,
        adhanEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        beforePrayer: 10,
        reminderText: 'Time for {prayer} prayer',
        postPrayerCheck: false,
        intensity: 'gentle',
        liveActivityEnabled: false,
      },
      habitBuilder: {
        enabled: false,
        persistentReminders: {
          enabled: false,
          firstCheckDelay: 20,
          interval: 15,
          maxReminders: 1,
        },
        gracePeriodWarning: {
          enabled: false,
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
          end: '04:00',
        },
      },
    };

    storageService.setUserSettings(legacyGentle);
    await storageService.initialize();

    const normalized = storageService.getUserSettings();
    const publicStorage = (storageService as any).publicStorage;

    expect(normalized?.notifications.beforePrayer).toBe(0);
    expect(normalized?.habitBuilder.enabled).toBe(false);
    expect(publicStorage.getBoolean('gentle_preset_normalized_v1')).toBe(true);
  });

  it('preserves custom gentle reminder timings during initialization', async () => {
    const { storageService } = loadStorageService();
    const customGentle = {
      ...storageService.getDefaultSettings(),
      notifications: {
        ...storageService.getDefaultSettings().notifications,
        beforePrayer: 5,
        intensity: 'gentle',
      },
    };

    storageService.setUserSettings(customGentle);
    await storageService.initialize();

    const normalized = storageService.getUserSettings();
    const publicStorage = (storageService as any).publicStorage;

    expect(normalized?.notifications.beforePrayer).toBe(5);
    expect(publicStorage.getBoolean('gentle_preset_normalized_v1')).toBe(true);
  });

  it('updates daily stats and links mindfulness sessions back to prayer records', () => {
    const { storageService } = loadStorageService();
    const date = '2026-03-17';

    storageService.savePrayerRecord({
      id: 'fajr-1',
      date,
      prayer: 'Fajr',
      status: 'prayed',
      prayedAt: new Date('2026-03-17T05:15:00.000Z'),
    });

    expect(storageService.getDayPrayerRecords(date)).toHaveLength(1);
    expect(storageService.getDailyStats(date)).toMatchObject({
      date,
      prayersCompleted: 1,
      totalPrayers: 5,
      mindfulnessSessions: 0,
      averageFocusScore: 0,
    });

    storageService.saveMindfulnessSession({
      id: 'session-1',
      prayerName: 'Fajr',
      startedAt: new Date('2026-03-17T05:20:00.000Z'),
      completedAt: new Date('2026-03-17T05:25:00.000Z'),
      duration: 300,
      breathingCompleted: true,
      reflectionCompleted: true,
      reflection: { mood: 4, text: 'Focused and calm' },
    });

    expect(storageService.getMindfulnessSession('session-1')).toMatchObject({
      id: 'session-1',
      prayerName: 'Fajr',
    });
    expect(storageService.getPrayerRecord(date, 'Fajr')).toMatchObject({
      mindfulnessCompleted: true,
      reflectionAdded: true,
      focusScore: 80,
    });
    expect(storageService.getDailyStats(date)).toMatchObject({
      mindfulnessSessions: 1,
      averageFocusScore: 80,
    });
  });

  it('summarizes prayer stats across a date range and updates both dawam counters', () => {
    const { storageService, logDawamMilestone } = loadStorageService();
    const publicStorage = (storageService as any).publicStorage;

    storageService.savePrayerRecord({
      id: 'fajr-today',
      date: '2026-03-17',
      prayer: 'Fajr',
      status: 'prayed',
      mindfulnessCompleted: true,
      focusScore: 90,
    });
    storageService.savePrayerRecord({
      id: 'asr-yesterday',
      date: '2026-03-16',
      prayer: 'Asr',
      status: 'prayed',
      focusScore: 70,
    });

    const stats = storageService.getStatsInRange(
      new Date('2026-03-16T00:00:00.000Z'),
      new Date('2026-03-17T23:59:59.000Z')
    );
    expect(stats).toMatchObject({
      totalPossiblePrayers: 15,
      completedPrayers: 2,
      mindfulnessSessions: 1,
      averageFocusScore: 80,
      prayerBreakdown: {
        fajr: 1,
        dhuhr: 0,
        asr: 1,
        maghrib: 0,
        isha: 0,
      },
    });

    publicStorage.set(
      'daily_stats_2026-03-16',
      JSON.stringify({
        date: '2026-03-16',
        prayersCompleted: 5,
        totalPrayers: 5,
        mindfulnessSessions: 0,
        averageFocusScore: 0,
      })
    );
    publicStorage.set(
      'daily_stats_2026-03-17',
      JSON.stringify({
        date: '2026-03-17',
        prayersCompleted: 5,
        totalPrayers: 5,
        mindfulnessSessions: 0,
        averageFocusScore: 0,
      })
    );
    publicStorage.set('current_dawam', 6);
    publicStorage.set('engagement_dawam', 6);

    storageService.updateDawam();

    expect(storageService.getCurrentDawam()).toBe(7);
    expect(storageService.getEngagementDawam()).toBe(7);
    expect(storageService.getLongestDawam()).toBe(7);
    expect(storageService.getLongestEngagementDawam()).toBe(7);
    expect(logDawamMilestone).toHaveBeenCalledTimes(2);
    expect(logDawamMilestone).toHaveBeenNthCalledWith(1, 7);
    expect(logDawamMilestone).toHaveBeenNthCalledWith(2, 7);
  });

  it('manages reminder states and prunes stale storage keys', () => {
    const { storageService } = loadStorageService();
    const publicStorage = (storageService as any).publicStorage;
    const encryptedStorage = (storageService as any).storage;

    storageService.setReminderState('Fajr-2026-03-17', {
      prayerId: 'Fajr-2026-03-17',
      prayerName: 'Fajr',
      prayerTime: new Date('2026-03-17T05:10:00.000Z'),
      nextPrayerTime: new Date('2026-03-17T12:05:00.000Z'),
      status: 'pending',
      tier1Sent: true,
      tier2SentCount: 1,
      tier3Sent: false,
      snoozeCount: 0,
      lastSnoozeTime: null,
      completedAt: null,
      skippedAt: null,
      createdAt: new Date('2026-03-17T05:10:00.000Z'),
    });

    expect(storageService.getReminderState('Fajr-2026-03-17')).toMatchObject({
      prayerId: 'Fajr-2026-03-17',
    });
    expect(storageService.getAllReminderStates()).toHaveLength(1);
    expect(storageService.getReminderStatesForDays(1)).toHaveLength(1);

    storageService.deleteReminderState('Fajr-2026-03-17');
    expect(storageService.getReminderState('Fajr-2026-03-17')).toBeNull();

    publicStorage.set(
      'prayer_2025-03-10_Fajr',
      JSON.stringify({ id: 'old-prayer', date: '2025-03-10', prayer: 'Fajr', status: 'prayed' })
    );
    publicStorage.set(
      'daily_stats_2025-03-10',
      JSON.stringify({ date: '2025-03-10', prayersCompleted: 1, totalPrayers: 5, mindfulnessSessions: 0, averageFocusScore: 0 })
    );
    publicStorage.set(
      'reminder_state_Fajr-2025-03-10',
      JSON.stringify({ prayerId: 'Fajr-2025-03-10' })
    );
    publicStorage.set('lastPrayerRefresh_legacy', 'stale');
    encryptedStorage.set('reflection_2025-03-10_Fajr', 'Old reflection');
    encryptedStorage.set(
      'mindfulness_old',
      JSON.stringify({
        id: 'mindfulness_old',
        startedAt: '2025-03-10T05:10:00.000Z',
      })
    );
    encryptedStorage.set('lastPrayerRefresh_encrypted', 'stale');

    const result = storageService.pruneOldData(365);

    expect(result.prunedKeys).toBeGreaterThanOrEqual(7);
    expect(publicStorage.getString('prayer_2025-03-10_Fajr')).toBeUndefined();
    expect(publicStorage.getString('daily_stats_2025-03-10')).toBeUndefined();
    expect(publicStorage.getString('reminder_state_Fajr-2025-03-10')).toBeUndefined();
    expect(publicStorage.getString('lastPrayerRefresh_legacy')).toBeUndefined();
    expect(encryptedStorage.getString('reflection_2025-03-10_Fajr')).toBeUndefined();
    expect(encryptedStorage.getString('mindfulness_old')).toBeUndefined();
    expect(encryptedStorage.getString('lastPrayerRefresh_encrypted')).toBeUndefined();
  });

  it('persists premium, donation, onboarding, and family metadata helpers', () => {
    const { storageService } = loadStorageService();

    expect(storageService.getPremiumFeatures()).toMatchObject({
      removeAds: false,
      themes: false,
    });

    storageService.setPremiumFeatures({
      removeAds: true,
      themes: true,
      advancedAnalytics: false,
      familySharing: false,
      customNotificationSounds: false,
      cloudBackup: false,
      exportData: false,
      prayerReminders: true,
      widgetSupport: false,
      appleWatchSync: false,
      qiblaCompass: true,
      duaLibrary: false,
      audioRecitations: false,
      unlimitedHistory: false,
    });
    expect(storageService.getPremiumFeatures()).toMatchObject({
      removeAds: true,
      themes: true,
      prayerReminders: true,
      qiblaCompass: true,
    });

    storageService.saveDonation({
      id: 'donation-1',
      amount: 10,
      currency: 'USD',
      date: new Date('2026-03-17T12:00:00.000Z'),
      status: 'completed',
    });
    expect(storageService.getDonationHistory()).toHaveLength(1);

    storageService.setLastAdWatchTime(new Date('2026-03-17T11:00:00.000Z'));
    expect(storageService.getLastAdWatchTime()?.toISOString()).toBe('2026-03-17T11:00:00.000Z');

    storageService.saveFamilyData({ members: 2, plan: 'family' });
    expect(storageService.getFamilyData()).toEqual({ members: 2, plan: 'family' });
    storageService.clearFamilyData();
    expect(storageService.getFamilyData()).toBeNull();

    storageService.setOnboardingProgress({
      completed: true,
      currentStep: 4,
      totalSteps: 4,
      skippedSteps: ['notifications'],
    });
    expect(storageService.getOnboardingProgress()).toMatchObject({
      completed: true,
      currentStep: 4,
    });

    expect(storageService.isDataMigrated()).toBe(false);
    storageService.setDataMigrated();
    expect(storageService.isDataMigrated()).toBe(true);

    storageService.clearAllData();
    expect(storageService.getDonationHistory()).toEqual([]);
    expect(storageService.getOnboardingProgress()).toBeNull();
  });
});
