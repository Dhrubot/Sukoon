describe('ramadan utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T09:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadRamadanModule(options?: {
    values?: Record<string, string | null>;
    localDateKey?: string;
  }) {
    jest.resetModules();

    const mockGetValue = jest.fn((key: string) => options?.values?.[key] ?? null);
    const mockSetValue = jest.fn();
    const mockGetLocalDateKey = jest.fn((date?: Date) =>
      date ? date.toISOString().slice(0, 10) : options?.localDateKey ?? '2026-03-17'
    );

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getValue: mockGetValue,
        setValue: mockSetValue,
      },
    }));
    jest.doMock('../utils/dateHelpers', () => ({
      getLocalDateKey: mockGetLocalDateKey,
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const ramadanModule = require('../utils/ramadan');

    return {
      ...ramadanModule,
      mockGetValue,
      mockSetValue,
      mockGetLocalDateKey,
    };
  }

  it('caches today hijri data and ignores prefetches for other dates', () => {
    const { cacheHijriDate, mockSetValue } = loadRamadanModule();

    cacheHijriDate(
      {
        day: '17',
        month: { number: 9, en: 'Ramadan', ar: 'رمضان' },
        year: '1447',
      },
      new Date('2026-03-17T05:00:00.000Z')
    );

    expect(mockSetValue).toHaveBeenCalledWith(
      'cached_hijri_date',
      JSON.stringify({
        day: 17,
        month: 9,
        monthNameEn: 'Ramadan',
        monthNameAr: 'رمضان',
        year: 1447,
        cachedFor: '2026-03-17',
      })
    );

    mockSetValue.mockClear();

    cacheHijriDate(
      {
        day: '18',
        month: { number: 9, en: 'Ramadan', ar: 'رمضان' },
        year: '1447',
      },
      new Date('2026-03-18T05:00:00.000Z')
    );

    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it('applies user adjustments when reading the cached hijri date and updates month rollover labels', () => {
    const { getCachedHijriDate } = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 30,
          month: 9,
          monthNameEn: 'Ramadan',
          monthNameAr: 'رمضان',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
        user_settings: JSON.stringify({ hijriAdjustment: 1 }),
      },
    });

    expect(getCachedHijriDate()).toEqual({
      day: 1,
      month: 10,
      monthNameEn: 'Shawwal',
      monthNameAr: 'رمضان',
      year: 1447,
      cachedFor: '2026-03-17',
    });
  });

  it('returns null for stale or invalid cached hijri payloads and exposes raw unadjusted data when valid', () => {
    const staleModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 2,
          month: 10,
          monthNameEn: 'Shawwal',
          monthNameAr: 'شوال',
          year: 1447,
          cachedFor: '2026-03-16',
        }),
      },
    });

    expect(staleModule.getCachedHijriDate()).toBeNull();
    expect(staleModule.getRawCachedHijriDate()).toBeNull();

    const invalidModule = loadRamadanModule({
      values: {
        cached_hijri_date: '{invalid-json',
        user_settings: '{invalid-json',
      },
    });

    expect(invalidModule.getCachedHijriDate()).toBeNull();

    const freshModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 10,
          month: 12,
          monthNameEn: 'Dhul Hijjah',
          monthNameAr: 'ذو الحجة',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
        user_settings: JSON.stringify({ hijriAdjustment: 0 }),
      },
    });

    expect(freshModule.getRawCachedHijriDate()).toEqual({
      day: 10,
      month: 12,
      monthNameEn: 'Dhul Hijjah',
      monthNameAr: 'ذو الحجة',
      year: 1447,
      cachedFor: '2026-03-17',
    });
  });

  it('reports Ramadan, Eid, and Tashreeq helpers from the adjusted cached date', () => {
    const ramadanModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 1,
          month: 9,
          monthNameEn: 'Ramadan',
          monthNameAr: 'رمضان',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
        user_settings: JSON.stringify({ hijriAdjustment: 0 }),
      },
    });

    expect(ramadanModule.isRamadan()).toBe(true);
    expect(ramadanModule.getRamadanDay()).toBe(1);
    expect(ramadanModule.isEidDay()).toBe(false);

    const fitrModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 1,
          month: 10,
          monthNameEn: 'Shawwal',
          monthNameAr: 'شوال',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
      },
    });

    expect(fitrModule.isEidAlFitr()).toBe(true);
    expect(fitrModule.isEidDay()).toBe(true);
    expect(fitrModule.getEidName()).toBe('Eid al-Fitr');

    const tashreeqModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 12,
          month: 12,
          monthNameEn: 'Dhul Hijjah',
          monthNameAr: 'ذو الحجة',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
      },
    });

    expect(tashreeqModule.isEidAlAdha()).toBe(false);
    expect(tashreeqModule.isTashreeqDays()).toBe(true);
    expect(tashreeqModule.getTashreeqDayLabel()).toBe('Ayyam al-Tashreeq (Day 2)');

    const adhaModule = loadRamadanModule({
      values: {
        cached_hijri_date: JSON.stringify({
          day: 10,
          month: 12,
          monthNameEn: 'Dhul Hijjah',
          monthNameAr: 'ذو الحجة',
          year: 1447,
          cachedFor: '2026-03-17',
        }),
      },
    });

    expect(adhaModule.isEidAlAdha()).toBe(true);
    expect(adhaModule.getEidName()).toBe('Eid al-Adha');
  });

  it('uses the current weekday when checking Friday', () => {
    const { isFriday } = loadRamadanModule();

    expect(isFriday()).toBe(true);

    jest.setSystemTime(new Date('2026-03-19T09:00:00.000Z'));
    expect(isFriday()).toBe(false);
  });
});
