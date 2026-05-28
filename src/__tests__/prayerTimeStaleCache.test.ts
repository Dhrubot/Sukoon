// src/__tests__/prayerTimeStaleCache.test.ts
//
// Tests for the last-known-good (stale_cache) fallback tier in PrayerTimeService.
//
// Tier order:
//   1. Edge API
//   2. Aladhan API
//   3. Exact-date disk cache (provider-level)
//   4. On-device astronomical calculation
//   5. Last-known-good (stale_cache) — diskOnly reads LKG from disk
//   6. Hardcoded defaults
//
// Also tests the diskOnly path where LKG is allowed from disk.

import PrayerTimeService from '../services/PrayerTimeService';
import { Coordinates } from '../types';

const DHAKA: Coordinates = { latitude: 23.8103, longitude: 90.4125 };

// Stale LKG payload (pretend it was cached yesterday)
const STALE_LKG_TIMES = {
  Fajr: '05:00',
  Sunrise: '06:20',
  Dhuhr: '12:10',
  Asr: '15:30',
  Sunset: '18:05',
  Maghrib: '18:05',
  Isha: '19:20',
  Midnight: '00:00',
};

const STALE_LKG_DATA = {
  date: '2025-01-01',
  lat: 23.8103,
  lon: 90.4125,
  method: 'MWL',
  asrJuristic: 'Standard',
  times: STALE_LKG_TIMES,
  capturedAt: '2025-01-01T12:00:00.000Z',
};

// Use jest.mock with a factory that references __lkgValue via a module-level
// reference (avoids hoisting issues with external let/const).
// StorageService.getPublicValue is the key method for LKG reads.
jest.mock('../services/StorageService', () => {
  const mod = {
    _lkg: JSON.stringify({
      date: '2025-01-01',
      lat: 23.8103,
      lon: 90.4125,
      method: 'MWL',
      asrJuristic: 'Standard',
      times: {
        Fajr: '05:00',
        Sunrise: '06:20',
        Dhuhr: '12:10',
        Asr: '15:30',
        Sunset: '18:05',
        Maghrib: '18:05',
        Isha: '19:20',
        Midnight: '00:00',
      },
      capturedAt: '2025-01-01T12:00:00.000Z',
    }),
    getValue: jest.fn(() => null),
    setValue: jest.fn(),
    getPublicValue: jest.fn((key: string) => {
      if (key === 'last_known_good_prayer_times') return mod._lkg;
      return null;
    }),
    setPublicValue: jest.fn(),
  };
  return { __esModule: true, default: mod };
});

// Force all network paths to fail
jest.mock('../services/api/EdgeApiClient', () => ({
  fetchPrayerTimesFromEdge: jest.fn(() => Promise.reject(new Error('network error'))),
}));

// Get a reference to the mocked StorageService for per-test overrides
import StorageService from '../services/StorageService';

const mockedStorage = StorageService as unknown as {
  _lkg: string | null;
  getPublicValue: jest.Mock;
  getValue: jest.Mock;
};

beforeEach(() => {
  PrayerTimeService.clearCache();
  jest.clearAllMocks();

  // Restore default LKG after clearAllMocks
  mockedStorage._lkg = JSON.stringify(STALE_LKG_DATA);
  mockedStorage.getPublicValue.mockImplementation((key: string) => {
    if (key === 'last_known_good_prayer_times') return mockedStorage._lkg;
    return null;
  });
  mockedStorage.getValue.mockReturnValue(null);

  // Global fetch also fails (Aladhan fallback)
  (global.fetch as jest.Mock) = jest.fn(() =>
    Promise.reject(new Error('fetch failed'))
  );
});

describe('PrayerTimeService stale_cache fallback (diskOnly)', () => {
  const testDate = new Date(2025, 2, 9); // March 9, 2025

  it('diskOnly path returns stale_cache quality from LKG when exact-date cache is absent', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(
      DHAKA,
      testDate,
      'MWL',
      undefined,
      'Standard',
      { diskOnly: true }
    );

    expect(result.quality).toBe('stale_cache');
  });

  it('diskOnly path returns 5 fard prayers from LKG', async () => {
    const result = await PrayerTimeService.getPrayerTimesList(
      DHAKA,
      testDate,
      'MWL',
      undefined,
      'Standard',
      { diskOnly: true }
    );

    expect(result.prayerTimes).toHaveLength(5);
    const names = result.prayerTimes.map(p => p.name);
    expect(names).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
  });

  it('diskOnly path returns empty when both exact-date cache and LKG are absent', async () => {
    mockedStorage._lkg = null;
    mockedStorage.getPublicValue.mockReturnValue(null);

    const result = await PrayerTimeService.getPrayerTimesList(
      DHAKA,
      testDate,
      'MWL',
      undefined,
      'Standard',
      { diskOnly: true }
    );

    expect(result.prayerTimes).toHaveLength(0);
    expect(result.quality).toBe('invalid');
  });

  it('diskOnly path does NOT make network calls', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await PrayerTimeService.getPrayerTimesList(
      DHAKA,
      testDate,
      'MWL',
      undefined,
      'Standard',
      { diskOnly: true }
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('PrayerTimeService.getLastKnownGoodFromDisk', () => {
  const testDate = new Date(2025, 2, 9);

  it('returns LKG data when public store has it', () => {
    const lkg = PrayerTimeService.getLastKnownGoodFromDisk();
    expect(lkg).not.toBeNull();
    expect(lkg?.times.Fajr).toBe('05:00');
    expect(lkg?.date).toBe('2025-01-01');
  });

  it('returns null when no LKG data exists', () => {
    mockedStorage._lkg = null;
    mockedStorage.getPublicValue.mockReturnValue(null);

    const lkg = PrayerTimeService.getLastKnownGoodFromDisk();
    expect(lkg).toBeNull();
  });

  it('invalid coordinates always return quality: invalid regardless of LKG', async () => {
    const invalidCoords: Coordinates = { latitude: 999, longitude: 999 };
    const result = await PrayerTimeService.getPrayerTimesList(
      invalidCoords,
      testDate,
      'MWL',
      undefined,
      'Standard'
    );
    expect(result.quality).toBe('invalid');
    expect(result.prayerTimes).toHaveLength(0);
  });
});
