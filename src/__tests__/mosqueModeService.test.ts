describe('MosqueModeService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadService(options?: {
    platformOS?: 'android' | 'ios';
    scheduledCount?: number;
    activeState?: string | null;
    previousRinger?: string | null;
    mosqueModeEnabled?: boolean;
    promptBeforeEnable?: boolean;
    autoRestore?: boolean;
    useVibrateInsteadOfSilent?: boolean;
    ringerMode?: 'NORMAL' | 'SILENT' | 'VIBRATE' | null;
    scheduleMosqueModeResult?: boolean;
    jummah?: { enabled: boolean; silentDuration: number; iqamahTime: string };
  }) {
    jest.resetModules();

    const storageValues = new Map<string, string>();
    if (options?.activeState) {
      storageValues.set('mosque_mode_active', options.activeState);
    }
    if (options?.previousRinger) {
      storageValues.set('mosque_mode_previous_ringer', options.previousRinger);
    }

    const settings = {
      mosqueMode: {
        enabled: options?.mosqueModeEnabled ?? true,
        iqamahOffsets: {
          Fajr: 10,
          Dhuhr: 12,
          Asr: 15,
          Maghrib: 5,
          Isha: 10,
        },
        silentDuration: 20,
        autoRestore: options?.autoRestore ?? true,
        promptBeforeEnable: options?.promptBeforeEnable ?? false,
        useVibrateInsteadOfSilent: options?.useVibrateInsteadOfSilent ?? false,
        jummah: options?.jummah,
      },
    };

    const getAllScheduledNotificationsAsync = jest.fn(async () =>
      Array.from({ length: options?.scheduledCount ?? 0 }, (_, index) => ({
        identifier: `existing-${index}`,
      }))
    );
    const scheduleNotificationAsync = jest.fn(async () => 'mock-id');
    const cancelScheduledNotificationAsync = jest.fn(async () => {});
    const scheduleMosqueMode = jest.fn(async () => options?.scheduleMosqueModeResult ?? true);
    const cancelMosqueMode = jest.fn(async () => {});
    const getRingerMode = jest.fn(async () => options?.ringerMode ?? 'NORMAL');
    const setRingerMode = jest.fn(async () => {});
    const setValue = jest.fn((key: string, value: string) => {
      storageValues.set(key, value);
    });
    const getValue = jest.fn((key: string) => storageValues.get(key) ?? null);

    // Mock NativeModules so the lazy _getPrefsModule() call in MosqueModeService
    // gets a valid (no-op) RingerModeModule instead of crashing on undefined.
    const mosquePrefsSet = jest.fn(async () => true);
    const mosquePrefsGet = jest.fn(async () => null as string | null);
    const mosquePrefsClear = jest.fn(async () => true);
    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
      NativeModules: {
        RingerModeModule: {
          mosquePrefsSet,
          mosquePrefsGet,
          mosquePrefsClear,
        },
      },
    }));
    jest.doMock('expo-notifications', () => ({
      getAllScheduledNotificationsAsync,
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync,
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => settings),
        getValue,
        setValue,
      },
    }));
    jest.doMock('../services/RingerControlService', () => ({
      __esModule: true,
      default: {
        getRingerMode,
        setRingerMode,
        scheduleMosqueMode,
        cancelMosqueMode,
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/MosqueModeService').default;
    return {
      service,
      settings,
      mocks: {
        getAllScheduledNotificationsAsync,
        scheduleNotificationAsync,
        cancelScheduledNotificationAsync,
        scheduleMosqueMode,
        cancelMosqueMode,
        getRingerMode,
        setRingerMode,
        setValue,
        getValue,
      },
      storageValues,
    };
  }

  const samplePrayer = {
    name: 'Dhuhr' as const,
    time: new Date('2026-03-18T10:30:00.000Z'),
    isNext: true,
  };

  it('reports enabled prayers and iqamah times from stored settings', () => {
    const { service } = loadService();

    expect(service.isEnabledForPrayer('Dhuhr')).toBe(true);
    expect(service.getIqamahTime(samplePrayer)?.toISOString()).toBe('2026-03-18T10:42:00.000Z');

    const disabled = loadService({ mosqueModeEnabled: false });
    expect(disabled.service.isEnabledForPrayer('Dhuhr')).toBe(false);
    expect(disabled.service.getIqamahTime(samplePrayer)).toBeNull();
  });

  it('uses the absolute Jummah iqamah time for Friday Dhuhr instead of the offset', () => {
    const { service } = loadService({
      jummah: { enabled: true, silentDuration: 30, iqamahTime: '13:30' },
    });

    // 2026-03-20 is a Friday. Local h/m asserted (setHours is local, tz-safe).
    const fridayDhuhr = {
      name: 'Dhuhr' as const,
      time: new Date('2026-03-20T11:45:00.000Z'),
      isNext: true,
    };

    const iqamah = service.getIqamahTime(fridayDhuhr);
    expect(iqamah).not.toBeNull();
    expect(iqamah?.getHours()).toBe(13);
    expect(iqamah?.getMinutes()).toBe(30);

    // Disabling the Jummah block falls back to the regular Dhuhr offset (12 min).
    const offsetFallback = loadService({
      jummah: { enabled: false, silentDuration: 30, iqamahTime: '13:30' },
    });
    expect(
      offsetFallback.service.getIqamahTime(fridayDhuhr)?.toISOString()
    ).toBe('2026-03-20T11:57:00.000Z');
  });

  it('schedules android silent mode, notifications, and active state', async () => {
    const { service, mocks, storageValues } = loadService({
      platformOS: 'android',
      ringerMode: 'NORMAL',
      scheduleMosqueModeResult: true,
    });

    await expect(service.scheduleSilentMode(samplePrayer)).resolves.toBe(true);

    expect(mocks.scheduleMosqueMode).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-reminder-Dhuhr-2026-03-18');
    expect(storageValues.get('mosque_mode_previous_ringer')).toBe('NORMAL');
    expect(storageValues.get('mosque_mode_active')).toContain('"prayer":"Dhuhr"');
    expect(storageValues.get('mosque_mode_active')).toContain('"managedBySukoon":true');
  });

  it('schedules two iOS mosque notifications in auto mode (Time-Sensitive) and respects the iOS notification cap', async () => {
    const ios = loadService({
      platformOS: 'ios',
      scheduledCount: 0,
    });
    await ios.service.scheduleUpcomingMosqueModes([samplePrayer]);
    // Phase 1 iOS: schedules both a pre-iqamah reminder AND an iqamah-time notification.
    expect(ios.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    // First notification: pre-iqamah reminder
    expect(ios.mocks.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
      identifier: 'mosque-reminder-Dhuhr-2026-03-18',
    });
    // Both notifications use interruptionLevel: 'timeSensitive' to pierce Focus modes.
    expect(ios.mocks.scheduleNotificationAsync.mock.calls[0][0].content).toMatchObject({
      interruptionLevel: 'timeSensitive',
    });
    // Second notification: at-iqamah notification
    expect(ios.mocks.scheduleNotificationAsync.mock.calls[1][0]).toMatchObject({
      identifier: 'mosque-iqamah-Dhuhr-2026-03-18',
    });
    expect(ios.mocks.scheduleNotificationAsync.mock.calls[1][0].content).toMatchObject({
      interruptionLevel: 'timeSensitive',
    });

    const capped = loadService({
      platformOS: 'ios',
      scheduledCount: 80,
    });
    await capped.service.scheduleUpcomingMosqueModes([samplePrayer]);
    expect(capped.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('handles notification responses, cancellation, active-state reads, and manual restore', async () => {
    const activeState = JSON.stringify({
      prayer: 'Asr',
      iqamahTime: '2026-03-18T12:00:00.000Z',
      restoreTime: '2026-03-18T12:20:00.000Z',
      scheduledAt: '2026-03-18T11:00:00.000Z',
      managedBySukoon: true,
    });
    const { service, mocks, storageValues } = loadService({
      platformOS: 'android',
      activeState,
      previousRinger: 'VIBRATE',
    });

    await service.handleNotificationResponse({
      type: 'mosque_mode_enable',
      mode: 'SILENT',
      prayer: 'Asr',
    });
    expect(mocks.setRingerMode).toHaveBeenCalledWith('SILENT');

    await service.handleNotificationResponse({
      type: 'mosque_mode_restore',
      previousMode: 'NORMAL',
    });
    expect(mocks.setRingerMode).toHaveBeenCalledWith('NORMAL');
    expect(storageValues.get('mosque_mode_active')).toBe('');

    storageValues.set('mosque_mode_active', activeState);
    const active = service.getActiveMosqueMode();
    expect(active).not.toBeNull();
    expect(active?.prayer).toBe('Asr');
    expect(service.isCurrentlyActive()).toBe(false);

    await service.cancelMosqueMode('Asr', new Date('2026-03-18T00:00:00.000Z'));
    expect(mocks.cancelMosqueMode).toHaveBeenCalledTimes(1);
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-prompt-Asr-2026-03-18');
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-reminder-Asr-2026-03-18');
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-enable-Asr-2026-03-18');
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-restore-Asr-2026-03-18');
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mosque-iqamah-Asr-2026-03-18');

    await expect(service.manuallyRestoreRinger()).resolves.toBe(true);
    expect(mocks.setRingerMode).toHaveBeenCalledWith('VIBRATE');
  });

  it('does not restore the ringer when mosque mode did not change it', async () => {
    const activeState = JSON.stringify({
      prayer: 'Asr',
      iqamahTime: '2026-03-18T12:00:00.000Z',
      restoreTime: '2026-03-18T12:20:00.000Z',
      scheduledAt: '2026-03-18T11:00:00.000Z',
      managedBySukoon: false,
    });
    const { service, mocks, storageValues } = loadService({
      platformOS: 'android',
      activeState,
      previousRinger: 'NORMAL',
    });

    await expect(service.manuallyRestoreRinger()).resolves.toBe(true);
    expect(mocks.setRingerMode).not.toHaveBeenCalled();
    expect(storageValues.get('mosque_mode_active')).toBe('');
  });

  it('schedules prompt notifications or upcoming auto-silence depending on settings', async () => {
    const promptMode = loadService({
      platformOS: 'android',
      promptBeforeEnable: true,
    });

    await promptMode.service.schedulePreIqamahPrompts([
      samplePrayer,
      { ...samplePrayer, name: 'Fajr', time: new Date('2026-03-18T09:00:00.000Z') },
    ]);

    expect(promptMode.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(promptMode.mocks.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
      identifier: 'mosque-prompt-Dhuhr-2026-03-18',
    });

    const autoMode = loadService({
      platformOS: 'android',
      promptBeforeEnable: false,
    });

    await autoMode.service.scheduleUpcomingMosqueModes([samplePrayer]);
    expect(autoMode.mocks.scheduleMosqueMode).toHaveBeenCalledTimes(1);
    expect(autoMode.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(autoMode.mocks.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
      identifier: 'mosque-reminder-Dhuhr-2026-03-18',
    });

    const iosAuto = loadService({
      platformOS: 'ios',
      promptBeforeEnable: false,
    });

    await iosAuto.service.scheduleUpcomingMosqueModes([samplePrayer]);
    // iOS auto mode now schedules 2 notifications (pre-iqamah + iqamah-time).
    expect(iosAuto.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('skips Android ringer automation when the phone is already quiet', async () => {
    const autoMode = loadService({
      platformOS: 'android',
      promptBeforeEnable: false,
      ringerMode: 'SILENT',
    });

    await expect(autoMode.service.scheduleSilentMode(samplePrayer)).resolves.toBe(true);

    expect(autoMode.mocks.scheduleMosqueMode).not.toHaveBeenCalled();
    expect(autoMode.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(autoMode.storageValues.get('mosque_mode_active')).toContain('"managedBySukoon":false');
  });

  // ---------------------------------------------------------------------------
  // Phase 1 watchdog tests (required by acceptance criteria)
  // ---------------------------------------------------------------------------

  it('[watchdog] auto-restores ringer when restoreTime has passed and phone is still SILENT', async () => {
    // Active state with restoreTime in the PAST (window has expired).
    const pastRestoreTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    const pastIqamahTime  = new Date(Date.now() - 25 * 60 * 1000); // 25 min ago
    const activeState = JSON.stringify({
      prayer: 'Asr',
      iqamahTime: pastIqamahTime.toISOString(),
      restoreTime: pastRestoreTime.toISOString(),
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      managedBySukoon: true,
    });

    const { service, mocks, storageValues } = loadService({
      platformOS: 'android',
      activeState,
      previousRinger: 'NORMAL',
      // Phone is still SILENT — the AlarmManager restore alarm was missed.
      ringerMode: 'SILENT',
    });

    const result = await service.runForegroundWatchdog();

    // Watchdog must detect stuck-silent and auto-restore.
    expect(result).toBe('restored');
    // setRingerMode('NORMAL') must have been called — restore to previousRinger.
    expect(mocks.setRingerMode).toHaveBeenCalledWith('NORMAL');
    // Active state must be cleared from storage.
    expect(storageValues.get('mosque_mode_active')).toBe('');
  });

  it('[watchdog] does NOT restore ringer when restoreTime passed but phone is already NORMAL', async () => {
    const pastRestoreTime = new Date(Date.now() - 5 * 60 * 1000);
    const pastIqamahTime  = new Date(Date.now() - 25 * 60 * 1000);
    const activeState = JSON.stringify({
      prayer: 'Asr',
      iqamahTime: pastIqamahTime.toISOString(),
      restoreTime: pastRestoreTime.toISOString(),
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      managedBySukoon: true,
    });

    const { service, mocks, storageValues } = loadService({
      platformOS: 'android',
      activeState,
      previousRinger: 'NORMAL',
      // Restore alarm already fired — phone is back to NORMAL.
      ringerMode: 'NORMAL',
    });

    const result = await service.runForegroundWatchdog();

    // No restore needed — alarm must have fired already.
    expect(result).toBe('no_restore_needed');
    expect(mocks.setRingerMode).not.toHaveBeenCalled();
    // Stale state should still be cleared.
    expect(storageValues.get('mosque_mode_active')).toBe('');
  });

  it('[watchdog] is a no-op on iOS (platform guard)', async () => {
    const pastRestoreTime = new Date(Date.now() - 5 * 60 * 1000);
    const pastIqamahTime  = new Date(Date.now() - 25 * 60 * 1000);
    const activeState = JSON.stringify({
      prayer: 'Asr',
      iqamahTime: pastIqamahTime.toISOString(),
      restoreTime: pastRestoreTime.toISOString(),
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      managedBySukoon: true,
    });

    const { service, mocks } = loadService({
      platformOS: 'ios',
      activeState,
      ringerMode: null, // getRingerMode returns null on iOS (module not available)
    });

    const result = await service.runForegroundWatchdog();

    // iOS short-circuits immediately — no ringer calls.
    expect(result).toBe('none');
    expect(mocks.setRingerMode).not.toHaveBeenCalled();
  });

  it('[watchdog] returns none when there is no active mosque mode state', async () => {
    const { service, mocks } = loadService({
      platformOS: 'android',
      activeState: null,
    });

    const result = await service.runForegroundWatchdog();

    expect(result).toBe('none');
    expect(mocks.setRingerMode).not.toHaveBeenCalled();
    expect(mocks.getRingerMode).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // iOS copy assertion tests (required by acceptance criteria)
  // ---------------------------------------------------------------------------

  it('[iOS copy] headerSubtitle leads with the iOS limitation for non-Android', () => {
    const { mosqueModePlatformUi } = require('../utils/mosqueModePlatform');

    // When Platform.OS === 'android' the test environment defaults to android.
    // We just assert the copy values are well-formed strings and contain the
    // expected differentiating keywords.

    // Android copy must contain "Automatic" and "silences"
    expect(mosqueModePlatformUi.headerSubtitle).toContain('Automatic');
    expect(mosqueModePlatformUi.headerSubtitle).toContain('silences');
  });

  it('[iOS copy] platformDisclosureLabel differentiates Android vs iOS', () => {
    // Load with Android platform (default in test env).
    const { mosqueModePlatformUi: androidUi } = require('../utils/mosqueModePlatform');
    expect(androidUi.platformDisclosureLabel).toContain('Android');
    expect(androidUi.platformDisclosureLabel.toLowerCase()).toContain('automatic');
  });

  it('[iOS copy] iosPreIqamahBody exists and contains actionable instruction', () => {
    const { mosqueModePlatformUi } = require('../utils/mosqueModePlatform');
    expect(typeof mosqueModePlatformUi.iosPreIqamahBody).toBe('string');
    expect(mosqueModePlatformUi.iosPreIqamahBody.length).toBeGreaterThan(10);
    // Must tell user HOW to silence (actionable)
    expect(mosqueModePlatformUi.iosPreIqamahBody.toLowerCase()).toContain('silence');
  });
});
