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
      tomorrowFajr: { name: 'Fajr', time: new Date('2026-03-19T05:00:00.000Z'), isNext: false },
      todaySunrise: new Date('2026-03-18T06:10:00.000Z'),
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
    jest.doMock('../utils/ramadan', () => ({
      getCachedHijriDate: jest.fn(() => ({
        day: 18,
        monthNameEn: 'Shawwal',
        monthNameAr: 'شوال',
        year: 1447,
      })),
    }));
    jest.doMock('../utils/hijriDate', () => ({
      formatHijriDateSync: jest.fn(() => '18 Shawwal 1447'),
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
    const startPayload = JSON.parse(bridges.iosBridge?.startLiveActivity.mock.calls[0][0]);
    expect(startPayload).toMatchObject({
      prayerName: 'Dhuhr',
      prayerArabicName: 'الظهر',
      activePrayerName: 'Dhuhr',
      hijriShortLabel: '18 Shawwal 1447',
      countdownTargetISO: '2026-03-18T12:30:00.000Z',
      countdownTargetPrayerName: 'Dhuhr',
      phase: 'pre_adhan',
      countdownMode: 'next_prayer_start',
    });
    expect(startPayload.progress).toBeGreaterThan(0.66);
    expect(startPayload.progress).toBeLessThan(0.67);

    const activeWindowPrayers = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T09:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];
    await service.update(
      activeWindowPrayers,
      [{ prayer: 'Dhuhr', status: 'prayed', date: '2026-03-18' }],
      activeWindowPrayers[1]
    );
    expect(bridges.iosBridge?.updateLiveActivity).toHaveBeenCalledTimes(1);
    const updatePayload = JSON.parse(bridges.iosBridge?.updateLiveActivity.mock.calls[0][0]);
    expect(updatePayload).toMatchObject({
      prayerName: 'Asr',
      activePrayerName: 'Dhuhr',
      countdownTargetISO: '2026-03-18T15:45:00.000Z',
      countdownTargetPrayerName: 'Asr',
      phase: 'prayed',
      countdownMode: 'next_prayer_start',
    });
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
    const payload = JSON.parse(bridges.androidBridge?.startLiveActivity.mock.calls[0][0]);
    expect(payload).toMatchObject({
      prayerArabicName: 'الظهر',
      activePrayerName: 'Dhuhr',
      hijriShortLabel: '18 Shawwal 1447',
      countdownTargetPrayerName: 'Dhuhr',
    });
  });

  it('uses the active prayer focus during fiqh windows until the 15 minute handoff', async () => {
    const { service, bridges } = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T09:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];
    const activePrayer = prayerTimes[1];

    await service.update(prayerTimes, [], activePrayer, prayerTimes[2]);

    const payload = JSON.parse(bridges.iosBridge?.startLiveActivity.mock.calls[0][0]);
    expect(payload).toMatchObject({
      prayerName: 'Dhuhr',
      activePrayerName: 'Dhuhr',
      countdownTargetPrayerName: 'Asr',
      countdownTargetISO: '2026-03-18T15:45:00.000Z',
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
    expect(payload.progress).toBeGreaterThan(0);
    expect(payload.progress).toBeLessThan(1);
  });

  it('switches the display prayer during the 15 minute handoff while keeping active actions bound to the current prayer', async () => {
    const { service, bridges } = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T09:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T10:12:00.000Z'), isNext: false },
    ];

    await service.update(prayerTimes, [], prayerTimes[1], prayerTimes[2]);

    const payload = JSON.parse(bridges.iosBridge?.startLiveActivity.mock.calls[0][0]);
    expect(payload).toMatchObject({
      prayerName: 'Asr',
      activePrayerName: 'Dhuhr',
      countdownTargetPrayerName: 'Asr',
      countdownTargetISO: '2026-03-18T10:12:00.000Z',
      phase: 'fiqh_window',
      countdownMode: 'next_prayer_start',
    });
    expect(payload.progress).toBeGreaterThan(0.71);
    expect(payload.progress).toBeLessThan(0.72);
  });

  it('uses tomorrow Fajr when starting from current store data overnight', async () => {
    const { service, bridges } = loadService({
      platformOS: 'ios',
      liveActivityEnabled: true,
      storeState: {
        todayPrayerTimes: [
          { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
          { name: 'Dhuhr', time: new Date('2026-03-18T12:30:00.000Z'), isNext: false },
          { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
          { name: 'Maghrib', time: new Date('2026-03-18T18:00:00.000Z'), isNext: false },
          { name: 'Isha', time: new Date('2026-03-18T19:30:00.000Z'), isNext: true },
        ],
        nextPrayer: { name: 'Isha', time: new Date('2026-03-18T19:30:00.000Z'), isNext: true },
        tomorrowFajr: { name: 'Fajr', time: new Date('2026-03-19T05:05:00.000Z'), isNext: false },
      },
    });

    jest.setSystemTime(new Date('2026-03-18T23:00:00.000Z'));
    await service.startWithCurrentData();

    const payload = JSON.parse(bridges.iosBridge?.startLiveActivity.mock.calls[0][0]);
    expect(payload).toMatchObject({
      prayerName: 'Isha',
      activePrayerName: 'Isha',
      countdownTargetPrayerName: 'Fajr',
      countdownTargetISO: '2026-03-19T05:05:00.000Z',
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
  });

  it('uses sunrise as the Fajr countdown target until Fajr is logged', async () => {
    const { service, bridges } = loadService({ platformOS: 'ios', liveActivityEnabled: true });
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: true },
      { name: 'Dhuhr', time: new Date('2026-03-18T12:02:00.000Z'), isNext: false },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];
    jest.setSystemTime(new Date('2026-03-18T05:27:00.000Z'));

    await service.update(
      prayerTimes,
      [],
      prayerTimes[0],
      { name: 'Fajr', time: new Date('2026-03-19T05:00:00.000Z'), isNext: false },
      new Date('2026-03-18T06:10:00.000Z'),
    );

    const payload = JSON.parse(bridges.iosBridge?.startLiveActivity.mock.calls[0][0]);
    expect(payload).toMatchObject({
      prayerName: 'Fajr',
      activePrayerName: 'Fajr',
      countdownTargetPrayerName: 'Sunrise',
      countdownTargetISO: '2026-03-18T06:10:00.000Z',
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
  });
});
