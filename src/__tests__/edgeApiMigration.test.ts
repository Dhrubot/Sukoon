jest.mock('../services/StorageService', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getValue: jest.fn((key: string) => store[key] ?? null),
      setValue: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      deleteValue: jest.fn((key: string) => {
        delete store[key];
      }),
      getUserSettings: jest.fn(() => null),
      getDefaultSettings: jest.fn(() => ({
        hijriAdjustment: 0,
      })),
      _reset: () => {
        store = {};
      },
    },
  };
});

import GeocodingService from '../services/GeocodingService';
import PrayerTimeService from '../services/PrayerTimeService';

const StorageService = require('../services/StorageService').default;

function mockJsonResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn(async () => payload),
  } as unknown as Response;
}

describe('edge API migration', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_EDGE_API_BASE_URL;
  const originalEnabled = process.env.EXPO_PUBLIC_EDGE_API_ENABLED;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_EDGE_API_BASE_URL = 'https://sukoon-edge.example.workers.dev';
    process.env.EXPO_PUBLIC_EDGE_API_ENABLED = 'true';
    PrayerTimeService.clearCache();
    GeocodingService.clearCache();
    StorageService._reset();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_EDGE_API_BASE_URL = originalBaseUrl;
    process.env.EXPO_PUBLIC_EDGE_API_ENABLED = originalEnabled;
  });

  it('prefers the edge prayer-time endpoint when configured', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          date: '2026-03-20',
          calculationFingerprint: 'fp',
          timings: {
            Fajr: '05:01',
            Sunrise: '06:18',
            Dhuhr: '12:09',
            Asr: '15:22',
            Sunset: '18:01',
            Maghrib: '18:01',
            Isha: '19:17',
            Midnight: '00:02',
          },
          hijri: {
            day: 1,
            month: 9,
            monthName: 'Ramadan',
            year: 1447,
          },
        },
      })
    );

    const result = await PrayerTimeService.fetchPrayerTimes(
      { latitude: 23.81, longitude: 90.41 },
      new Date('2026-03-20T08:00:00.000Z'),
      'MWL',
      'Standard'
    );

    expect(result.Fajr).toBe('05:01');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
      'https://sukoon-edge.example.workers.dev/v1/prayer-times'
    );
  });

  it('falls back to the direct prayer provider when the edge request fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockJsonResponse({ error: 'down' }, false, 503))
      .mockResolvedValueOnce(
        mockJsonResponse({
          code: 200,
          data: {
            timings: {
              Fajr: '05:03',
              Sunrise: '06:20',
              Dhuhr: '12:10',
              Asr: '15:23',
              Sunset: '18:03',
              Maghrib: '18:03',
              Isha: '19:18',
              Midnight: '00:03',
            },
            date: {
              hijri: {
                day: '2',
                year: '1447',
                month: {
                  number: 9,
                  en: 'Ramadan',
                  ar: 'رمضان',
                },
              },
            },
          },
        })
      );

    const result = await PrayerTimeService.fetchPrayerTimes(
      { latitude: 24.0, longitude: 90.0 },
      new Date('2026-03-11T08:00:00.000Z'),
      'MWL',
      'Standard'
    );

    expect(result.Fajr).toBe('05:03');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/v1/prayer-times');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('https://api.aladhan.com/v1/timings/');
  });

  it('deduplicates concurrent prayer-time fetches for the same request context', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    const requestDate = new Date('2026-03-20T08:00:00.000Z');
    const coordinates = { latitude: 23.81, longitude: 90.41 };

    const firstPromise = PrayerTimeService.fetchPrayerTimes(
      coordinates,
      requestDate,
      'MWL',
      'Standard'
    );

    const secondPromise = PrayerTimeService.fetchPrayerTimes(
      coordinates,
      requestDate,
      'MWL',
      'Standard'
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch?.(
      mockJsonResponse({
        data: {
          date: '2026-03-20',
          calculationFingerprint: 'fp',
          timings: {
            Fajr: '05:01',
            Sunrise: '06:18',
            Dhuhr: '12:09',
            Asr: '15:22',
            Sunset: '18:01',
            Maghrib: '18:01',
            Isha: '19:17',
            Midnight: '00:02',
          },
          hijri: {
            day: 1,
            month: 9,
            monthName: 'Ramadan',
            year: 1447,
          },
        },
      })
    );

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    expect(firstResult).toEqual(secondResult);
  });

  it('uses edge geocoding when configured', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          results: [
            {
              latitude: 23.81,
              longitude: 90.41,
              city: 'Dhaka',
              country: 'Bangladesh',
            },
          ],
        },
      })
    );

    const location = await GeocodingService.geocodeAddress('Dhaka, Bangladesh', 'BD');

    expect(location).toEqual({
      latitude: 23.81,
      longitude: 90.41,
      city: 'Dhaka',
      country: 'Bangladesh',
      timezone: undefined,
    });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/v1/location/search');
  });

  it('uses the edge Hijri endpoint before local fallback logic', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          day: 3,
          month: 9,
          monthName: 'Ramadan',
          year: 1447,
        },
      })
    );

    jest.resetModules();
    const { getHijriDate } = require('../utils/hijriDate');
    const result = await getHijriDate(new Date('2026-03-12T08:00:00.000Z'));

    expect(result).toEqual({
      day: 3,
      month: 9,
      monthName: 'Ramadan',
      year: 1447,
    });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/v1/hijri-date');
  });
});
