describe('LocationService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadLocationService(options?: {
    permissionStatus?: 'granted' | 'denied' | 'undetermined';
    requestPermissionStatus?: 'granted' | 'denied' | 'undetermined';
    currentPositionError?: { code: string };
    currentPositionCoords?: { latitude: number; longitude: number; accuracy?: number };
    reverseGeocodeLocation?: Record<string, unknown> | null;
    expoReverseGeocode?: Array<Record<string, string | undefined>>;
    addressLocation?: Record<string, unknown> | null;
    postalLocation?: Record<string, unknown> | null;
    storedLocation?: Record<string, unknown> | null;
    hasServicesEnabled?: boolean;
  }) {
    jest.resetModules();

    const setUserSettings = jest.fn();
    const getForegroundPermissionsAsync = jest.fn(async () => ({
      status: options?.permissionStatus ?? 'granted',
    }));
    const requestForegroundPermissionsAsync = jest.fn(async () => ({
      status: options?.requestPermissionStatus ?? options?.permissionStatus ?? 'granted',
    }));
    const getCurrentPositionAsync = jest.fn(async () => {
      if (options?.currentPositionError) {
        throw options.currentPositionError;
      }

      return {
        coords: {
          latitude: options?.currentPositionCoords?.latitude ?? 23.8103,
          longitude: options?.currentPositionCoords?.longitude ?? 90.4125,
          accuracy: options?.currentPositionCoords?.accuracy ?? 10,
        },
      };
    });
    const reverseGeocodeAsync = jest.fn(async () => options?.expoReverseGeocode ?? []);
    const hasServicesEnabledAsync = jest.fn(async () => options?.hasServicesEnabled ?? true);

    const geocodeAddress = jest.fn(async () => options?.addressLocation ?? null);
    const geocodePostalCode = jest.fn(async () => options?.postalLocation ?? null);
    const reverseGeocode = jest.fn(async () => options?.reverseGeocodeLocation ?? null);
    const getLastSource = jest.fn(() => 'edge');

    const baseSettings = {
      location: options?.storedLocation ?? null,
      calculationMethod: 'MWL',
      asrJuristic: 'Standard',
      adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
    };

    const getUserSettings = jest.fn(() => baseSettings);
    const getDefaultSettings = jest.fn(() => baseSettings);
    const applyRegionalCalculationMethod = jest.fn((settings: Record<string, unknown>, location: Record<string, unknown>) => ({
      settings: { ...settings, location, calculationMethod: 'ISNA' },
    }));

    jest.doMock('expo-location', () => ({
      getForegroundPermissionsAsync,
      requestForegroundPermissionsAsync,
      getCurrentPositionAsync,
      reverseGeocodeAsync,
      hasServicesEnabledAsync,
      Accuracy: { Balanced: 3 },
    }));
    jest.doMock('../services/GeocodingService', () => ({
      __esModule: true,
      default: {
        geocodeAddress,
        geocodePostalCode,
        reverseGeocode,
        getLastSource,
      },
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getUserSettings,
        getDefaultSettings,
      },
    }));
    jest.doMock('../store/useStore', () => ({
      useStore: {
        getState: jest.fn(() => ({
          setUserSettings,
        })),
      },
    }));
    jest.doMock('../utils/calculationMethodByRegion', () => ({
      applyRegionalCalculationMethod,
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/LocationService').default;

    return {
      service,
      mocks: {
        setUserSettings,
        getForegroundPermissionsAsync,
        requestForegroundPermissionsAsync,
        getCurrentPositionAsync,
        reverseGeocodeAsync,
        hasServicesEnabledAsync,
        geocodeAddress,
        geocodePostalCode,
        reverseGeocode,
        getLastSource,
        getUserSettings,
        getDefaultSettings,
        applyRegionalCalculationMethod,
      },
    };
  }

  it('initializes cleanly, handles denied permissions, and surfaces location-specific failures', async () => {
    const allowed = loadLocationService({ permissionStatus: 'granted' });
    await expect(allowed.service.initialize()).resolves.toBe(true);

    const denied = loadLocationService({ requestPermissionStatus: 'denied' });
    await expect(denied.service.getCurrentLocation()).resolves.toBeNull();

    const timedOut = loadLocationService({
      requestPermissionStatus: 'granted',
      currentPositionError: { code: 'E_LOCATION_TIMEOUT' },
    });
    await expect(timedOut.service.getCurrentLocation()).rejects.toThrow(
      'Location request timed out. Please try again.'
    );
  });

  it('gets the current location and enriches it through reverse geocoding', async () => {
    const location = {
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
      timezone: 'Asia/Dhaka',
    };
    const { service, mocks } = loadLocationService({
      requestPermissionStatus: 'granted',
      reverseGeocodeLocation: location,
    });

    await expect(service.getCurrentLocation()).resolves.toEqual(location);
    expect(mocks.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocks.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mocks.reverseGeocode).toHaveBeenCalledWith({
      latitude: 23.8103,
      longitude: 90.4125,
    });
  });

  it('falls back from service reverse geocoding to Expo and then to unknown metadata', async () => {
    const expoFallback = loadLocationService({
      reverseGeocodeLocation: null,
      expoReverseGeocode: [{ city: 'Chittagong', country: 'Bangladesh', timezone: 'Asia/Dhaka' }],
    });

    await expect(
      expoFallback.service.reverseGeocodeCoordinates({ latitude: 22.3569, longitude: 91.7832 })
    ).resolves.toEqual({
      latitude: 22.3569,
      longitude: 91.7832,
      city: 'Chittagong',
      country: 'Bangladesh',
      timezone: 'Asia/Dhaka',
    });

    const unknownFallback = loadLocationService({
      reverseGeocodeLocation: null,
      expoReverseGeocode: [],
    });

    await expect(
      unknownFallback.service.reverseGeocodeCoordinates({ latitude: 1, longitude: 2 })
    ).resolves.toMatchObject({
      latitude: 1,
      longitude: 2,
      city: 'Unknown',
      country: 'Unknown',
    });
  });

  it('saves address and postal-code locations, updates settings, and notifies registered callbacks', async () => {
    const addressLocation = {
      latitude: 51.5072,
      longitude: -0.1276,
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
    };
    const postalLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      country: 'United States',
      timezone: 'America/New_York',
    };
    const callback = { onLocationUpdate: jest.fn(async () => {}) };
    const { service, mocks } = loadLocationService({
      addressLocation,
      postalLocation,
    });

    service.registerLocationUpdateCallback(callback);

    await expect(service.setLocationByAddress('London', 'United Kingdom')).resolves.toEqual(addressLocation);
    await expect(service.setLocationByPostalCode('10001', 'US')).resolves.toEqual(postalLocation);

    expect(mocks.geocodeAddress).toHaveBeenCalledWith('London, United Kingdom', 'United Kingdom');
    expect(mocks.geocodePostalCode).toHaveBeenCalledWith('10001', 'US');
    expect(mocks.applyRegionalCalculationMethod).toHaveBeenCalledTimes(2);
    expect(mocks.setUserSettings).toHaveBeenCalledTimes(2);
    expect(callback.onLocationUpdate).toHaveBeenCalledTimes(2);

    service.unregisterLocationUpdateCallback(callback);
    service.cleanup();
  });

  it('validates saved locations, reports service accuracy, and refreshes the stored location', async () => {
    const storedLocation = {
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
      timezone: 'Asia/Dhaka',
    };
    const callback = { onLocationUpdate: jest.fn(async () => {}) };
    const { service, mocks } = loadLocationService({
      storedLocation,
      requestPermissionStatus: 'granted',
      reverseGeocodeLocation: storedLocation,
      hasServicesEnabled: true,
    });

    service.registerLocationUpdateCallback(callback);

    expect(service.hasSavedLocation()).toBe(true);
    expect(service.getCurrentSavedLocation()).toEqual(storedLocation);
    expect(service.isValidLocation(storedLocation)).toBe(true);
    expect(service.isValidLocation({ ...storedLocation, latitude: 0, longitude: 0 })).toBe(false);

    await expect(service.getLocationAccuracy()).resolves.toEqual({
      hasPermission: true,
      servicesEnabled: true,
    });

    await expect(service.refreshCurrentLocation()).resolves.toEqual(storedLocation);
    expect(mocks.hasServicesEnabledAsync).toHaveBeenCalledTimes(1);
    expect(callback.onLocationUpdate).toHaveBeenCalledTimes(1);
  });
});
