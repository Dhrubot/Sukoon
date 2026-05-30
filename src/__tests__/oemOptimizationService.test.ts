// src/__tests__/oemOptimizationService.test.ts
//
// Unit tests for OEMOptimizationService — verifies aggressive-OEM detection
// is correct for the OEMs we care about, returns false on iOS, and uses the
// Play-policy-safe intent path.

import { Linking, Platform } from 'react-native';

const deviceMock = { manufacturer: 'samsung' as string | null };

jest.mock('expo-device', () => ({
  get manufacturer() {
    return deviceMock.manufacturer;
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

const setPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

const setManufacturer = (value: string | null) => {
  deviceMock.manufacturer = value;
};

// Import after mocks so the service binds to the mocked expo-device getter.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OEMOptimizationService = require('../services/OEMOptimizationService').default;

describe('OEMOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('android');
    deviceMock.manufacturer = 'samsung';
  });

  afterAll(() => {
    setPlatform('ios');
  });

  const OEMS_THAT_SHOULD_TRIGGER = [
    'Samsung',
    'samsung',
    'Xiaomi',
    'Redmi',
    'HUAWEI',
    'Honor',
    'OPPO',
    'vivo',
    'OnePlus',
    'realme',
    'Meizu',
    'ASUS',
    'TECNO',
    'Infinix',
  ];

  for (const oem of OEMS_THAT_SHOULD_TRIGGER) {
    it(`detects ${oem} as aggressive`, () => {
      setManufacturer(oem);
      expect(OEMOptimizationService.isAggressiveOEM()).toBe(true);
    });
  }

  const OEMS_THAT_SHOULD_NOT_TRIGGER = [
    'Google',
    'Motorola',
    'Nokia',
    'Sony',
    'Fairphone',
  ];

  for (const oem of OEMS_THAT_SHOULD_NOT_TRIGGER) {
    it(`does NOT flag ${oem} as aggressive`, () => {
      setManufacturer(oem);
      expect(OEMOptimizationService.isAggressiveOEM()).toBe(false);
    });
  }

  it('returns false on iOS regardless of manufacturer', () => {
    setManufacturer('Samsung');
    setPlatform('ios');
    expect(OEMOptimizationService.isAggressiveOEM()).toBe(false);
    expect(OEMOptimizationService.manufacturerLabel()).toBeNull();
  });

  it('returns false when manufacturer is null/empty', () => {
    setManufacturer(null);
    expect(OEMOptimizationService.isAggressiveOEM()).toBe(false);
    expect(OEMOptimizationService.manufacturerLabel()).toBeNull();
  });

  it('returns the canonical display name for known OEMs', () => {
    setManufacturer('samsung');
    expect(OEMOptimizationService.manufacturerLabel()).toBe('Samsung');
  });

  it('falls back to raw manufacturer for unknown OEMs', () => {
    setManufacturer('Google');
    expect(OEMOptimizationService.manufacturerLabel()).toBe('Google');
  });

  it('opens battery optimization settings via the standard intent', async () => {
    setManufacturer('Samsung');
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue();

    const ok = await OEMOptimizationService.openBatteryOptimizationSettings();

    expect(sendIntentSpy).toHaveBeenCalledWith('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
    expect(ok).toBe(true);
    sendIntentSpy.mockRestore();
  });

  it('falls back to openSettings if the intent fails', async () => {
    setManufacturer('Samsung');
    const sendIntentSpy = jest
      .spyOn(Linking, 'sendIntent')
      .mockRejectedValue(new Error('Activity not found'));
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

    const ok = await OEMOptimizationService.openBatteryOptimizationSettings();

    expect(sendIntentSpy).toHaveBeenCalled();
    expect(openSettingsSpy).toHaveBeenCalled();
    expect(ok).toBe(true);

    sendIntentSpy.mockRestore();
    openSettingsSpy.mockRestore();
  });

  it('returns false on iOS without throwing', async () => {
    setManufacturer('Samsung');
    setPlatform('ios');
    const ok = await OEMOptimizationService.openBatteryOptimizationSettings();
    expect(ok).toBe(false);
  });
});
