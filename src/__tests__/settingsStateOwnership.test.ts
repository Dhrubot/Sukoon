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

import { useStore } from '../store/useStore';
import StorageService from '../services/StorageService';

describe('settings state ownership', () => {
  const baseSettings = {
    location: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
    calculationMethod: 'MWL' as const,
    asrJuristic: 'Standard' as const,
    adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
    notifications: {
      enabled: true,
      adhanEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      beforePrayer: 5,
      reminderText: '',
      postPrayerCheck: false,
    },
    prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
    habitBuilder: {
      enabled: true,
      persistentReminders: { enabled: true, firstCheckDelay: 20, interval: 20, maxReminders: 2 },
      gracePeriodWarning: { enabled: false, minutesBeforeNext: 10 },
      snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
      quietHours: { enabled: false, start: '22:00', end: '04:00' },
    },
    mosqueMode: {
      enabled: false,
      silentDuration: 10,
      autoRestore: true,
      promptBeforeEnable: false,
      useVibrateInsteadOfSilent: false,
      iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
    },
    theme: 'auto' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      userSettings: null,
      location: null,
    });
  });

  it('setUserSettings persists once and keeps location in sync', () => {
    useStore.getState().setUserSettings(baseSettings as any);

    expect(StorageService.setUserSettings).toHaveBeenCalledTimes(1);
    expect(useStore.getState().userSettings?.location).toEqual(baseSettings.location);
    expect(useStore.getState().location).toEqual(baseSettings.location);
  });

  it('updateUserSettings persists once and syncs updated location', () => {
    useStore.getState().setUserSettings(baseSettings as any);
    (StorageService.setUserSettings as jest.Mock).mockClear();

    const london = { latitude: 51.5074, longitude: -0.1278, city: 'London', country: 'UK' };
    useStore.getState().updateUserSettings({ location: london });

    expect(StorageService.setUserSettings).toHaveBeenCalledTimes(1);
    expect(useStore.getState().userSettings?.location).toEqual(london);
    expect(useStore.getState().location).toEqual(london);
  });

  it('setLocation is in-memory only and does not write settings directly', () => {
    useStore.getState().setLocation(baseSettings.location as any);

    expect(StorageService.setUserSettings).not.toHaveBeenCalled();
    expect(useStore.getState().location).toEqual(baseSettings.location);
  });
});
