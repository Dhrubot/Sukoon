describe('EidNotificationService', () => {
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
    hijri?: { month: number; day: number; year: number; monthNameEn: string };
    isRamadan?: boolean;
    ramadanDay?: number | null;
    lastScheduled?: string | null;
    scheduled?: Array<{ identifier: string }>;
  }) {
    const scheduled = options?.scheduled ?? [];
    const scheduleNotificationAsync = jest.fn(async () => 'scheduled-id');
    const cancelScheduledNotificationAsync = jest.fn(async () => {});
    const getAllScheduledNotificationsAsync = jest.fn(async () => scheduled);
    const setValue = jest.fn();
    const getValue = jest.fn((key: string) => (
      key === 'eid_notif_last_scheduled' ? (options?.lastScheduled ?? null) : null
    ));

    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
    }));
    jest.doMock('expo-notifications', () => ({
      scheduleNotificationAsync,
      cancelScheduledNotificationAsync,
      getAllScheduledNotificationsAsync,
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue,
        setValue,
      },
    }));
    jest.doMock('../utils/ramadan', () => ({
      getCachedHijriDate: jest.fn(() => options?.hijri ?? null),
      isRamadan: jest.fn(() => options?.isRamadan ?? false),
      getRamadanDay: jest.fn(() => options?.ramadanDay ?? null),
    }));
    jest.doMock('../utils/dateHelpers', () => ({
      getLocalDateKey: jest.fn(() => '2026-03-18'),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/EidNotificationService').default;
    return {
      service,
      mocks: {
        scheduleNotificationAsync,
        cancelScheduledNotificationAsync,
        getAllScheduledNotificationsAsync,
        getValue,
        setValue,
      },
    };
  }

  it('schedules late-Ramadan Eid al-Fitr notifications and clears stale Eid entries first', async () => {
    const { service, mocks } = loadService({
      platformOS: 'android',
      hijri: { month: 9, day: 29, year: 1447, monthNameEn: 'Ramadan' },
      isRamadan: true,
      ramadanDay: 29,
      scheduled: [
        { identifier: 'eid-old-fit' },
        { identifier: 'unrelated-notification' },
      ],
    });

    await service.scheduleEidNotifications();

    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('eid-old-fit');
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(2);

    const identifiers = mocks.scheduleNotificationAsync.mock.calls.map(
      ([request]: [{ identifier: string }]) => request.identifier
    );
    expect(identifiers).toEqual(['eid-fitr-eve', 'eid-fitr-morning']);
    expect(mocks.setValue).toHaveBeenCalledWith('eid_notif_last_scheduled', '2026-03-18');
  });

  it('respects the iOS notification cap for Eid and Takbirat scheduling', async () => {
    const { service, mocks } = loadService({
      platformOS: 'ios',
      hijri: { month: 12, day: 9, year: 1447, monthNameEn: 'Dhul Hijjah' },
      isRamadan: false,
      scheduled: Array.from({ length: 58 }, (_, index) => ({ identifier: `existing-${index}` })),
    });

    await service.scheduleEidNotifications();

    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocks.setValue).toHaveBeenCalledWith('eid_notif_last_scheduled', '2026-03-18');
  });

  it('skips duplicate daily scheduling and no-ops when Hijri data is unavailable', async () => {
    const alreadyScheduled = loadService({
      lastScheduled: '2026-03-18',
      hijri: { month: 9, day: 28, year: 1447, monthNameEn: 'Ramadan' },
      isRamadan: true,
      ramadanDay: 28,
    });

    await alreadyScheduled.service.scheduleEidNotifications();
    expect(alreadyScheduled.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(alreadyScheduled.mocks.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    const missingHijri = loadService();
    await missingHijri.service.scheduleEidNotifications();
    expect(missingHijri.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(missingHijri.mocks.setValue).not.toHaveBeenCalled();
  });
});
