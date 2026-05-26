describe('FullAdhanScheduler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T06:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules the full adhan clip with the expected request code and resource', async () => {
    const scheduleAdhan = jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      NativeModules: {
        AdhanModule: {
          scheduleAdhan,
          cancelAllAdhans: jest.fn(async () => {}),
          cancelAdhan: jest.fn(async () => {}),
          stopAdhan: jest.fn(async () => {}),
          getExactAlarmStatus: jest.fn(async () => 'granted'),
        },
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const { scheduleAdhanAudio } = require('../services/notifications/FullAdhanScheduler');

    const prayerTime = new Date('2026-03-18T05:10:00.000Z');
    await scheduleAdhanAudio(prayerTime, 'Fajr', 'full', 'Fajr');

    expect(scheduleAdhan).toHaveBeenCalledWith(
      prayerTime.getTime(),
      'Fajr',
      5005,
      'adhan_full'
    );
  });

  it('schedules the short clip resource when clip is "short"', async () => {
    const scheduleAdhan = jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      NativeModules: {
        AdhanModule: {
          scheduleAdhan,
          cancelAllAdhans: jest.fn(async () => {}),
          cancelAdhan: jest.fn(async () => {}),
          stopAdhan: jest.fn(async () => {}),
          getExactAlarmStatus: jest.fn(async () => 'granted'),
        },
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const { scheduleAdhanAudio } = require('../services/notifications/FullAdhanScheduler');

    const prayerTime = new Date('2026-03-18T05:10:00.000Z');
    await scheduleAdhanAudio(prayerTime, 'Fajr', 'short', 'Fajr');

    expect(scheduleAdhan).toHaveBeenCalledWith(
      prayerTime.getTime(),
      'Fajr',
      5005,
      'adhan_short'
    );
  });

  it('no-ops on iOS', async () => {
    const scheduleAdhan = jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      NativeModules: { AdhanModule: { scheduleAdhan } },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const { scheduleAdhanAudio } = require('../services/notifications/FullAdhanScheduler');
    await scheduleAdhanAudio(new Date('2026-03-18T05:10:00.000Z'), 'Fajr', 'full', 'Fajr');

    expect(scheduleAdhan).not.toHaveBeenCalled();
  });

  it('maps unknown exact alarm values to unknown', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      NativeModules: {
        AdhanModule: {
          getExactAlarmStatus: jest.fn(async () => 'mystery'),
        },
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const { getExactAlarmStatus } = require('../services/notifications/FullAdhanScheduler');
    await expect(getExactAlarmStatus()).resolves.toBe('unknown');
  });

  it('cancels a single Android full adhan using the derived request code', async () => {
    const cancelAdhan = jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      NativeModules: {
        AdhanModule: {
          cancelAdhan,
          scheduleAdhan: jest.fn(async () => {}),
          cancelAllAdhans: jest.fn(async () => {}),
          stopAdhan: jest.fn(async () => {}),
          getExactAlarmStatus: jest.fn(async () => 'granted'),
        },
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const { cancelFullAdhan } = require('../services/notifications/FullAdhanScheduler');
    await cancelFullAdhan('Asr', new Date('2026-03-19T15:30:00.000Z'));

    expect(cancelAdhan).toHaveBeenCalledWith(5012);
  });
});
