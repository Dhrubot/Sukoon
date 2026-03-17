describe('LiveActivityService', () => {
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
    platformOS?: 'ios' | 'android' | 'web';
    liveActivityEnabled?: boolean;
    iosBridge?: Record<string, jest.Mock> | null;
    androidBridge?: Record<string, jest.Mock> | null;
    storeState?: Record<string, unknown>;
  }) {
    const defaultBridge = {
      startLiveActivity: jest.fn(async () => {}),
      updateLiveActivity: jest.fn(async () => {}),
      endLiveActivity: jest.fn(async () => {}),
    };
    const iosBridge = options?.iosBridge === null ? null : {
      ...defaultBridge,
      ...options?.iosBridge,
    };
    const androidBridge = options?.androidBridge === null ? null : {
      ...defaultBridge,
      ...options?.androidBridge,
    };

    const defaultState = {
      todayPrayerTimes: [
        { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
        { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: true },
        { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
      ],
      todayPrayerRecords: [],
      nextPrayer: { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: true },
    };

    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'ios' },
      NativeModules: {
        SukoonLiveActivityBridge: iosBridge,
        LiveActivityModule: androidBridge,
      },
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => ({
          notifications: {
            liveActivityEnabled: options?.liveActivityEnabled ?? true,
          },
        })),
      },
    }));
    jest.doMock('../store/useStore', () => ({
      useStore: {
        getState: jest.fn(() => ({
          ...defaultState,
          ...options?.storeState,
        })),
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/LiveActivityService').default;
    return { service, bridges: { iosBridge, androidBridge } };
  }

  it('starts and updates the live activity when enabled and payload data exists', async () => {
    const { service, bridges } = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];

    await service.update(prayerTimes, [], prayerTimes[1]);
    expect(bridges.iosBridge?.startLiveActivity).toHaveBeenCalledTimes(1);

    await service.update(
      prayerTimes,
      [{ prayer: 'Dhuhr', status: 'prayed', date: '2026-03-18' }],
      prayerTimes[1]
    );
    expect(bridges.iosBridge?.updateLiveActivity).toHaveBeenCalledTimes(1);
  });

  it('ends the live activity when disabled or when no payload can be built', async () => {
    const enabled = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: true },
    ];

    await enabled.service.update(prayerTimes, [], prayerTimes[0]);
    await enabled.service.update([], [], null);
    expect(enabled.bridges.iosBridge?.endLiveActivity).toHaveBeenCalledTimes(1);

    const disabled = loadService({ platformOS: 'ios', liveActivityEnabled: false });
    await disabled.service.update(prayerTimes, [], prayerTimes[0]);
    expect(disabled.bridges.iosBridge?.startLiveActivity).not.toHaveBeenCalled();
  });

  it('starts from current store data and handles missing bridges gracefully', async () => {
    const ios = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    await ios.service.startWithCurrentData();
    expect(ios.bridges.iosBridge?.startLiveActivity).toHaveBeenCalledTimes(1);

    const missingBridge = loadService({ platformOS: 'web', liveActivityEnabled: true });
    await expect(missingBridge.service.startWithCurrentData()).resolves.toBeUndefined();
    await expect(missingBridge.service.end()).resolves.toBeUndefined();
  });

  it('uses the Android bridge on Android', async () => {
    const { service, bridges } = loadService({ platformOS: 'android', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: true },
    ];

    await service.update(prayerTimes, [], prayerTimes[1]);
    expect(bridges.androidBridge?.startLiveActivity).toHaveBeenCalledTimes(1);
  });
});
