// src/__tests__/timezoneCacheInvalidation.test.ts
// Test 4: Timezone change handling — verify disk cache invalidation
// when timezone offset changes (DST or travel).

import PrayerTimeService from '../services/PrayerTimeService';
import { Coordinates, CalculationMethod } from '../types';

// We test getCachedPrayerTimesFromDisk's timezone validation logic.
// The method returns null when timezoneOffset doesn't match current.

jest.mock('../services/StorageService', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getValue: jest.fn((key: string) => store[key] ?? null),
      setValue: jest.fn((key: string, value: string) => { store[key] = value; }),
      deleteValue: jest.fn((key: string) => { delete store[key]; }),
      // Reset for test isolation
      _reset: () => { store = {}; },
    },
  };
});

const StorageService = require('../services/StorageService').default;

describe('Disk cache timezone invalidation', () => {
  const coords: Coordinates = { latitude: 23.8103, longitude: 90.4125 };
  const today = new Date();

  beforeEach(() => {
    StorageService._reset();
  });

  it('returns null when no cache exists', () => {
    const result = PrayerTimeService.getCachedPrayerTimesFromDisk(
      coords, today, 'MWL' as CalculationMethod
    );
    expect(result).toBeNull();
  });

  it('returns null when cached timezone offset differs from current', () => {
    // Simulate a cache entry with a different timezone offset
    const currentOffset = new Date().getTimezoneOffset();
    const differentOffset = currentOffset + 60; // 1 hour different (e.g., DST change)

    const cachedData = {
      date: today.toISOString().slice(0, 10),
      lat: 23.8103,
      lon: 90.4125,
      method: 'MWL',
      asrJuristic: 'Standard',
      timezoneOffset: differentOffset,
      times: {},
      sunrise: '06:00',
      sunset: '18:00',
      midnight: null,
      cachedAt: new Date().toISOString(),
    };
    StorageService.setValue('cached_prayer_times', JSON.stringify(cachedData));

    const result = PrayerTimeService.getCachedPrayerTimesFromDisk(
      coords, today, 'MWL' as CalculationMethod
    );
    expect(result).toBeNull();
  });

  it('returns cached data when timezone offset matches', () => {
    const currentOffset = new Date().getTimezoneOffset();
    const dateStr = today.toISOString().slice(0, 10);

    const cachedData = {
      date: dateStr,
      lat: 23.8103,
      lon: 90.4125,
      method: 'MWL',
      asrJuristic: 'Standard',
      timezoneOffset: currentOffset,
      times: { Fajr: '05:00' },
      sunrise: '06:00',
      sunset: '18:00',
      midnight: null,
      cachedAt: new Date().toISOString(),
    };
    StorageService.setValue('cached_prayer_times', JSON.stringify(cachedData));

    const result = PrayerTimeService.getCachedPrayerTimesFromDisk(
      coords, today, 'MWL' as CalculationMethod
    );
    expect(result).not.toBeNull();
    expect(result!.timezoneOffset).toBe(currentOffset);
  });

  it('accepts legacy cache entries without timezoneOffset field', () => {
    const dateStr = today.toISOString().slice(0, 10);

    const cachedData = {
      date: dateStr,
      lat: 23.8103,
      lon: 90.4125,
      method: 'MWL',
      asrJuristic: 'Standard',
      // No timezoneOffset — legacy cache entry
      times: { Fajr: '05:00' },
      sunrise: '06:00',
      sunset: '18:00',
      midnight: null,
      cachedAt: new Date().toISOString(),
    };
    StorageService.setValue('cached_prayer_times', JSON.stringify(cachedData));

    const result = PrayerTimeService.getCachedPrayerTimesFromDisk(
      coords, today, 'MWL' as CalculationMethod
    );
    // Legacy entries are accepted (timezoneOffset === undefined check)
    expect(result).not.toBeNull();
  });
});
