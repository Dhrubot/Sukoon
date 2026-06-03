describe('moonSighting utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T19:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadModule(options?: {
    raw?: { month: number; day: number; year: number; monthNameEn: string };
    adjusted?: { month: number; day: number; year: number; monthNameEn: string };
    storage?: Record<string, string>;
  }) {
    jest.resetModules();

    const values = new Map(Object.entries(options?.storage ?? {}));
    const getValue = jest.fn((key: string) => values.get(key) ?? null);
    const setValue = jest.fn((key: string, value: string) => {
      values.set(key, value);
    });

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: { getValue, setValue },
    }));
    jest.doMock('../utils/ramadan', () => ({
      getRawCachedHijriDate: jest.fn(() => options?.raw ?? null),
      getCachedHijriDate: jest.fn(() => options?.adjusted ?? options?.raw ?? null),
      getCurrentHijriAdjustment: jest.fn(() => 0),
    }));

    const module = require('../utils/moonSighting');
    return { ...module, values, mocks: { getValue, setValue } };
  }

  it('persists confirm/defer state and gates the moon-sighting prompt around Maghrib', () => {
    const raw = { month: 8, day: 29, year: 1447, monthNameEn: 'Shaaban' };
    const persisted = loadModule({ raw });

    persisted.confirmMoonSighting('ramadan', 1447);
    expect(persisted.values.get('moon_sighting_ramadan_1447')).toBe('confirmed');

    persisted.deferMoonSighting('eid_fitr', 1447);
    expect(persisted.values.get('moon_sighting_eid_fitr_1447')).toBe('deferred');

    persisted.acknowledgeHijriDate('ramadan', 1447);
    expect(persisted.values.get('hijri_date_confirmed_ramadan_1447')).toBe('true');
    expect(persisted.hasAcknowledgedHijriDate('ramadan', 1447)).toBe(true);

    const beforeMaghrib = loadModule({ raw });
    jest.setSystemTime(new Date('2026-03-18T17:30:00.000Z'));
    expect(beforeMaghrib.getMoonSightingEvent(new Date('2026-03-18T18:00:00.000Z'))).toBeNull();

    jest.setSystemTime(new Date('2026-03-18T19:30:00.000Z'));
    const afterMaghrib = beforeMaghrib.getMoonSightingEvent(new Date('2026-03-18T18:00:00.000Z'));
    expect(afterMaghrib).toMatchObject({
      type: 'ramadan',
      yesAdjustment: 1,
      noAdjustment: 0,
    });
  });

  it('auto-deduces end-of-month transitions and suppresses repeated confirmations', () => {
    const adjusted = { month: 9, day: 30, year: 1447, monthNameEn: 'Ramadan' };
    const { getAutoDeduceEndOfMonthEvent, values } = loadModule({ adjusted });

    expect(getAutoDeduceEndOfMonthEvent()).toMatchObject({
      type: 'eid_fitr',
      title: 'Tomorrow is Eid al-Fitr!',
    });
    expect(values.get('moon_sighting_eid_fitr_1447')).toBe('confirmed');

    const repeated = loadModule({
      adjusted,
      storage: { moon_sighting_eid_fitr_1447: 'confirmed' },
    });
    expect(repeated.getAutoDeduceEndOfMonthEvent()).toBeNull();
  });

  it('returns nudges only for critical periods and keeps moon-state separate', () => {
    const raw = { month: 10, day: 1, year: 1447, monthNameEn: 'Shawwal' };
    const fresh = loadModule({ raw });
    expect(fresh.getHijriNudgeEvent()).toMatchObject({
      type: 'eid_fitr',
      currentDay: 1,
    });
    fresh.finalizeHijriDateConfirmation(
      {
        type: 'eid_fitr',
        currentDay: 1,
        currentMonth: 'Shawwal',
        currentYear: 1447,
        monthNumber: 10,
      },
      -1
    );
    expect(fresh.values.get('hijri_date_confirmed_eid_fitr_1447')).toBe('true');
    expect(fresh.values.get('moon_sighting_eid_fitr_1447')).toBe('deferred');

    const deferred = loadModule({
      raw,
      storage: { moon_sighting_eid_fitr_1447: 'deferred' },
    });
    expect(deferred.getDeferredMoonSightingEvent()).toMatchObject({
      type: 'eid_fitr',
      yesAdjustment: 0,
      noAdjustment: -1,
    });

    const acknowledged = loadModule({
      raw,
      storage: { hijri_date_confirmed_eid_fitr_1447: 'true' },
    });
    expect(acknowledged.getHijriNudgeEvent()).toBeNull();

    const unrelated = loadModule({
      raw: { month: 2, day: 10, year: 1447, monthNameEn: 'Safar' },
    });
    expect(unrelated.getHijriNudgeEvent()).toBeNull();
    expect(unrelated.getMoonSightingEvent()).toBeNull();
  });

  it('supports re-evaluating the Eid prompt after a Ramadan date confirmation', () => {
    const adjusted = { month: 9, day: 29, year: 1447, monthNameEn: 'Ramadan' };
    const module = loadModule({ raw: adjusted, adjusted });

    expect(module.getHijriNudgeEvent()).toMatchObject({
      type: 'ramadan',
      currentDay: 29,
    });

    module.finalizeHijriDateConfirmation(
      {
        type: 'ramadan',
        currentDay: 29,
        currentMonth: 'Ramadan',
        currentYear: 1447,
        monthNumber: 9,
      },
      0
    );

    const followUp = loadModule({
      raw: adjusted,
      adjusted,
      storage: { hijri_date_confirmed_ramadan_1447: 'true' },
    });

    expect(followUp.getHijriNudgeEvent()).toBeNull();
    expect(followUp.getMoonSightingEvent(new Date('2026-03-18T18:00:00.000Z'))).toMatchObject({
      type: 'eid_fitr',
      yesAdjustment: 1,
      noAdjustment: 0,
    });
  });
});
