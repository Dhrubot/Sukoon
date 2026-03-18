jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('GeocodingService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns an empty response for too-short city queries', async () => {
    jest.doMock('../services/api/EdgeApiClient', () => ({
      geocodeAddressFromEdge: jest.fn(),
      reverseGeocodeFromEdge: jest.fn(),
      searchCitiesFromEdge: jest.fn(),
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout: jest.fn(),
      describeNetworkError: jest.fn((error) => String(error)),
    }));

    const geocodingService = require('../services/GeocodingService').default;
    const response = await geocodingService.searchCitiesDetailed('d');

    expect(response).toEqual({
      results: [],
      suggestedResults: [],
      searchSource: 'city_index',
      hasCountryCoverage: false,
    });
  });

  it('filters edge city search results by country and serves the next request from cache', async () => {
    const searchCitiesFromEdge = jest.fn(async () => ({
      results: [
        { latitude: 23.8, longitude: 90.4, city: 'Dhaka', country: 'Bangladesh' },
        { latitude: 40.7, longitude: -74.0, city: 'Dhaka', country: 'United States' },
      ],
      suggestedResults: [
        { latitude: 24.0, longitude: 90.2, city: 'Gazipur', country: 'Bangladesh' },
      ],
      searchSource: 'edge',
      hasCountryCoverage: true,
    }));

    jest.doMock('../services/api/EdgeApiClient', () => ({
      geocodeAddressFromEdge: jest.fn(),
      reverseGeocodeFromEdge: jest.fn(),
      searchCitiesFromEdge,
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout: jest.fn(),
      describeNetworkError: jest.fn((error) => String(error)),
    }));

    const geocodingService = require('../services/GeocodingService').default;
    const firstResponse = await geocodingService.searchCitiesDetailed('Dhaka', 'BD', 5);
    const secondResponse = await geocodingService.searchCitiesDetailed('Dhaka', 'BD', 5);

    expect(firstResponse.results).toHaveLength(1);
    expect(firstResponse.results[0].country).toBe('Bangladesh');
    expect(firstResponse.suggestedResults).toHaveLength(1);
    expect(searchCitiesFromEdge).toHaveBeenCalledTimes(1);
    expect(secondResponse.searchSource).toBe('cache');
    expect(geocodingService.getLastSource()).toBe('cache');
  });

  it('falls back to direct geocoding when edge geocoding is unavailable and then caches the result', async () => {
    const geocodeAddressFromEdge = jest.fn(async () => {
      throw new Error('edge unavailable');
    });
    const fetchWithTimeout = jest.fn(async () => ({
      ok: true,
      json: async () => [
        {
          lat: '23.8103',
          lon: '90.4125',
          display_name: 'Dhaka, Bangladesh',
          address: { city: 'Dhaka', country: 'Bangladesh' },
        },
      ],
    }));

    jest.doMock('../services/api/EdgeApiClient', () => ({
      geocodeAddressFromEdge,
      reverseGeocodeFromEdge: jest.fn(),
      searchCitiesFromEdge: jest.fn(),
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout,
      describeNetworkError: jest.fn((error) => String(error)),
    }));

    const geocodingService = require('../services/GeocodingService').default;
    const first = await geocodingService.geocodeAddress('Dhaka');
    const second = await geocodingService.geocodeAddress('Dhaka');

    expect(first).toEqual({
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
    });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(geocodingService.getLastSource()).toBe('cache');
  });

  it('falls back to direct reverse geocoding and clears caches when requested', async () => {
    const reverseGeocodeFromEdge = jest.fn(async () => null);
    const fetchWithTimeout = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        lat: '23.8103',
        lon: '90.4125',
        display_name: 'Dhaka, Bangladesh',
        address: { city: 'Dhaka', country: 'Bangladesh' },
      }),
    }));

    jest.doMock('../services/api/EdgeApiClient', () => ({
      geocodeAddressFromEdge: jest.fn(),
      reverseGeocodeFromEdge,
      searchCitiesFromEdge: jest.fn(),
    }));
    jest.doMock('../utils/networkRequest', () => ({
      fetchWithTimeout,
      describeNetworkError: jest.fn((error) => String(error)),
    }));

    const geocodingService = require('../services/GeocodingService').default;
    const location = await geocodingService.reverseGeocode({
      latitude: 23.8103,
      longitude: 90.4125,
    });

    expect(location).toEqual({
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
    });
    expect(geocodingService.getLastSource()).toBe('direct');

    geocodingService.clearCache();
    await geocodingService.reverseGeocode({
      latitude: 23.8103,
      longitude: 90.4125,
    });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });
});
