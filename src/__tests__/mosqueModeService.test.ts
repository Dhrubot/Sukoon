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

    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
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

  it('schedules one iOS mosque reminder in auto mode and respects the iOS notification cap', async () => {
    const ios = loadService({
      platformOS: 'ios',
      scheduledCount: 0,
    });
    await ios.service.scheduleUpcomingMosqueModes([samplePrayer]);
    expect(ios.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(ios.mocks.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
      identifier: 'mosque-reminder-Dhuhr-2026-03-18',
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
    expect(iosAuto.mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
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
});
