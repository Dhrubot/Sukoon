jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('hijriDate', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 17, 9, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses edge hijri data, applies user adjustment, and then serves from memory cache', async () => {
    const fetchHijriDateFromEdge = jest.fn(async () => ({
      day: 1,
      month: 9,
      monthName: 'Ramadan',
      monthNameAr: 'رمضان',
      year: 1447,
    }));
    const cacheHijriDate = jest.fn();

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue: jest.fn((key: string) =>
          key === 'user_settings' ? JSON.stringify({ hijriAdjustment: 1 }) : null
        ),
      },
    }));
    jest.doMock('../services/api/EdgeApiClient', () => ({
      fetchHijriDateFromEdge,
    }));
    jest.doMock('../utils/ramadan', () => ({
      cacheHijriDate,
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout: jest.fn(),
    }));

    const { getHijriDate, getLastHijriSource, formatHijriDate } = require('../utils/hijriDate');

    await expect(getHijriDate(new Date(2026, 2, 17))).resolves.toEqual({
      day: 2,
      month: 9,
      monthName: 'Ramadan',
      year: 1447,
    });
    expect(getLastHijriSource()).toBe('edge');
    expect(cacheHijriDate).toHaveBeenCalledTimes(1);

    await expect(formatHijriDate(new Date(2026, 2, 17))).resolves.toBe('2 Ramadan 1447');
    expect(fetchHijriDateFromEdge).toHaveBeenCalledTimes(1);
    expect(getLastHijriSource()).toBe('memory_cache');
  });

  it('falls back to the direct API when edge hijri lookup fails', async () => {
    const fetchWithTimeout = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          hijri: {
            day: '15',
            month: { number: '8', en: "Sha'ban", ar: 'شعبان' },
            year: '1447',
          },
        },
      }),
    }));

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue: jest.fn(() => null),
      },
    }));
    jest.doMock('../services/api/EdgeApiClient', () => ({
      fetchHijriDateFromEdge: jest.fn(async () => {
        throw new Error('edge offline');
      }),
    }));
    jest.doMock('../utils/ramadan', () => ({
      cacheHijriDate: jest.fn(),
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout,
    }));

    const { getHijriDate, getLastHijriSource } = require('../utils/hijriDate');
    const result = await getHijriDate(new Date(2026, 1, 3));

    expect(result).toEqual({
      day: 15,
      month: 8,
      monthName: "Sha'ban",
      year: 1447,
    });
    expect(getLastHijriSource()).toBe('direct');
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it('falls back algorithmically when all network sources fail and sync formatting reuses cached results', async () => {
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue: jest.fn((key: string) =>
          key === 'user_settings' ? JSON.stringify({ hijriAdjustment: -1 }) : null
        ),
      },
    }));
    jest.doMock('../services/api/EdgeApiClient', () => ({
      fetchHijriDateFromEdge: jest.fn(async () => {
        throw new Error('edge offline');
      }),
    }));
    jest.doMock('../utils/ramadan', () => ({
      cacheHijriDate: jest.fn(),
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout: jest.fn(async () => {
        throw new Error('direct offline');
      }),
    }));

    const { getHijriDate, getLastHijriSource, formatHijriDateSync } = require('../utils/hijriDate');
    const result = await getHijriDate(new Date(2026, 2, 17));

    expect(result.monthName).toBeTruthy();
    expect(getLastHijriSource()).toBe('algorithmic_fallback');
    expect(formatHijriDateSync(new Date(2026, 2, 17))).toBe(
      `${result.day} ${result.monthName} ${result.year}`
    );
  });
});
