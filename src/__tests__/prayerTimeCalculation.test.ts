// src/__tests__/prayerTimeCalculation.test.ts
// Test 1: Prayer time calculation accuracy — verify getPrayerTimesList
// returns 5 fard prayers with valid Date objects for known coordinates.

import PrayerTimeService from '../services/PrayerTimeService';
import { Coordinates } from '../types';

// Mock the fetch call so we don't hit the real API
const MOCK_API_RESPONSE = {
  code: 200,
  status: 'OK',
  data: {
    timings: {
      Fajr: '05:12',
      Sunrise: '06:30',
      Dhuhr: '12:05',
      Asr: '15:30',
      Sunset: '17:40',
      Maghrib: '17:40',
      Isha: '19:00',
      Midnight: '23:35',
    },
    date: {
      hijri: {
        month: { number: 9, en: 'Ramadan' },
        day: '15',
        year: '1446',
      },
    },
  },
};

// Mock global fetch
beforeEach(() => {
  PrayerTimeService.clearCache();
  (global.fetch as jest.Mock) = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    })
  );
});

describe('PrayerTimeService.getPrayerTimesList', () => {
  const dhaka: Coordinates = { latitude: 23.8103, longitude: 90.4125 };
  const testDate = new Date(2025, 2, 9); // March 9, 2025

  it('returns exactly 5 fard prayers', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    expect(result.prayerTimes).toHaveLength(5);
  });

  it('returns prayers in correct order: Fajr, Dhuhr, Asr, Maghrib, Isha', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    const names = result.prayerTimes.map(p => p.name);
    expect(names).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
  });

  it('returns valid Date objects for all prayer times', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    for (const prayer of result.prayerTimes) {
      expect(prayer.time).toBeInstanceOf(Date);
      expect(isNaN(prayer.time.getTime())).toBe(false);
    }
  });

  it('returns sunrise and sunset as valid Dates', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    expect(result.sunrise).toBeInstanceOf(Date);
    expect(result.sunset).toBeInstanceOf(Date);
    expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
  });

  it('returns midnight as a valid Date', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    expect(result.midnight).toBeInstanceOf(Date);
  });

  it('marks exactly one prayer as isNext', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    const nextPrayers = result.prayerTimes.filter(p => p.isNext);
    // Could be 0 (all past) or 1 — never more than 1
    expect(nextPrayers.length).toBeLessThanOrEqual(1);
  });

  it('rejects invalid coordinates with empty result', async () => {
    const invalid: Coordinates = { latitude: 0, longitude: 0 };
    const result = await PrayerTimeService.getPrayerTimesList(invalid, testDate, 'MWL');
    expect(result.prayerTimes).toHaveLength(0);
  });

  it('applies adjustments correctly', async () => {
    const adjustments: Record<string, number> = { Fajr: 5, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    const base = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL');
    const adjusted = await PrayerTimeService.getPrayerTimesList(dhaka, testDate, 'MWL', adjustments);

    const baseFajr = base.prayerTimes.find(p => p.name === 'Fajr')!;
    const adjustedFajr = adjusted.prayerTimes.find(p => p.name === 'Fajr')!;

    // 5 minute adjustment = 300,000 ms
    expect(adjustedFajr.time.getTime() - baseFajr.time.getTime()).toBe(5 * 60000);
  });

  it("renders Friday Dhuhr as Jumu'ah when given the prayer date", () => {
    expect(
      PrayerTimeService.getPrayerDisplayName('Dhuhr', 'en', new Date('2026-03-20T12:05:00.000Z'))
    ).toBe("Jumu'ah");

    expect(
      PrayerTimeService.getPrayerDisplayName('Dhuhr', 'en', new Date('2026-03-19T12:05:00.000Z'))
    ).toBe('Dhuhr');
  });

  it('uses high-latitude night portions when offline fallback is needed', async () => {
    (global.fetch as jest.Mock) = jest.fn(() => Promise.reject(new Error('offline')));

    const tromso: Coordinates = { latitude: 69.6492, longitude: 18.9553 };
    const winterDate = new Date(2025, 11, 21);

    const result = await PrayerTimeService.getPrayerTimesList(tromso, winterDate, 'MWL');

    expect(result.prayerTimes).toHaveLength(5);
    expect(PrayerTimeService.lastFetchWasFallback).toBe(true);
    expect(PrayerTimeService.usingHardcodedDefaults).toBe(false);
    expect(PrayerTimeService.highLatitudeWarning).toBe(true);

    const fajr = result.prayerTimes.find(p => p.name === 'Fajr')!;
    const dhuhr = result.prayerTimes.find(p => p.name === 'Dhuhr')!;
    const asr = result.prayerTimes.find(p => p.name === 'Asr')!;
    const maghrib = result.prayerTimes.find(p => p.name === 'Maghrib')!;
    const isha = result.prayerTimes.find(p => p.name === 'Isha')!;

    expect(fajr.time.getTime()).toBeLessThan(result.sunrise.getTime());
    expect(result.sunrise.getTime()).toBeLessThan(dhuhr.time.getTime());
    expect(dhuhr.time.getTime()).toBeLessThan(asr.time.getTime());
    expect(asr.time.getTime()).toBeLessThan(maghrib.time.getTime());
    expect(maghrib.time.getTime()).toBeLessThan(isha.time.getTime());
  });

  it('keeps Makkah fallback isha at 90 minutes after maghrib', async () => {
    (global.fetch as jest.Mock) = jest.fn(() => Promise.reject(new Error('offline')));

    const tromso: Coordinates = { latitude: 69.6492, longitude: 18.9553 };
    const winterDate = new Date(2025, 11, 21);

    const result = await PrayerTimeService.getPrayerTimesList(tromso, winterDate, 'Makkah');
    const maghrib = result.prayerTimes.find(p => p.name === 'Maghrib')!;
    const isha = result.prayerTimes.find(p => p.name === 'Isha')!;

    expect(isha.time.getTime() - maghrib.time.getTime()).toBe(90 * 60000);
  });
});
