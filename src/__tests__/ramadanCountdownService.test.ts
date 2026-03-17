describe('RamadanCountdownService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadService(options?: {
    platformOS?: 'android' | 'ios';
    hijri?: { month: number; day: number } | null;
    isRamadan?: boolean;
    lastScheduled?: string | null;
    scheduledNotifications?: Array<{ identifier: string }>;
  }) {
    const scheduleNotificationAsync = jest.fn(async () => 'scheduled-id');
    const cancelScheduledNotificationAsync = jest.fn(async () => {});
    const scheduledNotifications = options?.scheduledNotifications ?? [];
    const getAllScheduledNotificationsAsync = jest.fn(async () => scheduledNotifications);
    const setValue = jest.fn();
    const getValue = jest.fn((key: string) =>
      key === 'ramadan_countdown_last_scheduled' ? options?.lastScheduled ?? null : null
    );

    jest.doMock('expo-notifications', () => ({
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync,
      getAllScheduledNotificationsAsync,
    }));
    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue,
        setValue,
      },
    }));
    jest.doMock('../utils/ramadan', () => ({
      getCachedHijriDate: jest.fn(() =>
        options?.hijri
          ? {
              day: options.hijri.day,
              month: options.hijri.month,
              monthNameEn: 'Shaban',
              monthNameAr: 'شعبان',
              year: 1447,
              cachedFor: '2026-03-18',
            }
          : null
      ),
      isRamadan: jest.fn(() => options?.isRamadan ?? false),
    }));
    jest.doMock('../utils/dateHelpers', () => ({
      getLocalDateKey: jest.fn(() => '2026-03-18'),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/RamadanCountdownService').default;
    return {
      service,
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync,
      getAllScheduledNotificationsAsync,
      setValue,
      getValue,
    };
  }

  it('skips scheduling when there is no cached hijri date', async () => {
    const { service, scheduleNotificationAsync, setValue } = loadService({
      hijri: null,
    });

    await service.scheduleRamadanNotifications();

    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
  });

  it('schedules countdown notifications before Ramadan and cancels prior Ramadan entries first', async () => {
    const { service, scheduleNotificationAsync, cancelScheduledNotificationAsync, setValue } =
      loadService({
        platformOS: 'android',
        hijri: { month: 8, day: 28 },
        isRamadan: false,
        scheduledNotifications: [
          { identifier: 'ramadan-countdown-old-1' },
          { identifier: 'other-notification' },
          { identifier: 'ramadan-countdown-old-2' },
        ],
      });

    await service.scheduleRamadanNotifications();

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('ramadan-countdown-old-1');
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('ramadan-countdown-old-2');
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
      identifier: 'ramadan-countdown-2',
      content: {
        data: { type: 'ramadan-countdown', daysAway: 2 },
      },
    });
    expect(scheduleNotificationAsync.mock.calls[1][0]).toMatchObject({
      identifier: 'ramadan-countdown-1',
      content: {
        data: { type: 'ramadan-countdown', daysAway: 1 },
      },
    });
    expect(setValue).toHaveBeenCalledWith('ramadan_countdown_last_scheduled', '2026-03-18');
  });

  it('skips scheduling when Ramadan is too far away or already scheduled today', async () => {
    const tooFar = loadService({
      platformOS: 'android',
      hijri: { month: 1, day: 1 },
      isRamadan: false,
    });

    await tooFar.service.scheduleRamadanNotifications();
    expect(tooFar.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(tooFar.setValue).toHaveBeenCalledWith('ramadan_countdown_last_scheduled', '2026-03-18');

    const alreadyScheduled = loadService({
      platformOS: 'android',
      hijri: { month: 8, day: 28 },
      isRamadan: false,
      lastScheduled: '2026-03-18',
    });

    await alreadyScheduled.service.scheduleRamadanNotifications();
    expect(alreadyScheduled.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(alreadyScheduled.setValue).not.toHaveBeenCalled();
  });

  it('stops daily Ramadan scheduling on iOS when the notification cap is reached', async () => {
    const capEntries = Array.from({ length: 80 }, (_, index) => ({
      identifier: `existing-${index}`,
    }));
    const { service, scheduleNotificationAsync, getAllScheduledNotificationsAsync, setValue } =
      loadService({
        platformOS: 'ios',
        hijri: { month: 9, day: 29 },
        isRamadan: true,
        scheduledNotifications: [],
      });

    getAllScheduledNotificationsAsync
      .mockResolvedValueOnce([{ identifier: 'ramadan-countdown-old' }])
      .mockResolvedValue(capEntries);

    await service.scheduleRamadanNotifications();

    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(setValue).toHaveBeenCalledWith('ramadan_countdown_last_scheduled', '2026-03-18');
  });
});
