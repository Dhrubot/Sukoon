// src/__tests__/prayerTimesStaleClosureFix.test.ts
// Sprint 5B: Verify that loadPrayerTimes reads fresh values from useStore.getState()
// rather than closing over stale render-time variables.

import { useStore } from '../store/useStore';

// We test the pattern, not the component itself (which requires full React rendering).
// The key invariant: useStore.getState() always returns current state, not a closure snapshot.

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

jest.mock('../services/StorageAdapter', () => ({
  createStorage: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  createUnencryptedStorage: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  MemoryStorage: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getUserSettings: jest.fn(() => null),
    setUserSettings: jest.fn(),
    getValue: jest.fn(),
    setValue: jest.fn(),
    deleteValue: jest.fn(),
  },
}));

describe('useStore.getState() freshness (stale closure fix pattern)', () => {
  it('getState() returns the latest location after setLocation', () => {
    const store = useStore;

    // Initial state: no location
    expect(store.getState().location).toBeNull();

    // Simulate location update (e.g., after international travel)
    const newLocation = { latitude: 51.5074, longitude: -0.1278, city: 'London', country: 'UK' };
    store.getState().setLocation(newLocation);

    // getState() should immediately reflect the new location
    const fresh = store.getState();
    expect(fresh.location).toEqual(newLocation);
    expect(fresh.location?.city).toBe('London');
  });

  it('getState() returns the latest userSettings after updateUserSettings', () => {
    const store = useStore;

    // Set initial settings
    const initialSettings = {
      location: { latitude: 23.8, longitude: 90.4, city: 'Dhaka', country: 'BD' },
      calculationMethod: 'MWL' as const,
      asrJuristic: 'Standard' as const,
      adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
      notifications: { enabled: true, adhanEnabled: true, soundEnabled: true, vibrationEnabled: true, beforePrayer: 10, reminderText: '', postPrayerCheck: false },
      prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
      theme: 'dark' as const,
    };

    store.getState().setUserSettings(initialSettings as any);
    expect(store.getState().userSettings?.calculationMethod).toBe('MWL');

    // Simulate settings change
    store.getState().updateUserSettings({ calculationMethod: 'ISNA' as any });

    // getState() should reflect the updated value
    expect(store.getState().userSettings?.calculationMethod).toBe('ISNA');
  });

  it('simulates the stale closure scenario: callback reads fresh values', () => {
    const store = useStore;

    // Set a known starting location
    const dhaka = { latitude: 23.8, longitude: 90.4, city: 'Dhaka', country: 'BD' };
    store.getState().setLocation(dhaka);

    // Simulate: a closure captured "old" state at render time
    const capturedAtRenderTime = store.getState().location;
    expect(capturedAtRenderTime).toEqual(dhaka);

    // User travels internationally → location changes
    const tokyo = { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo', country: 'JP' };
    store.getState().setLocation(tokyo);

    // The stale closure would use capturedAtRenderTime (Dhaka)
    // The FIXED version reads from getState() at call time
    const freshAtCallTime = store.getState().location;

    // capturedAtRenderTime is stale (still Dhaka)
    expect(capturedAtRenderTime).toEqual(dhaka);
    expect(capturedAtRenderTime).not.toEqual(tokyo);
    // freshAtCallTime is current (Tokyo)
    expect(freshAtCallTime).toEqual(tokyo);
  });
});
