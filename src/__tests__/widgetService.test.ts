describe('WidgetService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T15:20:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadService() {
    const widgetBridge = {
      setWidgetData: jest.fn(async () => {}),
      reloadWidgets: jest.fn(async () => {}),
    };

    jest.doMock('react-native', () => ({
      Appearance: { getColorScheme: jest.fn(() => 'dark') },
      NativeModules: { SukoonWidgetBridge: widgetBridge },
      Platform: { OS: 'ios' },
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings: jest.fn(() => ({ theme: 'dark' })),
        getCurrentDawam: jest.fn(() => 3),
        getDayPrayerRecords: jest.fn(() => []),
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
          todayPrayerTimes: [],
          nextPrayer: null,
          todayPrayerRecords: [],
          tomorrowFajr: null,
          todaySunrise: null,
        })),
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/WidgetService').default;
    return { service, widgetBridge };
  }

  it('uses centralized surface semantics for active unprayed windows', async () => {
    const { service, widgetBridge } = loadService();
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T09:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];

    await service.updateWidgetData(
      prayerTimes,
      [],
      prayerTimes[1],
      { name: 'Fajr', time: new Date('2026-03-19T05:00:00.000Z'), isNext: false },
      new Date('2026-03-18T06:10:00.000Z'),
    );

    const payload = JSON.parse(widgetBridge.setWidgetData.mock.calls[0][0]);
    expect(payload.surface).toMatchObject({
      activePrayerName: 'Dhuhr',
      displayPrayerName: 'Dhuhr',
      heroGradientPrayerName: 'Dhuhr',
      ringAccentPrayerName: 'Dhuhr',
      ringColorMode: 'prayer',
      countdownTargetName: 'Asr',
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
    expect(payload.prayers.map((prayer: { status: string }) => prayer.status)).toEqual([
      'missed',
      'current',
      'upcoming',
    ]);
    expect(payload.supportiveLine).toBe('Return with the next prayer');
  });

  it('uses centralized surface semantics after the active prayer is logged', async () => {
    const { service, widgetBridge } = loadService();
    const prayerTimes = [
      { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), isNext: false },
      { name: 'Dhuhr', time: new Date('2026-03-18T09:30:00.000Z'), isNext: true },
      { name: 'Asr', time: new Date('2026-03-18T15:45:00.000Z'), isNext: false },
    ];

    await service.updateWidgetData(
      prayerTimes,
      [{ id: '1', prayer: 'Dhuhr', status: 'prayed', date: '2026-03-18' }],
      prayerTimes[1],
      { name: 'Fajr', time: new Date('2026-03-19T05:00:00.000Z'), isNext: false },
      new Date('2026-03-18T06:10:00.000Z'),
    );

    const payload = JSON.parse(widgetBridge.setWidgetData.mock.calls[0][0]);
    expect(payload.surface).toMatchObject({
      activePrayerName: 'Dhuhr',
      displayPrayerName: 'Asr',
      heroGradientPrayerName: 'Dhuhr',
      ringAccentPrayerName: 'Asr',
      ringColorMode: 'prayer',
      countdownTargetName: 'Asr',
      phase: 'prayed',
      countdownMode: 'next_prayer_start',
    });
    expect(payload.nextPrayer).toMatchObject({
      name: 'Asr',
      timeISO: '2026-03-18T15:45:00.000Z',
      remainingMinutes: 25,
    });
    expect(payload.supportiveLine).toBe('Prepare for the next salah');
  });
});
