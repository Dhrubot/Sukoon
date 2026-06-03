import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createTheme } from '../theme';
import { PrayerTime, UserSettings } from '../types';

const mockTheme = createTheme('midnight');
const mockUpdateUserSettings = jest.fn();
const mockReconcileScheduling = jest.fn(async () => true);

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (createStyles: (theme: typeof mockTheme) => unknown) => createStyles(mockTheme),
}));

jest.mock('../store/useStore', () => ({
  useStore: (selector: (state: { updateUserSettings: typeof mockUpdateUserSettings }) => unknown) =>
    selector({ updateUserSettings: mockUpdateUserSettings }),
}));

jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    reconcileScheduling: (...args: unknown[]) => mockReconcileScheduling(...args),
  },
}));

jest.mock('../components/common/TimeInput', () => ({
  __esModule: true,
  formatTime: (value: string) => value,
  default: ({ label, onChange }: { label?: string; onChange: (value: string) => void }) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={() => onChange('05:20')}>
        <Text>{label || 'Set Time'}</Text>
      </TouchableOpacity>
    );
  },
}));

const baseSettings: UserSettings = {
  location: { latitude: 23.81, longitude: 90.41, city: 'Dhaka', country: 'Bangladesh' },
  calculationMethod: 'Karachi',
  calculationMethodManuallySelected: false,
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Time for {prayer} prayer',
    postPrayerCheck: false,
    liveActivityEnabled: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: false,
    persistentReminders: { enabled: false, firstCheckDelay: 15, interval: 15, maxReminders: 1 },
    gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
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
  theme: 'auto',
};

const makePrayer = (name: PrayerTime['name'], hour: number, minute: number): PrayerTime => {
  const time = new Date(2026, 2, 20, hour, minute, 0, 0);
  return { name, time, timestamp: time.getTime(), isNext: false };
};

const todayPrayerTimes: PrayerTime[] = [
  makePrayer('Fajr', 5, 12),
  makePrayer('Dhuhr', 12, 5),
  makePrayer('Asr', 15, 30),
  makePrayer('Maghrib', 17, 40),
  makePrayer('Isha', 19, 0),
];

const { PrayerTimeAdjustments } = require('../components/settings/PrayerTimeAdjustments');

describe('PrayerTimeAdjustments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates per-prayer offset adjustments and reconciles reminders', async () => {
    const refreshPrayerTimes = jest.fn(async () => {});
    const screen = render(
      <PrayerTimeAdjustments
        userSettings={baseSettings}
        todayPrayerTimes={todayPrayerTimes}
        hasValidLocation
        onRefreshPrayerTimes={refreshPrayerTimes}
      />
    );

    fireEvent.press(screen.getByText('Fajr'));
    fireEvent.press(screen.getAllByText('+5')[0]);

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        adjustments: expect.objectContaining({ Fajr: 5 }),
      });
      expect(refreshPrayerTimes).toHaveBeenCalledTimes(1);
      expect(mockReconcileScheduling).toHaveBeenCalledWith('settings_change', { force: true });
    });
  });

  it('converts exact prayer time changes into bounded minute offsets', async () => {
    const screen = render(
      <PrayerTimeAdjustments
        userSettings={baseSettings}
        todayPrayerTimes={todayPrayerTimes}
        hasValidLocation
        onRefreshPrayerTimes={jest.fn(async () => {})}
      />
    );

    fireEvent.press(screen.getByText('Exact Time'));
    fireEvent.press(screen.getByText('Fajr'));
    fireEvent.press(screen.getByText('Fajr Prayer Time'));

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        adjustments: expect.objectContaining({ Fajr: 8 }),
      });
    });
  });

  it('resets all prayer time adjustments', async () => {
    const adjustedSettings = {
      ...baseSettings,
      adjustments: { Fajr: 5, Dhuhr: -3, Asr: 0, Maghrib: 2, Isha: 0 },
    };
    const screen = render(
      <PrayerTimeAdjustments
        userSettings={adjustedSettings}
        todayPrayerTimes={todayPrayerTimes}
        hasValidLocation
        onRefreshPrayerTimes={jest.fn(async () => {})}
      />
    );

    fireEvent.press(screen.getByText('Reset'));

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
      });
    });
  });
});
