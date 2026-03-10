import {
  recordPrayerRefreshAttempt,
  recordPrayerRefreshSuccess,
  shouldRefreshPrayerTimesForContext,
  REFRESH_ATTEMPT_KEY,
  REFRESH_SUCCESS_KEY,
} from '../hooks/usePrayerTimeRefresh';

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
      _reset: () => {
        store = {};
      },
    },
  };
});

const StorageService = require('../services/StorageService').default;

describe('prayer refresh stamps', () => {
  const dhaka = { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' };
  const singapore = { latitude: 1.3521, longitude: 103.8198, city: 'Singapore', country: 'Singapore' };

  beforeEach(() => {
    StorageService._reset();
    jest.clearAllMocks();
  });

  it('does not treat a failed refresh attempt as a successful freshness stamp', () => {
    const now = new Date('2026-03-10T06:00:00.000Z');
    recordPrayerRefreshAttempt(dhaka, 'MWL', 'Standard', now);

    expect(StorageService.setValue).toHaveBeenCalledWith(
      REFRESH_ATTEMPT_KEY,
      expect.any(String)
    );
    expect(
      shouldRefreshPrayerTimesForContext(
        dhaka,
        'MWL',
        'Standard',
        new Date('2026-03-10T06:05:00.000Z')
      )
    ).toBe(true);
  });

  it('suppresses redundant refreshes only after a successful refresh in the same context', () => {
    const now = new Date('2026-03-10T06:00:00.000Z');
    recordPrayerRefreshSuccess(dhaka, 'MWL', 'Standard', now);

    expect(StorageService.setValue).toHaveBeenCalledWith(
      REFRESH_SUCCESS_KEY,
      expect.any(String)
    );
    expect(
      shouldRefreshPrayerTimesForContext(
        dhaka,
        'MWL',
        'Standard',
        new Date('2026-03-10T11:59:00.000Z')
      )
    ).toBe(false);
    expect(
      shouldRefreshPrayerTimesForContext(
        dhaka,
        'MWL',
        'Standard',
        new Date('2026-03-10T18:30:00.000Z')
      )
    ).toBe(true);
  });

  it('forces a refresh when the location changes materially within the same timezone offset', () => {
    const now = new Date('2026-03-10T06:00:00.000Z');
    recordPrayerRefreshSuccess(dhaka, 'MWL', 'Standard', now);

    expect(
      shouldRefreshPrayerTimesForContext(
        singapore,
        'MWL',
        'Standard',
        new Date('2026-03-10T07:00:00.000Z')
      )
    ).toBe(true);
  });
});
