describe('JummahNotificationService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T06:30:00.000Z'));
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function loadService(options?: {
    platformOS?: 'android' | 'ios';
    isFriday?: boolean;
    remindersEnabled?: boolean;
    lastScheduled?: string | null;
    scheduled?: Array<{ identifier: string }>;
  }) {
    const scheduleNotificationAsync = jest.fn(async () => 'scheduled-id');
    const cancelScheduledNotificationAsync = jest.fn(async () => {});
    const getAllScheduledNotificationsAsync = jest.fn(async () => options?.scheduled ?? []);
    const setValue = jest.fn();
    const getValue = jest.fn((key: string) => (
      key === 'jummah_last_scheduled' ? (options?.lastScheduled ?? null) : null
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
        getUserSettings: jest.fn(() => ({
          jummahReminders: {
            enabled: options?.remindersEnabled ?? true,
          },
        })),
        getValue,
        setValue,
      },
    }));
    jest.doMock('../utils/ramadan', () => ({
      isFriday: jest.fn(() => options?.isFriday ?? true),
    }));
    jest.doMock('../utils/dateHelpers', () => ({
      getLocalDateKey: jest.fn(() => '2026-03-20'),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/JummahNotificationService').default;
    return {
      service,
      mocks: {
        scheduleNotificationAsync,
        cancelScheduledNotificationAsync,
        getAllScheduledNotificationsAsync,
        setValue,
      },
    };
  }

  const prayers = [
    { name: 'Fajr', time: new Date('2026-03-20T05:00:00.000Z'), isNext: false },
    { name: 'Dhuhr', time: new Date('2026-03-20T13:00:00.000Z'), isNext: true },
    { name: 'Maghrib', time: new Date('2026-03-20T18:00:00.000Z'), isNext: false },
  ];

  it('schedules the Friday reminder set and removes stale Jummah notifications first', async () => {
    const { service, mocks } = loadService({
      platformOS: 'android',
      scheduled: [
        { identifier: 'jummah-old-1' },
        { identifier: 'another-id' },
      ],
    });

    await service.scheduleJummahNotifications(prayers);

    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('jummah-old-1');
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(4);

    const identifiers = mocks.scheduleNotificationAsync.mock.calls.map(
      ([request]: [{ identifier: string }]) => request.identifier
    );
    expect(identifiers).toEqual([
      'jummah-morning-2026-03-20',
      'jummah-preparation-2026-03-20',
      'jummah-prayer-2026-03-20',
      'jummah-dua-2026-03-20',
    ]);
    expect(mocks.setValue).toHaveBeenCalledWith('jummah_last_scheduled', '2026-03-20');
  });

  it('skips scheduling when Friday reminders are disabled, already scheduled, or it is not Friday', async () => {
    const disabled = loadService({ remindersEnabled: false });
    await disabled.service.scheduleJummahNotifications(prayers);
    expect(disabled.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();

    const alreadyScheduled = loadService({ lastScheduled: '2026-03-20' });
    await alreadyScheduled.service.scheduleJummahNotifications(prayers);
    expect(alreadyScheduled.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();

    const weekday = loadService({ isFriday: false });
    await weekday.service.scheduleJummahNotifications(prayers);
    expect(weekday.mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('respects the iOS notification cap for Friday reminders', async () => {
    const { service, mocks } = loadService({
      platformOS: 'ios',
      scheduled: Array.from({ length: 58 }, (_, index) => ({ identifier: `existing-${index}` })),
    });

    await service.scheduleJummahNotifications(prayers);

    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocks.setValue).toHaveBeenCalledWith('jummah_last_scheduled', '2026-03-20');
  });
});
