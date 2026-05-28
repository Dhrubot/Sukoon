// src/__tests__/exportDataRedaction.test.ts
//
// Tests for the consent-based export redaction feature in StorageService.
// Verifies that:
//  - Default export redacts lat, lng, city, and name
//  - opt-in (includeLocation: true) exports raw values
//  - The redacted marker is embedded correctly
//  - importPrayerData preserves current device location/name when redacted

// We instantiate StorageService directly to avoid singleton state pollution.
// Mock the storage adapters minimally.

const mockEncryptedStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  getAllKeys: jest.fn(() => []),
  clearAll: jest.fn(),
};

const mockPublicStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(() => true), // so migrations are considered done
  getAllKeys: jest.fn(() => []),
  clearAll: jest.fn(),
};

jest.mock('../services/StorageAdapter', () => ({
  createStorage: jest.fn(() => mockEncryptedStorage),
  createUnencryptedStorage: jest.fn(() => mockPublicStorage),
  MemoryStorage: jest.fn().mockImplementation(() => mockEncryptedStorage),
}));

jest.mock('../services/AnalyticsService', () => ({
  __esModule: true,
  default: { logDawamMilestone: jest.fn() },
}));

jest.mock('../utils/notificationPresets', () => ({
  applyIntensityPreset: jest.fn((n: unknown, h: unknown) => ({ notifications: n, habitBuilder: h })),
}));

// Import AFTER mocks
const { default: StorageServiceClass } = require('../services/StorageService');

const SAMPLE_SETTINGS = {
  name: 'Alice',
  location: {
    latitude: 23.8103,
    longitude: 90.4125,
    city: 'Dhaka',
    country: 'Bangladesh',
    timezone: 'Asia/Dhaka',
  },
  calculationMethod: 'Karachi',
  calculationMethodManuallySelected: true,
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Prayer time',
    postPrayerCheck: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: false,
    persistentReminders: { enabled: false, firstCheckDelay: 20, interval: 15, maxReminders: 1 },
    gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
    quietHours: { enabled: false, start: '22:00', end: '04:00' },
  },
  mosqueMode: {
    enabled: false,
    iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    jummah: { enabled: true, silentDuration: 30, iqamahTime: '13:30' },
  },
  theme: 'midnight',
};

describe('StorageService.exportPrayerData redaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEncryptedStorage.getString.mockImplementation((key: string) => {
      if (key === 'user_settings') return JSON.stringify(SAMPLE_SETTINGS);
      return undefined;
    });
    mockPublicStorage.getString.mockReturnValue(undefined);
    mockPublicStorage.getNumber.mockReturnValue(undefined);
    mockPublicStorage.getBoolean.mockReturnValue(true);
  });

  it('redacts location and name by default (no options)', () => {
    const json = StorageServiceClass.exportPrayerData();
    const data = JSON.parse(json);

    expect(data.redacted.location).toBe(true);
    expect(data.redacted.name).toBe(true);

    const settings = data.userSettings;
    expect(settings.name).toBeUndefined();
    expect(settings.location.latitude).toBe(0);
    expect(settings.location.longitude).toBe(0);
    expect(settings.location.city).toBeUndefined();
  });

  it('keeps country even when location is redacted', () => {
    const json = StorageServiceClass.exportPrayerData();
    const data = JSON.parse(json);

    expect(data.userSettings.location.country).toBe('Bangladesh');
  });

  it('includes raw values when includeLocation is true', () => {
    const json = StorageServiceClass.exportPrayerData({ includeLocation: true });
    const data = JSON.parse(json);

    expect(data.redacted.location).toBe(false);
    expect(data.redacted.name).toBe(false);

    expect(data.userSettings.name).toBe('Alice');
    expect(data.userSettings.location.latitude).toBe(23.8103);
    expect(data.userSettings.location.longitude).toBe(90.4125);
    expect(data.userSettings.location.city).toBe('Dhaka');
  });

  it('preserves non-PII settings (calculationMethod, asrJuristic) in both modes', () => {
    const redacted = JSON.parse(StorageServiceClass.exportPrayerData());
    const full = JSON.parse(StorageServiceClass.exportPrayerData({ includeLocation: true }));

    expect(redacted.userSettings.calculationMethod).toBe('Karachi');
    expect(redacted.userSettings.asrJuristic).toBe('Standard');
    expect(full.userSettings.calculationMethod).toBe('Karachi');
  });
});

describe('StorageService.importPrayerData — redacted marker handling', () => {
  // Device settings representing "Bob in London"
  const BOB_SETTINGS = {
    ...SAMPLE_SETTINGS,
    name: 'Bob',
    location: {
      latitude: 51.5074,
      longitude: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset in-memory cache to avoid cross-test contamination
    StorageServiceClass._cachedUserSettings = null;
    // Initialise encrypted storage with Alice's data for the export step
    mockEncryptedStorage.getString.mockImplementation((key: string) => {
      if (key === 'user_settings') return JSON.stringify(SAMPLE_SETTINGS);
      return undefined;
    });
    mockPublicStorage.getString.mockReturnValue(undefined);
    mockPublicStorage.getNumber.mockReturnValue(undefined);
    mockPublicStorage.getBoolean.mockReturnValue(true);
  });

  it('does NOT overwrite location and name when import has redacted: true', () => {
    // 1. Export with redaction (default)
    const exportJson = StorageServiceClass.exportPrayerData();

    // 2. Switch the "current device" to Bob in London
    mockEncryptedStorage.getString.mockImplementation((key: string) => {
      if (key === 'user_settings') return JSON.stringify(BOB_SETTINGS);
      return undefined;
    });
    // Also clear the in-memory cache so getUserSettings re-reads from storage
    StorageServiceClass._cachedUserSettings = null;

    // 3. Import
    StorageServiceClass.importPrayerData(exportJson);

    // 4. Read back via getUserSettings (reads from _cachedUserSettings set by setUserSettings)
    const saved = StorageServiceClass.getUserSettings();

    // Should retain device's current location and name
    expect(saved?.name).toBe('Bob');
    expect(saved?.location?.city).toBe('London');
    expect(saved?.location?.latitude).toBe(51.5074);
  });

  it('overwrites location and name when import has redacted: false (full backup)', () => {
    // 1. Export with full location included
    const exportJson = StorageServiceClass.exportPrayerData({ includeLocation: true });

    // 2. Switch the "current device" to Bob in London
    mockEncryptedStorage.getString.mockImplementation((key: string) => {
      if (key === 'user_settings') return JSON.stringify(BOB_SETTINGS);
      return undefined;
    });
    StorageServiceClass._cachedUserSettings = null;

    // 3. Import
    StorageServiceClass.importPrayerData(exportJson);

    // 4. Read back
    const saved = StorageServiceClass.getUserSettings();

    // Should use exported values (Alice in Dhaka)
    expect(saved?.name).toBe('Alice');
    expect(saved?.location?.city).toBe('Dhaka');
  });
});
