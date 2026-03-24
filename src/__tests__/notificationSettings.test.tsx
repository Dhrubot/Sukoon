import React from 'react';
import { render } from '@testing-library/react-native';
import { UserSettings } from '../types';

jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('../components/common/ThemedTimePicker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    requestPermissionsFromUser: jest.fn(async () => true),
    updateNotificationSettings: jest.fn(async () => {}),
    reconcileScheduling: jest.fn(async () => {}),
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  typography: {
    fontSize: {
      md: 14,
      sm: 11,
      lg: 17,
      xl: 20,
      base: 14,
      '3xl': 28,
    },
    fontFamily: {
      body: 'System',
      bodyMedium: 'System',
      bodySemibold: 'System',
    },
  },
  colors: {
    settings: {
      containerBg: '#fff',
      sectionBg: '#fff',
      labelPrimary: '#111',
      labelSecondary: '#666',
      optionBorder: '#ddd',
      optionBg: '#fafafa',
      optionActiveBg: '#eef6ff',
      optionActiveBorder: '#2274a5',
      sliderMin: '#2274a5',
      sliderMax: '#ddd',
      sliderThumb: '#2274a5',
      sliderWarningMin: '#f59e0b',
      sliderWarningThumb: '#f59e0b',
    },
    text: {
      primary: '#111',
      secondary: '#666',
      muted: '#888',
    },
    switch: {
      trackFalse: '#ccc',
      trackTrue: '#2274a5',
      thumb: '#fff',
    },
    primary: {
      DEFAULT: '#2274a5',
    },
    card: {
      hover: '#f5f5f5',
    },
    border: {
      primary: '#ddd',
    },
  },
};

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

const NotificationSettings = require('../components/settings/NotificationSettings').default;

const baseSettings: UserSettings = {
  location: { latitude: 23.81, longitude: 90.41, city: 'Dhaka', country: 'Bangladesh' },
  calculationMethod: 'MWL',
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Time for {prayer} prayer',
    postPrayerCheck: true,
    intensity: 'gentle',
    liveActivityEnabled: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: false,
    persistentReminders: { enabled: false, firstCheckDelay: 20, interval: 15, maxReminders: 1 },
    gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
    quietHours: { enabled: false, start: '22:00', end: '06:00' },
  },
  mosqueMode: {
    enabled: false,
    iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    jummah: { enabled: true, silentDuration: 30, iqamahOffset: 15 },
  },
  theme: 'auto',
};

describe('NotificationSettings', () => {
  it('does not render the removed test reminder section', () => {
    const { queryByText, getByText } = render(
      <NotificationSettings
        userSettings={baseSettings}
        onUpdateSettings={jest.fn()}
      />
    );

    expect(getByText('Reminder Style')).toBeTruthy();
    expect(queryByText('Test Reminders')).toBeNull();
    expect(queryByText('Send Test Reminder')).toBeNull();
    expect(queryByText('View Scheduled Reminders')).toBeNull();
  });
});
