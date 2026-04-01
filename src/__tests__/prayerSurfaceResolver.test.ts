import { resolvePrayerSurfaceState } from '../utils/prayerSurfaceResolver';
import { PrayerTime } from '../types';

const prayerTimes: PrayerTime[] = [
  { name: 'Fajr', time: new Date('2026-03-18T05:00:00.000Z'), timestamp: new Date('2026-03-18T05:00:00.000Z').getTime() },
  { name: 'Dhuhr', time: new Date('2026-03-18T12:00:00.000Z'), timestamp: new Date('2026-03-18T12:00:00.000Z').getTime() },
  { name: 'Asr', time: new Date('2026-03-18T15:30:00.000Z'), timestamp: new Date('2026-03-18T15:30:00.000Z').getTime() },
  { name: 'Maghrib', time: new Date('2026-03-18T18:00:00.000Z'), timestamp: new Date('2026-03-18T18:00:00.000Z').getTime() },
  { name: 'Isha', time: new Date('2026-03-18T19:30:00.000Z'), timestamp: new Date('2026-03-18T19:30:00.000Z').getTime() },
];

const tomorrowFajr: PrayerTime = {
  name: 'Fajr',
  time: new Date('2026-03-19T05:05:00.000Z'),
  timestamp: new Date('2026-03-19T05:05:00.000Z').getTime(),
};

const sunrise = new Date('2026-03-18T06:10:00.000Z');

describe('resolvePrayerSurfaceState', () => {
  it('uses the upcoming prayer before adhan', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [],
      prayerTimes[1],
      tomorrowFajr,
      new Date('2026-03-18T10:00:00.000Z'),
    );

    expect(state).toMatchObject({
      phase: 'pre_adhan',
      countdownMode: 'next_prayer_start',
      prayerStatuses: ['missed', 'next', 'upcoming', 'upcoming', 'upcoming'],
    });
    expect(state?.displayPrayer.name).toBe('Dhuhr');
    expect(state?.countdownTarget.name).toBe('Dhuhr');
    expect(state?.progress).toBeGreaterThan(0.7);
    expect(state?.progress).toBeLessThan(0.72);
  });

  it('keeps focus on the active prayer when more than 15 minutes remain', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [],
      prayerTimes[1],
      tomorrowFajr,
      new Date('2026-03-18T13:00:00.000Z'),
    );

    expect(state).toMatchObject({
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
    expect(state?.activePrayer.name).toBe('Dhuhr');
    expect(state?.displayPrayer.name).toBe('Dhuhr');
    expect(state?.countdownTarget.name).toBe('Asr');
    expect(state?.progress).toBeGreaterThan(0.28);
    expect(state?.progress).toBeLessThan(0.29);
  });

  it('switches focus to the next prayer during the 15 minute handoff', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [],
      prayerTimes[1],
      tomorrowFajr,
      new Date('2026-03-18T15:20:00.000Z'),
    );

    expect(state).toMatchObject({
      phase: 'fiqh_window',
      countdownMode: 'next_prayer_start',
    });
    expect(state?.activePrayer.name).toBe('Dhuhr');
    expect(state?.displayPrayer.name).toBe('Asr');
    expect(state?.countdownTarget.name).toBe('Asr');
    expect(state?.prayerStatuses[1]).toBe('upcoming');
    expect(state?.prayerStatuses[2]).toBe('next');
    expect(state?.progress).toBeGreaterThan(0.95);
    expect(state?.progress).toBeLessThan(0.96);
  });

  it('switches to the next prayer after the active prayer is logged', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [{ id: '1', prayer: 'Dhuhr', status: 'prayed', date: '2026-03-18' }],
      prayerTimes[1],
      tomorrowFajr,
      new Date('2026-03-18T13:00:00.000Z'),
    );

    expect(state).toMatchObject({
      phase: 'prayed',
      countdownMode: 'next_prayer_start',
    });
    expect(state?.activePrayer.name).toBe('Dhuhr');
    expect(state?.displayPrayer.name).toBe('Asr');
    expect(state?.prayerStatuses[1]).toBe('prayed');
    expect(state?.prayerStatuses[2]).toBe('next');
  });

  it('uses tomorrow Fajr as the overnight target for Isha', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [],
      prayerTimes[4],
      tomorrowFajr,
      new Date('2026-03-18T23:00:00.000Z'),
    );

    expect(state).toMatchObject({
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
    expect(state?.displayPrayer.name).toBe('Isha');
    expect(state?.countdownTarget.name).toBe('Fajr');
    expect(state?.countdownTarget.time.toISOString()).toBe('2026-03-19T05:05:00.000Z');
  });

  it('falls back to a synthetic tomorrow Fajr when no future prayer is provided', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [{ id: '1', prayer: 'Isha', status: 'prayed', date: '2026-03-18' }],
      prayerTimes[4],
      null,
      new Date('2026-03-18T23:30:00.000Z'),
    );

    expect(state?.displayPrayer.name).toBe('Fajr');
    expect(state?.countdownTarget.name).toBe('Fajr');
    expect(state?.countdownTarget.time.toISOString()).toBe('2026-03-19T05:00:00.000Z');
  });

  it('uses sunrise as the Fajr window end until the prayer is logged or the window ends', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [],
      prayerTimes[0],
      tomorrowFajr,
      new Date('2026-03-18T05:35:00.000Z'),
      sunrise,
    );

    expect(state).toMatchObject({
      phase: 'fiqh_window',
      countdownMode: 'current_prayer_end',
    });
    expect(state?.displayPrayer.name).toBe('Fajr');
    expect(state?.countdownTarget.name).toBe('Sunrise');
    expect(state?.countdownTarget.time.toISOString()).toBe('2026-03-18T06:10:00.000Z');
    expect(state?.progress).toBeGreaterThan(0.35);
    expect(state?.progress).toBeLessThan(0.37);
  });

  it('switches Fajr to Dhuhr immediately once the prayer is logged', () => {
    const state = resolvePrayerSurfaceState(
      prayerTimes,
      [{ id: '1', prayer: 'Fajr', status: 'prayed', date: '2026-03-18' }],
      prayerTimes[0],
      tomorrowFajr,
      new Date('2026-03-18T05:35:00.000Z'),
      sunrise,
    );

    expect(state).toMatchObject({
      phase: 'prayed',
      countdownMode: 'next_prayer_start',
    });
    expect(state?.displayPrayer.name).toBe('Dhuhr');
    expect(state?.countdownTarget.name).toBe('Dhuhr');
  });
});
